/** A failed initial fetch (a CORS rejection or an unreachable host) raises a
 * TypeError in browsers; that is the only case worth replaying via the instance. */
export const isCorsFailure = (error: unknown) => {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|networkerror|cors/i.test(message);
};

/** Retry only a failed initial fetch. A readable HTTP error or an interrupted
 * response stream must never start a second speech request. */
export const fetchWithServerFallback = async (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  directFetch: typeof fetch,
  relay: (request: Request) => Promise<Response>,
): Promise<Response> => {
  const directInit: RequestInit = { ...init, credentials: "omit", redirect: "error" };
  const backupInput = input instanceof Request ? input.clone() : input;
  const backup = new Request(backupInput as ConstructorParameters<typeof Request>[0], directInit);
  try {
    return await directFetch(input, directInit);
  } catch (error) {
    if (backup.signal.aborted || !isCorsFailure(error)) throw error;
    return relay(backup);
  }
};
