import type { PluginPublicFetchRequest, PluginPublicFetchResponse } from '@edgeever/shared';

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
type PublicRequest = (input: PluginPublicFetchRequest, signal?: AbortSignal) => Promise<PluginPublicFetchResponse>;
export function createPluginCapabilities(_request: Request, requestPublic: PublicRequest) {
  return {
    pluginNetwork: {
      fetchPublic: (input: PluginPublicFetchRequest, options?: { signal?: AbortSignal }) => requestPublic(input, options?.signal),
    },
  };
}
