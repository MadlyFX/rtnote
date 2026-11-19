import { afterEach, describe, expect, test } from "bun:test";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
afterEach(() => { globalThis.window = originalWindow; globalThis.document = originalDocument; });

// The module keeps the current branding in memory, so each test loads a fresh copy.
let loadCount = 0;
const loadBranding = () => import(`./branding.ts?test=${loadCount++}`);

const storageWindow = () => {
  const values = new Map();
  const target = new EventTarget();
  target.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  globalThis.window = target;
  return target;
};

const fakeDocument = ({ publicBranding } = {}) => {
  const favicon = { href: "/favicon.svg", getAttribute: () => "/favicon.svg", removeAttribute() {} };
  const theme = { content: "#0f172a" };
  const styles = [];
  globalThis.document = {
    title: "RTNote",
    querySelector: selector => selector.includes('rel="icon"') ? favicon : theme,
    getElementById: id => id === "rtnote-public-branding" && publicBranding !== undefined
      ? { textContent: JSON.stringify({ branding: publicBranding }) }
      : styles.find(style => style.id === id) ?? null,
    createElement: () => ({ id: "", textContent: "" }),
    head: { appendChild: style => styles.push(style) },
    documentElement: { classList: { contains: () => false } },
  };
  return { favicon, theme, styles };
};

const custom = { name: "Acme", logoUrl: "/api/public/branding/assets/bra_logo123", colors: { light: { accent: "#2563eb" }, dark: { accent: "#2563eb" } } };

describe("app branding", () => {
  test("starts from the cache and survives corrupt or blocked storage", async () => {
    const target = storageWindow();
    fakeDocument();
    target.localStorage.setItem("rtnote.branding.server", "{broken");
    let branding = await loadBranding();
    expect(branding.getBranding()).toEqual(branding.DEFAULT_BRANDING);
    target.localStorage.setItem("rtnote.branding.server", JSON.stringify(custom));
    branding = await loadBranding();
    expect(branding.getBranding()).toMatchObject({ name: "Acme", color: "#2563eb" });
    target.localStorage.getItem = () => { throw new Error("blocked"); };
    branding = await loadBranding();
    expect(branding.getBranding().name).toBe("RTNote");
  });

  test("server branding updates title, favicon, theme colour and colour tokens", async () => {
    const target = storageWindow();
    const { favicon, theme, styles } = fakeDocument();
    const branding = await loadBranding();
    const cleanup = branding.installBrandingPreferences();
    expect(styles).toHaveLength(0);
    branding.setAppBranding(custom);
    expect(document.title).toBe("Acme");
    expect(favicon.href).toBe("/api/public/branding/assets/bra_logo123");
    expect(theme.content).toBe("#eef1f4");
    expect(styles[0].textContent).toContain("--brand-green:#2563eb");
    expect(JSON.parse(target.localStorage.getItem("rtnote.branding.server")).name).toBe("Acme");
    branding.setAppBranding(branding.DEFAULT_BRANDING);
    expect(document.title).toBe("RTNote");
    expect(favicon.href).toBe("/favicon.svg");
    expect(theme.content).toBe("#0f172a");
    expect(styles[0].textContent).toBe("");
    expect(branding.replaceBrandTitle("A note about RTNote · Acme", "Acme", "New")).toBe("A note about RTNote · New");
    expect(branding.replaceBrandTitle("[DEV] RTNote", "RTNote", "My Notes")).toBe("[DEV] My Notes");
    cleanup();
  });

  test("public pages show the server-rendered owner branding and never touch the app cache", async () => {
    const target = storageWindow();
    fakeDocument({ publicBranding: { ...custom, name: "Client Co" } });
    const branding = await loadBranding();
    expect(branding.getBranding().name).toBe("Client Co");
    branding.setAppBranding({ name: "Ignored" });
    expect(branding.getBranding().name).toBe("Client Co");
    expect(target.localStorage.getItem("rtnote.branding.server")).toBeNull();
    // Branding hidden by the owner renders as null: the built-in look.
    fakeDocument({ publicBranding: null });
    expect((await loadBranding()).getBranding().name).toBe("RTNote");
  });
});

describe("importing per-browser branding", () => {
  const overview = (patch = {}) => ({ instance: {}, workspace: {}, effective: {}, instanceEffective: {}, permissions: { instance: false, workspace: true }, notebooks: [], ...patch });

  test("moves name, colour and an uploaded logo into an empty workspace once", async () => {
    const target = storageWindow();
    fakeDocument();
    target.localStorage.setItem("rtnote.branding", JSON.stringify({ name: "My Notes", color: "#FF8800", logoUrl: "data:image/png;base64,iVBORw0KGgo=" }));
    const branding = await loadBranding();
    const calls = [];
    const client = {
      uploadBrandingAsset: async (blob) => { calls.push(["upload", blob.type, blob.size]); return { asset: { id: "bra_imported1" } }; },
      updateWorkspaceBranding: async (settings) => { calls.push(["save", settings]); return overview({ workspace: settings }); },
    };
    const result = await branding.importLegacyBranding(overview(), client);
    expect(calls).toEqual([["upload", "image/png", 8], ["save", { name: "My Notes", accent: "#ff8800", logoAssetId: "bra_imported1" }]]);
    expect(result.workspace.name).toBe("My Notes");
    expect(target.localStorage.getItem("rtnote.branding")).toBeNull();
    expect(await branding.importLegacyBranding(overview(), client)).toBeNull();
  });

  test("never overwrites existing workspace branding and skips the old defaults", async () => {
    const target = storageWindow();
    fakeDocument();
    const branding = await loadBranding();
    const client = { uploadBrandingAsset: async () => { throw new Error("unexpected"); }, updateWorkspaceBranding: async () => { throw new Error("unexpected"); } };
    target.localStorage.setItem("rtnote.branding", JSON.stringify({ name: "Mine", color: "#000000" }));
    expect(await branding.importLegacyBranding(overview({ workspace: { name: "Server" } }), client)).toBeNull();
    expect(target.localStorage.getItem("rtnote.branding")).toBeNull();
    target.localStorage.setItem("rtnote.branding", JSON.stringify({ name: "RTNote", color: "#1ba456", logoUrl: "" }));
    expect(await branding.importLegacyBranding(overview(), client)).toBeNull();
    // Without permission the legacy value is left for the owner's next visit.
    target.localStorage.setItem("rtnote.branding", JSON.stringify({ name: "Mine" }));
    expect(await branding.importLegacyBranding(overview({ permissions: { instance: false, workspace: false } }), client)).toBeNull();
    expect(target.localStorage.getItem("rtnote.branding")).not.toBeNull();
  });
});
