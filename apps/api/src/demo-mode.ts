import { isSupportedPasswordHash } from "./auth-bootstrap";

type PasswordHasher = (password: string) => Promise<string>;

export const isDemoModeEnabled = (value: string | undefined) => value?.trim().toLowerCase() === "true";

/**
 * The shared demo account a public demo shows on its sign-in screen. Demo mode
 * publishes this password on purpose. It is only returned when the deployment
 * signs in with a plain RTNOTE_AUTH_PASSWORD: a configured hash takes
 * precedence and cannot be shown.
 */
export const resolvePublicDemoLogin = (environment: {
  RTNOTE_DEMO_MODE?: string;
  RTNOTE_AUTH_USERNAME?: string;
  RTNOTE_AUTH_PASSWORD?: string;
  RTNOTE_AUTH_PASSWORD_HASH?: string;
}) => {
  if (!isDemoModeEnabled(environment.RTNOTE_DEMO_MODE)) return null;
  const password = environment.RTNOTE_AUTH_PASSWORD;
  const passwordHash = environment.RTNOTE_AUTH_PASSWORD_HASH?.trim();
  if (!password || (passwordHash && isSupportedPasswordHash(passwordHash))) return null;
  return { username: environment.RTNOTE_AUTH_USERNAME?.trim() || "admin", password };
};

export const isProtectedDemoAccount = (
  demoMode: string | undefined,
  configuredUsername: string | undefined,
  accountUsername: string,
) =>
  isDemoModeEnabled(demoMode)
  && accountUsername === (configuredUsername?.trim() || "admin");

export const shouldUpsertDemoSeedRecord = (
  existingIds: ReadonlySet<string>,
  id: string,
  overwriteExisting: boolean,
) => overwriteExisting || !existingIds.has(id);

export const resolveDemoPasswordHash = async (
  configuredPassword: string | undefined,
  configuredPasswordHash: string | undefined,
  hashPassword: PasswordHasher,
) => {
  const passwordHash = configuredPasswordHash?.trim();
  if (passwordHash && isSupportedPasswordHash(passwordHash)) {
    return passwordHash;
  }

  return configuredPassword ? hashPassword(configuredPassword) : null;
};
