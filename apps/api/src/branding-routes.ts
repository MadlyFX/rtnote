import {
  BRAND_ASSET_MAX_BYTES,
  BrandingUpdateSchema,
  brandAssetPath,
  resolveBrandingSettings,
  type BrandAsset,
  type BrandingOverview,
  type NotebookBranding,
} from "@edgeever/shared";
import { zValidator } from "@hono/zod-validator";
import type { Hono } from "hono";
import type { AppContext, AppEnv } from "./api-context";
import { audit } from "./audit";
import { apiError, forbidden, notFound } from "./http-errors";
import { getAuditActor, getWorkspaceId, requireOwner, requireUser } from "./request-auth";
import {
  BrandingAssetError,
  INSTANCE_BRANDING_ID,
  getBrandingAsset,
  loadBrandingProfiles,
  loadInstanceBranding,
  notebookBrandingId,
  resolveNotebookBranding,
  saveBrandingProfile,
  storeBrandingAsset,
  workspaceBrandingId,
} from "./branding-service";

/**
 * Every workspace has a single member today; the instance owner's workspace is
 * the shared default one. A user may brand their own workspace, and the owner
 * may brand the default workspace.
 */
const canManageWorkspaceBranding = async (c: AppContext) => {
  const auth = c.get("auth");
  if (auth?.kind !== "user") return false;
  if (auth.role === "owner") return true;
  const row = await c.env.storage.db.prepare(
    `SELECT w.is_personal FROM workspaces w
     JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
     WHERE w.id = ?`,
  ).bind(auth.actorId, auth.workspaceId).first<{ is_personal: number }>();
  return row?.is_personal === 1;
};

const recordAudit = (c: AppContext, action: string, entityType: string, entityId: string) => {
  const actor = getAuditActor(c);
  return audit(c.env.storage.db, actor.actorType, actor.actorId, action, entityType, entityId, {});
};

const isInstanceOwner = (c: AppContext) => {
  const auth = c.get("auth");
  return auth?.kind === "user" && auth.role === "owner";
};

const loadOwnedNotebook = (c: AppContext, notebookId: string) => c.env.storage.db.prepare(
  `SELECT id, name FROM notebooks WHERE id = ? AND workspace_id = ? AND is_deleted = 0`,
).bind(notebookId, getWorkspaceId(c)).first<{ id: string; name: string }>();

const brandingOverview = async (c: AppContext): Promise<BrandingOverview> => {
  const db = c.env.storage.db;
  const workspaceId = getWorkspaceId(c);
  const profiles = await loadBrandingProfiles(db, [INSTANCE_BRANDING_ID, workspaceBrandingId(workspaceId)]);
  const instance = profiles.get(INSTANCE_BRANDING_ID) ?? {};
  const workspace = profiles.get(workspaceBrandingId(workspaceId)) ?? {};
  const notebooks = await db.prepare(
    `SELECT n.id, n.name FROM branding_profiles bp
     JOIN notebooks n ON n.id = bp.notebook_id AND n.workspace_id = bp.workspace_id AND n.is_deleted = 0
     WHERE bp.workspace_id = ? AND bp.scope = 'notebook'
     ORDER BY n.name LIMIT 200`,
  ).bind(workspaceId).all<{ id: string; name: string }>();
  return {
    instance,
    workspace,
    effective: resolveBrandingSettings([instance, workspace]),
    instanceEffective: resolveBrandingSettings([instance]),
    permissions: { instance: isInstanceOwner(c), workspace: await canManageWorkspaceBranding(c) },
    notebooks: notebooks.results,
  };
};

const assetHeaders = (mimeType: string, size: number) => {
  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Length": String(size),
    // Ids are random and assets are never rewritten, so they cache forever.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Robots-Tag": "noindex",
  });
  // An SVG opened directly must not run script or load anything.
  if (mimeType === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  return headers;
};

/** Routes that serve the sign-in page and public pages; no session needed. */
export const registerPublicBrandingRoutes = (app: Hono<AppEnv>) => {
  app.get("/api/public/branding", async (c) => {
    const branding = await loadInstanceBranding(c.env.storage.db);
    c.header("Cache-Control", "no-cache");
    return c.json({ branding });
  });

  app.get("/api/public/branding/assets/:id", async (c) => {
    const asset = await getBrandingAsset(c.env.storage.db, c.req.param("id"));
    if (!asset) return notFound(c, "Branding image not found");
    const object = await c.env.storage.resources.get(asset.object_key);
    if (!object) return notFound(c, "Branding image not found");
    return new Response(c.req.method === "HEAD" ? null : object.body, { status: 200, headers: assetHeaders(asset.mime_type, asset.size) });
  });
};

