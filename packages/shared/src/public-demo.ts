/**
 * Placeholder shown in instance-address fields. RTNote has no public demo
 * instance, so this is an example address rather than a real server.
 */
export const PUBLIC_DEMO_INSTANCE_URL = "https://notes.example.com";

/** Instance input with surrounding whitespace removed. No aliases are expanded. */
export const resolveInstanceUrlInput = (value: string) => value.trim();

/** Default missing schemes to https:// and drop trailing slashes. */
export const normalizeInstanceUrl = (value: string) => {
  const resolved = resolveInstanceUrlInput(value);
  if (!resolved) {
    return resolved;
  }
  const withProtocol = /:\/\//.test(resolved) ? resolved : `https://${resolved}`;
  return withProtocol.replace(/\/+$/, "");
};
