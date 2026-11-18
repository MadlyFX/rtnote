import {
  BRAND_ASSET_MAX_BYTES,
  BRAND_ASSET_MIME_TYPES,
  compactBrandingSettings,
  readBrandingSettings,
  resolveBrandingSettings,
  type BrandAssetMimeType,
  type BrandingSettings,
  type ResolvedBranding,
} from "@edgeever/shared/branding";
import type { DatabaseAdapter, StorageAdapter } from "./storage-contract";
import { createId, isoNow } from "./entity-utils";

export const INSTANCE_BRANDING_ID = "instance";
export const workspaceBrandingId = (workspaceId: string) => `workspace:${workspaceId}`;
export const notebookBrandingId = (notebookId: string) => `notebook:${notebookId}`;

/** Uploads that no saved profile references are removed after this long. */
const UNREFERENCED_ASSET_GRACE_MS = 24 * 60 * 60 * 1000;

type ProfileRow = { id: string; settings_json: string };

/** One indexed read for any set of levels. Missing levels are simply empty. */
export const loadBrandingProfiles = async (db: DatabaseAdapter, ids: string[]): Promise<Map<string, BrandingSettings>> => {
  const unique = [...new Set(ids)];
  const profiles = new Map<string, BrandingSettings>();
  if (!unique.length) return profiles;
  const rows = await db.prepare(
    `SELECT id, settings_json FROM branding_profiles WHERE id IN (${unique.map(() => "?").join(", ")})`,
  ).bind(...unique).all<ProfileRow>();
  for (const row of rows.results) profiles.set(row.id, readBrandingSettings(row.settings_json));
  return profiles;
};

export const loadInstanceBranding = async (db: DatabaseAdapter) => {
  const profiles = await loadBrandingProfiles(db, [INSTANCE_BRANDING_ID]);
  return resolveBrandingSettings([profiles.get(INSTANCE_BRANDING_ID)]);
};

export const resolveWorkspaceBranding = async (db: DatabaseAdapter, workspaceId: string) => {
  const profiles = await loadBrandingProfiles(db, [INSTANCE_BRANDING_ID, workspaceBrandingId(workspaceId)]);
  return resolveBrandingSettings([profiles.get(INSTANCE_BRANDING_ID), profiles.get(workspaceBrandingId(workspaceId))]);
};

/**
 * Settings a notebook site already had before server branding: its logo URL
 * and footer text. They act as the notebook level's fallback so existing sites
 * keep their look.
 */
export type LegacySiteBranding = { logoUrl?: string | null; footerText?: string | null };

export const resolveNotebookBranding = async (
  db: DatabaseAdapter,
  workspaceId: string,
  notebookId: string,
  legacy: LegacySiteBranding = {},
): Promise<ResolvedBranding> => {
  const profiles = await loadBrandingProfiles(db, [INSTANCE_BRANDING_ID, workspaceBrandingId(workspaceId), notebookBrandingId(notebookId)]);
  const resolved = resolveBrandingSettings([
    profiles.get(INSTANCE_BRANDING_ID),
    profiles.get(workspaceBrandingId(workspaceId)),
    profiles.get(notebookBrandingId(notebookId)),
  ]);
  const notebook = profiles.get(notebookBrandingId(notebookId));
  if (!notebook?.logoAssetId && legacy.logoUrl) {
    // A favicon that only fell back to the inherited logo follows the site logo instead.
    if (resolved.faviconUrl === resolved.logoUrl) resolved.faviconUrl = legacy.logoUrl;
    resolved.logoUrl = legacy.logoUrl;
    resolved.logoDarkUrl = notebook?.logoDarkAssetId ? resolved.logoDarkUrl : legacy.logoUrl;
    resolved.isCustom = true;
  }
  if (!notebook?.footer?.text && legacy.footerText?.trim()) {
    resolved.footer = { ...resolved.footer, text: legacy.footerText.trim() };
    resolved.isCustom = true;
  }
  return resolved;
};

/**
 * Branding for a single shared note. `show_branding` off hides the owner's
 * branding entirely: the page keeps only the instance default colours and
 * shows no name, logo or footer.
 */
export const resolveMemoShareBranding = async (
  db: DatabaseAdapter,
  share: { workspaceId: string; brandingNotebookId: string | null; showBranding: boolean },
): Promise<ResolvedBranding | null> => {
  if (!share.showBranding) return null;
  if (share.brandingNotebookId) {
    const notebook = await db.prepare(
      `SELECT id FROM notebooks WHERE id = ? AND workspace_id = ? AND is_deleted = 0`,
    ).bind(share.brandingNotebookId, share.workspaceId).first<{ id: string }>();
    if (notebook) return resolveNotebookBranding(db, share.workspaceId, notebook.id);
  }
  return resolveWorkspaceBranding(db, share.workspaceId);
};

export type BrandingProfileTarget =
  | { scope: "instance" }
  | { scope: "workspace"; workspaceId: string }
  | { scope: "notebook"; workspaceId: string; notebookId: string };

const profileId = (target: BrandingProfileTarget) =>
  target.scope === "instance" ? INSTANCE_BRANDING_ID
    : target.scope === "workspace" ? workspaceBrandingId(target.workspaceId)
      : notebookBrandingId(target.notebookId);

const assetOwner = (target: BrandingProfileTarget) => target.scope === "instance" ? null : target.workspaceId;

