import { expect, test } from "bun:test";
import { createAiDirectRuntime, validateAiProviderUrl } from "./ai-direct.mjs";
import { createServer } from "node:http";
import { once } from "node:events";

const multipart = async (url) => {
  const form = new FormData();
  form.set("model", "whisper-1");
  form.set("file", new File(["audio bytes"], "clip.mp3", { type: "audio/mpeg" }));
  const request = new Request(url, { method: "POST", body: form });
  return { headers: Object.fromEntries(request.headers), bodyBytes: new Uint8Array(await request.arrayBuffer()) };
};

const read = (runtime, requestId, input) => new Promise((resolve, reject) => {
  let text = "";
  runtime.open(requestId, input, {
    onData: (bytes) => { text += new TextDecoder().decode(bytes); },
    onEnd: () => resolve(text),
    onError: reject,
  }).catch(reject);
});

test("desktop speech transport permits user-configured private hosts, HTTP, IPv6 and custom ports", () => {
  for (const value of [
    "http://192.168.1.20:11434/v1", "http://localhost:11434/v1",
    "https://127.0.0.1/v1", "http://[::1]:11434/v1",
    "https://speech.lan/v1", "https://speech.example.com:8443/v1",
    "https://speech.intranet.example.com/v1", "https://api.openai.com/v1",
  ]) expect(validateAiProviderUrl(value).href).toBe(value);
  for (const value of [
    "file:///etc/passwd", "ftp://speech.lan/v1", "data:text/plain,hello",
    "https://user:secret@speech.lan/v1", "http://speech.lan/v1#fragment", "invalid",
  ]) expect(() => validateAiProviderUrl(value)).toThrow();
});

test("desktop speech transport sends multipart audio to a real local server without following redirects", async () => {
  const requests = [];
  const server = createServer(async (request, response) => {
    let size = 0;
    for await (const chunk of request) size += chunk.length;
    requests.push({ path: request.url, method: request.method, auth: request.headers.authorization, size });
    if (request.url === "/redirect/audio/transcriptions") {
      response.writeHead(307, { location: "/should-not-be-called" });
      response.end();
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"text":"local transcript"}');
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const runtime = createAiDirectRuntime();
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const body = await multipart(`${baseUrl}/v1/audio/transcriptions`);
    const text = await read(runtime, "local-speech-1", {
      url: `${baseUrl}/v1/audio/transcriptions`, method: "POST",
      headers: { ...body.headers, authorization: "Bearer local-key" }, body: "", bodyBytes: body.bodyBytes,
    });
    expect(JSON.parse(text).text).toBe("local transcript");
    expect(requests).toEqual([{ path: "/v1/audio/transcriptions", method: "POST", auth: "Bearer local-key", size: body.bodyBytes.byteLength }]);
    await expect(runtime.open("local-redirect", {
      url: `${baseUrl}/redirect/audio/transcriptions`, headers: body.headers, body: "", bodyBytes: body.bodyBytes,
    }, { onData() {}, onEnd() {}, onError() {} })).rejects.toThrow();
    expect(requests.map(request => request.path)).toEqual(["/v1/audio/transcriptions", "/redirect/audio/transcriptions"]);
    expect(runtime.activeCount).toBe(0);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test("desktop speech transport sends the audio bytes unchanged", async () => {
  let received;
  const runtime = createAiDirectRuntime({
    fetchImpl: async (url, init) => {
      received = { url, method: init.method, body: init.body, headers: init.headers };
      return Response.json({ text: "recognized" });
    },
  });
  const url = "https://api.openai.com/v1/audio/transcriptions";
  const { headers, bodyBytes } = await multipart(url);
  const result = await read(runtime, "speech-12345", { url, method: "POST", headers, body: "", bodyBytes });
  expect(received.url).toBe(url);
  expect(received.method).toBe("POST");
  expect(received.body).toBe(bodyBytes);
  expect(received.headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
  expect(JSON.parse(result).text).toBe("recognized");
  expect(runtime.activeCount).toBe(0);
});

test("desktop speech transport refuses chat completions, model lists, GET and non-multipart bodies", async () => {
  const runtime = createAiDirectRuntime({ fetchImpl: async () => { throw new Error("must not fetch"); } });
  const speechUrl = "https://api.openai.com/v1/audio/transcriptions";
  const { headers, bodyBytes } = await multipart(speechUrl);
  const handlers = { onData() {}, onEnd() {}, onError() {} };
  await expect(runtime.open("chat-12345", {
    url: "https://api.openai.com/v1/chat/completions", method: "POST", headers, body: "", bodyBytes,
  }, handlers)).rejects.toThrow(/speech transcription endpoints/);
  await expect(runtime.open("models-12345", {
    url: "https://api.openai.com/v1/models", method: "GET", headers: {},
  }, handlers)).rejects.toThrow(/POST/);
  await expect(runtime.open("get-12345", {
    url: speechUrl, method: "GET", headers, bodyBytes,
  }, handlers)).rejects.toThrow(/POST/);
  await expect(runtime.open("json-12345", {
    url: speechUrl, method: "POST", headers: { "content-type": "application/json" }, body: '{"stream":true}',
  }, handlers)).rejects.toThrow(/multipart/);
  await expect(runtime.open("type-12345", {
    url: speechUrl, method: "POST", headers: { "content-type": "audio/mpeg" }, body: "", bodyBytes,
  }, handlers)).rejects.toThrow(/multipart/);
  await expect(runtime.open("big-12345", {
    url: speechUrl, method: "POST", headers, body: "", bodyBytes: new Uint8Array(25_000_001),
  }, handlers)).rejects.toThrow(/too large/);
  expect(runtime.activeCount).toBe(0);
});

test("desktop preload and main process expose the speech provider stream pair", async () => {
  const [main, preload] = await Promise.all([
    Bun.file(new URL("./index.mjs", import.meta.url)).text(),
    Bun.file(new URL("../preload/index.cjs", import.meta.url)).text(),
  ]);
  expect(main).toContain('ipcMain.handle("desktop:ai-direct-open"');
  expect(main).toContain('ipcMain.on("desktop:ai-direct-cancel"');
  expect(preload).toContain('openAiProviderStream: (requestId, input) => ipcRenderer.invoke("desktop:ai-direct-open"');
  expect(preload).toContain('ipcRenderer.send("desktop:ai-direct-cancel"');
});