export const registerBrandingRoutes = (app: Hono<AppEnv>) => {
  app.get("/api/v1/branding", async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json(await brandingOverview(c));
  });

  app.put("/api/v1/branding/instance", zValidator("json", BrandingUpdateSchema), async (c) => {
    const denied = requireOwner(c);
    if (denied) return denied;
    try {
      await saveBrandingProfile(c.env.storage, { scope: "instance" }, c.req.valid("json").settings, c.get("auth").actorId);
    } catch (error) {
      if (error instanceof BrandingAssetError) return apiError(c, "invalid_branding_asset", error.message, 400);
      throw error;
    }
    await recordAudit(c, "branding.instance.update", "branding", INSTANCE_BRANDING_ID);
    c.header("Cache-Control", "private, no-store");
    return c.json(await brandingOverview(c));
  });

  app.put("/api/v1/branding/workspace", zValidator("json", BrandingUpdateSchema), async (c) => {
    if (!await canManageWorkspaceBranding(c)) return forbidden(c, "Only the workspace owner can change its branding.");
    const workspaceId = getWorkspaceId(c);
    try {
      await saveBrandingProfile(c.env.storage, { scope: "workspace", workspaceId }, c.req.valid("json").settings, c.get("auth").actorId);
    } catch (error) {
      if (error instanceof BrandingAssetError) return apiError(c, "invalid_branding_asset", error.message, 400);
      throw error;
    }
    await recordAudit(c, "branding.workspace.update", "branding", workspaceBrandingId(workspaceId));
    c.header("Cache-Control", "private, no-store");
    return c.json(await brandingOverview(c));
  });

  app.post("/api/v1/branding/assets", async (c) => {
    const scope = c.req.query("scope") === "instance" ? "instance" : "workspace";
    if (scope === "instance") {
      const denied = requireOwner(c);
      if (denied) return denied;
    } else {
      const denied = requireUser(c);
      if (denied) return denied;
    }
    const length = Number(c.req.header("Content-Length") ?? 0);
    if (length > BRAND_ASSET_MAX_BYTES + 64 * 1024) return apiError(c, "invalid_branding_asset", "Choose an image up to 1 MB.", 413);
    let file: unknown;
    try {
      file = (await c.req.formData()).get("file");
    } catch {
      return apiError(c, "invalid_branding_asset", "Send the image as multipart form data in a field named file.", 400);
    }
    if (!(file instanceof Blob)) return apiError(c, "invalid_branding_asset", "Send the image as multipart form data in a field named file.", 400);
    try {
      const stored = await storeBrandingAsset(c.env.storage, {
        workspaceId: scope === "instance" ? null : getWorkspaceId(c),
        bytes: new Uint8Array(await file.arrayBuffer()),
        actorId: c.get("auth").actorId,
      });
      const asset: BrandAsset = { id: stored.id, url: brandAssetPath(stored.id), mimeType: stored.mimeType, size: stored.size };
      return c.json({ asset }, 201);
    } catch (error) {
      if (error instanceof BrandingAssetError) return apiError(c, "invalid_branding_asset", error.message, 400);
      throw error;
    }
  });

  app.get("/api/v1/notebooks/:id/branding", async (c) => {
    const denied = requireUser(c);
    if (denied) return denied;
    const notebook = await loadOwnedNotebook(c, c.req.param("id"));
    if (!notebook) return notFound(c, "Notebook not found");
    const workspaceId = getWorkspaceId(c);
    const profiles = await loadBrandingProfiles(c.env.storage.db, [notebookBrandingId(notebook.id)]);
    const body: NotebookBranding = {
      notebookId: notebook.id,
      settings: profiles.get(notebookBrandingId(notebook.id)) ?? {},
      effective: await resolveNotebookBranding(c.env.storage.db, workspaceId, notebook.id),
    };
    c.header("Cache-Control", "private, no-store");
    return c.json(body);
  });

  app.put("/api/v1/notebooks/:id/branding", zValidator("json", BrandingUpdateSchema), async (c) => {
    const denied = requireUser(c);
    if (denied) return denied;
    const notebook = await loadOwnedNotebook(c, c.req.param("id"));
    if (!notebook) return notFound(c, "Notebook not found");
    const workspaceId = getWorkspaceId(c);
    let settings;
    try {
      settings = await saveBrandingProfile(c.env.storage, { scope: "notebook", workspaceId, notebookId: notebook.id }, c.req.valid("json").settings, c.get("auth").actorId);
    } catch (error) {
      if (error instanceof BrandingAssetError) return apiError(c, "invalid_branding_asset", error.message, 400);
      throw error;
    }
    await recordAudit(c, "branding.notebook.update", "notebook", notebook.id);
    const body: NotebookBranding = {
      notebookId: notebook.id,
      settings,
      effective: await resolveNotebookBranding(c.env.storage.db, workspaceId, notebook.id),
    };
    c.header("Cache-Control", "private, no-store");
    return c.json(body);
  });
};
