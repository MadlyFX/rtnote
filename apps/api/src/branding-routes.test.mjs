import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { globSync, readFileSync } from "node:fs";
import { Hono } from "hono";
import { createSelfHostedStorageAdapter } from "./self-hosted-storage-adapter";
import { registerBrandingRoutes, registerPublicBrandingRoutes } from "./branding-routes";
import { registerPublicShareRoutes } from "./share-routes";
import { registerPublicNotebookShareRoutes } from "./notebook-share-routes";
import { removeUnreferencedBrandingAssets } from "./branding-service";
import { renderPublicMemoSharePage } from "./share-page";
import { renderNotebookSitePage } from "./notebook-site-page";
import { renderPublicFormPage, renderWebManifest } from "./public-page-branding";

// Sorted with forward slashes so ordering is the same on every platform.
const migrations = globSync("migrations/*.sql").map((file) => file.split("\\").join("/")).sort();
const databases = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>');
const shareToken = "a".repeat(43);
const siteToken = "b".repeat(43);
const formToken = "c".repeat(43);
const shell = `<!doctype html><html><head><title>RTNote</title><meta name="theme-color" content="#f8f9fa"><link rel="icon" href="/favicon.svg"></head><body><div id="root"></div></body></html>`;
const loadShell = async () => new Response(shell, { headers: { "Content-Type": "text/html" } });

const users = {
  owner: { kind: "user", actorType: "user", actorId: "usr_owner", workspaceId: "ws_default", role: "owner", scopes: [], username: "owner" },
  member: { kind: "user", actorType: "user", actorId: "usr_member", workspaceId: "ws_member", role: "member", scopes: [], username: "member" },
  agent: { kind: "agent", actorType: "agent", actorId: "tok_1", workspaceId: "ws_member", role: "member", scopes: [], username: "agent" },
};

