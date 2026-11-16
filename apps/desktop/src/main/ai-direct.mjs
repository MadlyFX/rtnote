// Native transport for speech transcription. The renderer cannot reach the
// user's speech provider directly because of CORS, so the main process sends
// one multipart POST to an `/audio/transcriptions` endpoint and streams the
// response back. Nothing else (chat completions, model discovery) is allowed.
const MAX_AUDIO_REQUEST_BYTES = 25_000_000;
const MAX_CONCURRENT = 2;
const FORBIDDEN_HEADERS = ["host", "connection", "transfer-encoding", "content-length", "upgrade", "proxy-authorization"];

// Speech endpoints are user-configured and may be on the client's private network.
// Keep this separate from the public-only policy used by plugin requests.
export const validateAiProviderUrl = (value) => {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new Error("Speech provider requests must use HTTP or HTTPS without URL credentials or fragments.");
  }
  return url;
};

export const isTranscriptionUrl = (url) => url.pathname.endsWith("/audio/transcriptions");

export const createAiDirectRuntime = ({ fetchImpl = globalThis.fetch, maxConcurrent = MAX_CONCURRENT } = {}) => {
  const active = new Map();
  return {
    async open(requestId, input, { onData, onEnd, onError }) {
      if (typeof requestId !== "string" || requestId.length < 8 || requestId.length > 80) {
        throw new Error("Invalid speech transcription request.");
      }
      if (!input || typeof input !== "object") throw new Error("Invalid speech transcription request.");
      if ((input.method ?? "POST") !== "POST") throw new Error("Speech transcription requests must use POST.");
      const url = validateAiProviderUrl(input.url);
      if (!isTranscriptionUrl(url)) throw new Error("Only speech transcription endpoints are allowed.");
      // The renderer always sends an empty text body next to the audio bytes.
      if (input.body != null && input.body !== "") throw new Error("Speech transcription requests must send multipart audio.");
      const bodyBytes = input.bodyBytes instanceof Uint8Array
        ? input.bodyBytes
        : input.bodyBytes instanceof ArrayBuffer ? new Uint8Array(input.bodyBytes) : null;
      if (!bodyBytes) throw new Error("Speech transcription requests must send multipart audio.");
      if (bodyBytes.byteLength > MAX_AUDIO_REQUEST_BYTES) throw new Error("Speech transcription request body is too large.");
      const headers = {};
      if (input.headers && typeof input.headers === "object") {
        for (const [key, value] of Object.entries(input.headers)) {
          if (typeof key !== "string" || typeof value !== "string" || /[\r\n\0]/.test(key) || /[\r\n\0]/.test(value)) {
            throw new Error("Invalid speech transcription header.");
          }
          if (FORBIDDEN_HEADERS.includes(key.toLowerCase())) throw new Error("Invalid speech transcription header.");
          headers[key] = value;
        }
      }
      if (!Object.entries(headers).some(([key, value]) => key.toLowerCase() === "content-type" && /^multipart\/form-data;\s*boundary=/i.test(value))) {
        throw new Error("Speech transcription requests must send multipart audio.");
      }
      if (active.size >= maxConcurrent || active.has(requestId)) throw new Error("Too many speech transcription requests.");
      const controller = new AbortController();
      active.set(requestId, controller);
      try {
        const response = await fetchImpl(url.href, {
          method: "POST",
          headers,
          body: bodyBytes,
          redirect: "error",
          signal: controller.signal,
        });
        const headerEntries = {};
        response.headers.forEach((value, key) => {
          headerEntries[key] = value;
        });
        queueMicrotask(async () => {
          try {
            if (!response.body) {
              onEnd();
              return;
            }
            const reader = response.body.getReader();
            while (!controller.signal.aborted) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value?.byteLength) onData(value);
            }
            onEnd();
          } catch (error) {
            if (!controller.signal.aborted) onError(error);
          } finally {
            active.delete(requestId);
          }
        });
        return { status: response.status, headers: headerEntries };
      } catch (error) {
        active.delete(requestId);
        throw error;
      }
    },
    cancel(requestId) {
      const controller = active.get(requestId);
      if (!controller) return false;
      controller.abort(new Error("Speech transcription request cancelled"));
      active.delete(requestId);
      return true;
    },
    get activeCount() {
      return active.size;
    },
  };
};
