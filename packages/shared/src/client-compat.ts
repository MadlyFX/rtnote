import { isVersionOutdated } from "./version";

/**
 * The oldest client version this server accepts edits from. Older clients
 * may not understand the rich-text formatting newer clients write, so they
 * open notes read-only instead of saving over it. Raise this when a release
 * adds document content that older clients would drop.
 */
export const MIN_CLIENT_VERSION = "2.23.0";

export const isClientBelowMinimum = (
  clientVersion: string | null | undefined,
  minimumVersion: string | null | undefined,
) => Boolean(clientVersion && minimumVersion && isVersionOutdated(clientVersion, minimumVersion));
