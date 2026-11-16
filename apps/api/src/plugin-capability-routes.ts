import { PluginPublicFetchSchema } from '@edgeever/shared';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import type { Hono } from 'hono';
import type { AppEnv, Bindings } from './api-context';
import { apiError } from './http-errors';
import { getWorkspaceId, requireUser } from './request-auth';
import { PUBLIC_NETWORK_TIMEOUT_MS, publicRequestHeaders, publicResponseHeaders, readPublicBody, validatePublicUrl } from './public-network-policy';

export function registerPluginCapabilityRoutes(app: Hono<AppEnv>, dependencies: {
  isDemoMode: (env: Bindings) => boolean;
}) {
  // Per app instance concurrency guard, not a cross-instance usage quota.
  const active = new Map<string, number>();
  for (const path of ['/api/v1/plugins/network/*']) {
    app.use(path, bodyLimit({ maxSize: 400_000 }));
    app.use(path, async (c, next) => {
      const denied = requireUser(c); if (denied) return denied;
      if (dependencies.isDemoMode(c.env)) return apiError(c, 'plugin_capability_demo_disabled', 'This capability requires your own authenticated workspace.', 403);
      const key = `${getWorkspaceId(c)}:network`;
      const count = active.get(key) ?? 0;
      if (count >= 4) return apiError(c, 'plugin_capability_busy', 'Too many concurrent requests. Try again shortly.', 429);
      active.set(key, count + 1);
      try { await next(); } finally { const left = (active.get(key) ?? 1) - 1; if (left) active.set(key, left); else active.delete(key); }
    });
  }
  app.post('/api/v1/plugins/network/fetch', zValidator('json', PluginPublicFetchSchema), async c => {
    const input = c.req.valid('json');
    let url: URL; let headers: Record<string, string>;
    try { url = validatePublicUrl(input.url); headers = publicRequestHeaders(input.headers); }
    catch { return apiError(c, 'plugin_network_invalid', 'Use a public HTTPS hostname, GET/HEAD, and supported public request headers.', 400); }
    if (!c.env.publicNetworkFetch) return apiError(c, 'plugin_network_unavailable', 'This runtime has no public network transport.', 503);
    try {
      const signal = AbortSignal.any([c.req.raw.signal, AbortSignal.timeout(PUBLIC_NETWORK_TIMEOUT_MS)]);
      const response = await c.env.publicNetworkFetch(url.href, { method: input.method, headers: { ...headers, 'User-Agent': 'RTNote-Plugins/1.0' }, redirect: 'manual', credentials: 'omit', signal });
      const bytes = await readPublicBody(response, signal);
      const outputHeaders = new Headers({
        'Cache-Control': 'no-store',
        'Content-Type': 'application/octet-stream',
        'X-EdgeEver-Upstream-Status': String(response.status),
        'X-EdgeEver-Upstream-Status-Text': encodeURIComponent(response.statusText),
      });
      for (const [name, value] of Object.entries(publicResponseHeaders(response.headers))) outputHeaders.set(`X-EdgeEver-Upstream-Header-${name}`, value);
      const body = bytes.buffer instanceof ArrayBuffer
        ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        : new Uint8Array(bytes).buffer;
      return new Response(body, { headers: outputHeaders });
    } catch { return apiError(c, 'plugin_network_failed', 'Public request failed, was blocked, exceeded its size limit, or timed out.', 502); }
  });
}