const fixture = () => {
  const db = new Database(":memory:");
  databases.push(db);
  for (const file of migrations) db.exec(readFileSync(file, "utf8"));
  db.run("INSERT OR IGNORE INTO workspaces (id, name, is_personal) VALUES ('ws_default', 'Default', 0)");
  db.run("INSERT INTO workspaces (id, name, is_personal) VALUES ('ws_member', 'Member', 1), ('ws_other', 'Other', 1)");
  for (const [id, workspace, role] of [["usr_owner", "ws_default", "owner"], ["usr_member", "ws_member", "member"], ["usr_other", "ws_other", "member"]]) {
    db.run("INSERT INTO users (id, username, password_hash) VALUES (?, ?, 'x')", [id, id]);
    db.run("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)", [workspace, id, role]);
  }
  db.run("INSERT INTO notebooks (id, workspace_id, name) VALUES ('nb_site', 'ws_member', 'Client docs'), ('nb_foreign', 'ws_other', 'Theirs')");
  db.run("INSERT INTO memos (id, notebook_id, workspace_id, title) VALUES ('memo_1', 'nb_site', 'ws_member', 'Launch plan')");
  db.run("INSERT INTO memo_contents (memo_id, content_json, content_markdown, content_hash) VALUES ('memo_1', '{\"type\":\"doc\",\"content\":[]}', 'Body text', 'h')");
  db.run("INSERT INTO memo_shares (id, memo_id, workspace_id, token) VALUES ('share_1', 'memo_1', 'ws_member', ?)", [shareToken]);
  db.run("INSERT INTO notebook_shares (id, notebook_id, workspace_id, token) VALUES ('site_1', 'nb_site', 'ws_member', ?)", [siteToken]);
  db.run("INSERT INTO table_forms (id, memo_id, workspace_id, token, enabled) VALUES ('form_1', 'memo_1', 'ws_member', ?, 1)", [formToken]);

  const blobs = new Map();
  const storage = createSelfHostedStorageAdapter(db, "/tmp/edgeever-branding-unused");
  storage.resources = {
    put: async (key, value, options) => { blobs.set(key, { bytes: new Uint8Array(value), options }); },
    get: async (key) => {
      const blob = blobs.get(key);
      return blob ? { body: new Blob([blob.bytes]).stream(), size: blob.bytes.byteLength, writeHttpMetadata: () => {} } : null;
    },
    delete: async (keys) => { for (const key of [keys].flat()) blobs.delete(key); },
  };
  const environment = { storage };
  const app = new Hono();
  app.use("/api/v1/*", async (c, next) => {
    c.set("auth", users[c.req.header("test-user") ?? "member"]);
    await next();
  });
  registerPublicBrandingRoutes(app);
  registerPublicShareRoutes(app);
  registerPublicNotebookShareRoutes(app);
  registerBrandingRoutes(app);
  const call = (path, { user = "member", method = "GET", body } = {}) => app.request(path, {
    method,
    headers: { "test-user": user, ...(body && !(body instanceof FormData) ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  }, environment);
  const upload = async (bytes, { user = "member", scope = "workspace" } = {}) => {
    const form = new FormData();
    form.append("file", new Blob([bytes]), "logo");
    return call(`/api/v1/branding/assets?scope=${scope}`, { user, method: "POST", body: form });
  };
  return { db, blobs, storage, call, upload };
};

describe("branding API", () => {
  test("a fresh instance serves the built-in branding", async () => {
    const f = fixture();
    const response = await f.call("/api/public/branding");
    expect(response.status).toBe(200);
    const { branding } = await response.json();
    expect(branding).toMatchObject({ name: "RTNote", logoUrl: "", isCustom: false });
  });

  test("only the instance owner sets the instance default; it shows on the sign-in page", async () => {
    const f = fixture();
    expect((await f.call("/api/v1/branding/instance", { method: "PUT", body: { settings: { name: "Acme" } } })).status).toBe(403);
    const saved = await f.call("/api/v1/branding/instance", { user: "owner", method: "PUT", body: { settings: { name: " Acme  Notes ", accent: "#ABC" } } });
    expect(saved.status).toBe(200);
    expect((await saved.json()).instance).toEqual({ name: "Acme Notes", accent: "#aabbcc" });
    const { branding } = await (await f.call("/api/public/branding")).json();
    expect(branding).toMatchObject({ name: "Acme Notes", color: "#aabbcc", isCustom: true });
  });

  test("a workspace overrides the instance field by field; agents cannot change it", async () => {
    const f = fixture();
    await f.call("/api/v1/branding/instance", { user: "owner", method: "PUT", body: { settings: { name: "Acme", accent: "#112233" } } });
    expect((await f.call("/api/v1/branding/workspace", { user: "agent", method: "PUT", body: { settings: { name: "Bot" } } })).status).toBe(403);
    const response = await f.call("/api/v1/branding/workspace", { method: "PUT", body: { settings: { name: "Studio", colors: { dark: { background: "#000000" } } } } });
    const overview = await response.json();
    expect(overview.permissions).toEqual({ instance: false, workspace: true });
    expect(overview.effective).toMatchObject({ name: "Studio", color: "#112233" });
    expect(overview.effective.colors.dark.background).toBe("#000000");
    expect(overview.instanceEffective.name).toBe("Acme");
    // Resetting removes the row instead of storing an empty profile.
    await f.call("/api/v1/branding/workspace", { method: "PUT", body: { settings: {} } });
    expect(f.db.query("SELECT COUNT(*) AS count FROM branding_profiles WHERE scope = 'workspace'").get().count).toBe(0);
  });

  test("rejects unknown fields, bad colours and non-HTTPS footer links", async () => {
    const f = fixture();
    for (const settings of [{ logoUrl: "https://x.test/a.png" }, { accent: "red" }, { footer: { links: [{ label: "x", url: "http://x.test" }] } }, { colors: { preset: "neon" } }]) {
      expect((await f.call("/api/v1/branding/workspace", { method: "PUT", body: { settings } })).status).toBe(400);
    }
  });

  test("logos are uploaded attachments served publicly with long caching", async () => {
    const f = fixture();
    const response = await f.upload(PNG);
    expect(response.status).toBe(201);
    const { asset } = await response.json();
    expect(asset).toMatchObject({ mimeType: "image/png", size: PNG.byteLength, url: `/api/public/branding/assets/${asset.id}` });
    expect([...f.blobs.keys()][0]).toStartWith("workspaces/ws_member/branding/");
    await f.call("/api/v1/branding/workspace", { method: "PUT", body: { settings: { logoAssetId: asset.id } } });
    const served = await f.call(asset.url);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(PNG);
    const overview = await (await f.call("/api/v1/branding")).json();
    expect(overview.effective).toMatchObject({ logoUrl: asset.url, logoDarkUrl: asset.url, faviconUrl: asset.url });
  });

  test("uploads are checked by content and SVGs cannot run script when opened", async () => {
    const f = fixture();
    expect((await f.upload(new TextEncoder().encode("<html><script>alert(1)</script></html>"))).status).toBe(400);
    expect((await f.upload(new Uint8Array(1024 * 1024 + 1))).status).toBe(400);
    const { asset } = await (await f.upload(SVG)).json();
    const served = await f.call(asset.url);
    expect(served.headers.get("content-type")).toBe("image/svg+xml");
    expect(served.headers.get("content-security-policy")).toContain("sandbox");
    expect((await f.upload(PNG, { scope: "instance" })).status).toBe(403);
  });

  test("a level can only use its own uploads", async () => {
    const f = fixture();
    const { asset } = await (await f.upload(PNG, { user: "owner", scope: "instance" })).json();
    const response = await f.call("/api/v1/branding/workspace", { method: "PUT", body: { settings: { logoAssetId: asset.id } } });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_branding_asset");
  });

  test("unreferenced uploads are removed after a day, referenced ones are kept", async () => {
    const f = fixture();
    const kept = (await (await f.upload(PNG)).json()).asset;
    const dropped = (await (await f.upload(PNG)).json()).asset;
    await f.call("/api/v1/branding/workspace", { method: "PUT", body: { settings: { logoAssetId: kept.id } } });
    expect(await removeUnreferencedBrandingAssets(f.storage, "ws_member", Date.now())).toBe(0);
    expect(await removeUnreferencedBrandingAssets(f.storage, "ws_member", Date.now() + 25 * 60 * 60 * 1000)).toBe(1);
    expect(f.db.query("SELECT id FROM branding_assets").all().map((row) => row.id)).toEqual([kept.id]);
    expect(f.blobs.size).toBe(1);
    expect((await f.call(dropped.url)).status).toBe(404);
  });

  test("notebook branding layers over the workspace and stays inside the workspace", async () => {
    const f = fixture();
    await f.call("/api/v1/branding/workspace", { method: "PUT", body: { settings: { name: "Studio", accent: "#123456" } } });
    const saved = await f.call("/api/v1/notebooks/nb_site/branding", { method: "PUT", body: { settings: { name: "Client Co", footer: { text: "Prepared for Client Co" } } } });
    const body = await saved.json();
    expect(body.effective).toMatchObject({ name: "Client Co", color: "#123456", footer: { text: "Prepared for Client Co" } });
    expect((await f.call("/api/v1/notebooks/nb_foreign/branding")).status).toBe(404);
    expect((await f.call("/api/v1/branding")).status).toBe(200);
    expect((await (await f.call("/api/v1/branding")).json()).notebooks).toEqual([{ id: "nb_site", name: "Client docs" }]);
  });
});

describe("branding on public pages", () => {
  const brand = async (f) => {
    await f.call("/api/v1/branding/workspace", { method: "PUT", body: { settings: { name: "Studio", accent: "#7c3aed", footer: { links: [{ label: "Site", url: "https://studio.test" }] } } } });
    await f.call("/api/v1/notebooks/nb_site/branding", { method: "PUT", body: { settings: { name: "Client Co" } } });
  };

  test("a shared note renders its workspace branding in the first response", async () => {
    const f = fixture();
    await brand(f);
    const page = await renderPublicMemoSharePage(new Request(`https://notes.test/share/${shareToken}`), f.storage.db, loadShell);
    const html = await page.text();
    expect(html).toContain("<title>Launch plan · Studio</title>");
    expect(html).toContain("Published with Studio");
    expect(html).toContain('href="https://studio.test"');
    expect(html).toContain('<style id="edgeever-branding">');
    expect(html).toContain("--brand-green:#7c3aed");
    expect(html).toContain('id="edgeever-public-branding"');
    expect(html).not.toContain('content="#f8f9fa"');
  });

  test("a shared note can use a notebook's branding, and the switch hides branding entirely", async () => {
    const f = fixture();
    await brand(f);
    const patched = await f.call("/api/public/shares/" + shareToken);
    expect((await patched.json()).share.branding.name).toBe("Studio");
    f.db.run("UPDATE memo_shares SET branding_notebook_id = 'nb_site'");
    let html = await (await renderPublicMemoSharePage(new Request(`https://notes.test/share/${shareToken}`), f.storage.db, loadShell)).text();
    expect(html).toContain("<title>Launch plan · Client Co</title>");
    expect((await (await f.call("/api/public/shares/" + shareToken)).json()).share.branding.name).toBe("Client Co");
    f.db.run("UPDATE memo_shares SET show_branding = 0");
    html = await (await renderPublicMemoSharePage(new Request(`https://notes.test/share/${shareToken}`), f.storage.db, loadShell)).text();
    expect(html).toContain("<title>Launch plan</title>");
    expect(html).not.toContain("Published with");
    expect(html).not.toContain("Client Co");
    expect((await (await f.call("/api/public/shares/" + shareToken)).json()).share.branding).toBeNull();
  });

  test("a notebook site uses the notebook level, and falls back to its old logo URL", async () => {
    const f = fixture();
    await brand(f);
    f.db.run(`UPDATE notebook_shares SET site_settings_json = '{"logoUrl":"https://cdn.test/logo.png"}'`);
    const html = await (await renderNotebookSitePage(new Request(`https://notes.test/share/notebook/${siteToken}`), f.storage.db, loadShell)).text();
    expect(html).toContain("<title>Client docs · Client Co</title>");
    expect(html).toContain('<link rel="icon" href="https://cdn.test/logo.png">');
    expect(html).toContain('content="https://cdn.test/logo.png"');
    const share = (await (await f.call(`/api/public/notebook-shares/${siteToken}`)).json()).share;
    expect(share.branding).toMatchObject({ name: "Client Co", logoUrl: "https://cdn.test/logo.png" });
  });

  test("default branding leaves public pages exactly as RTNote", async () => {
    const f = fixture();
    const html = await (await renderPublicMemoSharePage(new Request(`https://notes.test/share/${shareToken}`), f.storage.db, loadShell)).text();
    expect(html).toContain("<title>Launch plan · RTNote</title>");
    expect(html).toContain("Published with RTNote</a>");
    expect(html).not.toContain('<style id="edgeever-branding">');
    expect(html).toContain('content="#f8f9fa"');
  });

  test("public forms and the web manifest carry branding", async () => {
    const f = fixture();
    await brand(f);
    const form = await renderPublicFormPage(new Request(`https://notes.test/form/${formToken}`), f.storage.db, loadShell);
    expect(await form.text()).toContain("<title>Studio</title>");
    expect(await renderPublicFormPage(new Request("https://notes.test/settings"), f.storage.db, loadShell)).toBeNull();

    const builtManifest = async () => Response.json({ name: "RTNote", short_name: "RTNote", start_url: "/", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] });
    let manifest = await (await renderWebManifest(new Request("https://notes.test/manifest.webmanifest"), f.storage.db, builtManifest)).json();
    expect(manifest.name).toBe("RTNote");
    const { asset } = await (await f.upload(PNG, { user: "owner", scope: "instance" })).json();
    await f.call("/api/v1/branding/instance", { user: "owner", method: "PUT", body: { settings: { name: "Acme Knowledge Base", logoAssetId: asset.id } } });
    const response = await renderWebManifest(new Request("https://notes.test/manifest.webmanifest"), f.storage.db, builtManifest);
    expect(response.headers.get("content-type")).toContain("application/manifest+json");
    manifest = await response.json();
    expect(manifest).toMatchObject({ name: "Acme Knowledge Base", short_name: "Acme Knowled", start_url: "/" });
    expect(manifest.icons.map((icon) => icon.src)).toEqual([asset.url, "/pwa-192x192.png"]);
  });
});

describe("branding schema", () => {
  test("defaults share branding on and enforces profile ids and cascades", () => {
    const db = new Database(":memory:");
    databases.push(db);
    for (const file of migrations) db.exec(readFileSync(file, "utf8"));
    db.run("INSERT INTO workspaces (id, name) VALUES ('ws_x', 'X')");
    db.run("INSERT INTO notebooks (id, workspace_id, name) VALUES ('nb_x', 'ws_x', 'N')");
    db.run("INSERT INTO memos (id, notebook_id, workspace_id, title) VALUES ('m_x', 'nb_x', 'ws_x', 'T')");
    db.run("INSERT INTO memo_shares (id, memo_id, workspace_id, token) VALUES ('s_x', 'm_x', 'ws_x', 'tok')");
    expect(db.query("SELECT show_branding, branding_notebook_id FROM memo_shares").get()).toEqual({ show_branding: 1, branding_notebook_id: null });
    expect(() => db.run("INSERT INTO branding_profiles (id, scope, workspace_id) VALUES ('workspace:other', 'workspace', 'ws_x')")).toThrow();
    db.run("INSERT INTO branding_profiles (id, scope, workspace_id) VALUES ('workspace:ws_x', 'workspace', 'ws_x')");
    db.run("PRAGMA foreign_keys = ON");
    db.run("DELETE FROM workspaces WHERE id = 'ws_x'");
    expect(db.query("SELECT COUNT(*) AS count FROM branding_profiles").get().count).toBe(0);
  });
});