const referencedAssetIds = (settings: BrandingSettings) =>
  [settings.logoAssetId, settings.logoDarkAssetId, settings.faviconAssetId].filter((id): id is string => Boolean(id));

export class BrandingAssetError extends Error {}

/** Saves a level. Asset ids must belong to the same owner: an instance asset, or one of this workspace's. */
export const saveBrandingProfile = async (
  storage: StorageAdapter,
  target: BrandingProfileTarget,
  input: BrandingSettings,
  actorId: string | null,
): Promise<BrandingSettings> => {
  const db = storage.db;
  const settings = compactBrandingSettings(input);
  const assetIds = [...new Set(referencedAssetIds(settings))];
  if (assetIds.length) {
    const owner = assetOwner(target);
    const rows = await db.prepare(
      `SELECT id FROM branding_assets WHERE id IN (${assetIds.map(() => "?").join(", ")}) AND workspace_id IS ?`,
    ).bind(...assetIds, owner).all<{ id: string }>();
    if (rows.results.length !== assetIds.length) throw new BrandingAssetError("Upload the logo again; the image was not found.");
  }
  const now = isoNow();
  const id = profileId(target);
  const workspaceId = target.scope === "instance" ? null : target.workspaceId;
  const notebookId = target.scope === "notebook" ? target.notebookId : null;
  if (!Object.keys(settings).length) {
    await db.prepare(`DELETE FROM branding_profiles WHERE id = ?`).bind(id).run();
  } else {
    await db.prepare(
      `INSERT INTO branding_profiles (id, scope, workspace_id, notebook_id, settings_json, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET settings_json = excluded.settings_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    ).bind(id, target.scope, workspaceId, notebookId, JSON.stringify(settings), actorId, now, now).run();
  }
  await removeUnreferencedBrandingAssets(storage, assetOwner(target), Date.now());
  return settings;
};

/**
 * Deletes this owner's uploads that no profile references and that are older
 * than the grace period, so an upload made just before saving is never lost.
 * Bounded to the owner's own rows.
 */
export const removeUnreferencedBrandingAssets = async (storage: StorageAdapter, workspaceId: string | null, now: number) => {
  const db = storage.db;
  const cutoff = new Date(now - UNREFERENCED_ASSET_GRACE_MS).toISOString();
  const candidates = await db.prepare(
    `SELECT id, object_key FROM branding_assets WHERE workspace_id IS ? AND created_at < ? LIMIT 50`,
  ).bind(workspaceId, cutoff).all<{ id: string; object_key: string }>();
  if (!candidates.results.length) return 0;
  const profiles = await db.prepare(
    workspaceId === null
      ? `SELECT settings_json FROM branding_profiles WHERE scope = 'instance'`
      : `SELECT settings_json FROM branding_profiles WHERE workspace_id = ?`,
  ).bind(...(workspaceId === null ? [] : [workspaceId])).all<{ settings_json: string }>();
  const referenced = new Set(profiles.results.flatMap(row => referencedAssetIds(readBrandingSettings(row.settings_json))));
  const stale = candidates.results.filter(row => !referenced.has(row.id));
  if (!stale.length) return 0;
  await storage.resources.delete(stale.map(row => row.object_key));
  await db.batch(stale.map(row => db.prepare(`DELETE FROM branding_assets WHERE id = ?`).bind(row.id)));
  return stale.length;
};

const EXTENSIONS: Record<BrandAssetMimeType, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
};

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((value, index) => bytes[offset + index] === value);

/** Detects the type from the bytes; the declared type is only a hint. */
export const detectBrandAssetType = (bytes: Uint8Array): BrandAssetMimeType | null => {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return "image/x-icon";
  const head = new TextDecoder().decode(bytes.subarray(0, 1024)).replace(/^﻿/, "").trimStart();
  if (/^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return "image/svg+xml";
  return null;
};

export const storeBrandingAsset = async (
  storage: StorageAdapter,
  input: { workspaceId: string | null; bytes: Uint8Array; actorId: string | null },
) => {
  if (!input.bytes.byteLength || input.bytes.byteLength > BRAND_ASSET_MAX_BYTES) {
    throw new BrandingAssetError("Choose an image up to 1 MB.");
  }
  const mimeType = detectBrandAssetType(input.bytes);
  if (!mimeType || !BRAND_ASSET_MIME_TYPES.includes(mimeType)) {
    throw new BrandingAssetError("Choose a PNG, JPEG, WebP, SVG or ICO image.");
  }
  const id = createId("bra");
  const prefix = input.workspaceId ? `workspaces/${input.workspaceId}/branding` : "instance/branding";
  const objectKey = `${prefix}/${id}${EXTENSIONS[mimeType]}`;
  await storage.resources.put(objectKey, input.bytes, {
    httpMetadata: { contentType: mimeType, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { brandingAssetId: id },
  });
  try {
    await storage.db.prepare(
      `INSERT INTO branding_assets (id, workspace_id, object_key, mime_type, size, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, input.workspaceId, objectKey, mimeType, input.bytes.byteLength, input.actorId, isoNow()).run();
  } catch (error) {
    await storage.resources.delete(objectKey).catch(() => undefined);
    throw error;
  }
  return { id, mimeType, size: input.bytes.byteLength };
};

export const getBrandingAsset = (db: DatabaseAdapter, id: string) => db.prepare(
  `SELECT id, object_key, mime_type, size FROM branding_assets WHERE id = ?`,
).bind(id).first<{ id: string; object_key: string; mime_type: BrandAssetMimeType; size: number }>();
