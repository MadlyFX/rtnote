import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import {
  bilibiliCaptureFromRead,
  bilibiliSubtitleTracks,
  bilibiliTargetFromUrl,
  bilibiliTimestampUrl,
  chaptersFromViewPoints,
  pickBilibiliSubtitleTrack,
} from "./src/video/bilibili.ts";
import { VIDEO_DOCUMENT_PATTERNS } from "./src/video/patterns.ts";
import { readBilibiliVideoInPage } from "./src/video/read-bilibili-in-page.ts";
import { readYouTubeVideoInPage } from "./src/video/read-youtube-in-page.ts";
import { cleanCueText, sectionsFromChapters } from "./src/video/transcript.ts";
import {
  buildVideoNote,
  persistVideoNote,
  videoNoteFromCapture,
} from "./src/video/video-note.ts";
import {
  cuesFromYouTubeSubtitle,
  extractYouTubeChapters,
  pickYouTubeCaptionTrack,
  youtubeCaptureFromRead,
  youtubeTargetFromUrl,
  youtubeTimestampUrl,
} from "./src/video/youtube.ts";

const CURRENT_ID = "abcdefghijk";
const PREVIOUS_ID = "zyxwvutsrqp";
const LABELS = {
  source: "Source",
  platform: "Platform",
  captions: "Captions",
  capturedAt: "Saved",
  outline: "Outline",
  transcript: "Transcript",
  coverAlt: "Cover",
  youtube: "YouTube",
  bilibili: "Bilibili",
  captionsAuto: "Automatic captions",
  captionsCreator: "Creator captions",
  noCaptions: "This video has no captions.",
  fallbackTitle: "Video note",
};

const messages = (locale) => JSON.parse(readFileSync(
  new URL(`./public/_locales/${locale}/messages.json`, import.meta.url),
  "utf8",
));

const withPage = async (setup, run) => {
  const previous = {
    document: globalThis.document,
    window: globalThis.window,
    location: globalThis.location,
    fetch: globalThis.fetch,
    btoa: globalThis.btoa,
    now: Date.now,
  };
  try {
    setup();
    return await run();
  } finally {
    globalThis.document = previous.document;
    globalThis.window = previous.window;
    globalThis.location = previous.location;
    globalThis.fetch = previous.fetch;
    globalThis.btoa = previous.btoa;
    Date.now = previous.now;
  }
};

const playerResponse = (videoId, extra = {}) => ({
  videoDetails: {
    videoId,
    title: videoId === CURRENT_ID ? "Current video" : "Previous video",
    author: "Channel",
    lengthSeconds: "90",
    channelId: "UC123",
  },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: "https://example.invalid/en-auto", languageCode: "en", kind: "asr" },
        { baseUrl: "https://example.invalid/zh-auto", languageCode: "zh-Hans", kind: "asr" },
        { baseUrl: "https://example.invalid/ja", languageCode: "ja" },
        { baseUrl: "https://example.invalid/zh", languageCode: "zh-Hans" },
      ],
    },
  },
  ...extra,
});

test("accepts watch, Shorts, and youtu.be addresses and rejects the other YouTube surfaces", () => {
  expect(youtubeTargetFromUrl(`https://www.youtube.com/watch?v=${CURRENT_ID}&list=PL1&t=30s`)).toEqual({
    videoId: CURRENT_ID,
    kind: "watch",
  });
  expect(youtubeTargetFromUrl(`https://m.youtube.com/shorts/${CURRENT_ID}?feature=share`)).toEqual({
    videoId: CURRENT_ID,
    kind: "shorts",
  });
  expect(youtubeTargetFromUrl(`https://youtu.be/${CURRENT_ID}?t=3`)).toEqual({
    videoId: CURRENT_ID,
    kind: "watch",
  });
  expect(youtubeTargetFromUrl("https://youtube.com/watch")).toBeNull();
  expect(youtubeTargetFromUrl(`https://music.youtube.com/watch?v=${CURRENT_ID}`)).toBeNull();
  expect(youtubeTargetFromUrl(`https://www.youtube.com/embed/${CURRENT_ID}`)).toBeNull();
  expect(youtubeTargetFromUrl(`https://www.youtube.com/live/${CURRENT_ID}`)).toBeNull();
  expect(youtubeTargetFromUrl(`https://www.youtube-nocookie.com/embed/${CURRENT_ID}`)).toBeNull();
  expect(youtubeTimestampUrl({ videoId: CURRENT_ID, kind: "watch" }, 12.8)).toBe(
    `https://www.youtube.com/watch?v=${CURRENT_ID}&t=12s`,
  );
  expect(youtubeTimestampUrl({ videoId: CURRENT_ID, kind: "shorts" }, 12.8)).toBe(
    `https://www.youtube.com/shorts/${CURRENT_ID}?t=12`,
  );
});

test("accepts Bilibili video pages and keeps only the video and part on the source link", () => {
  expect(bilibiliTargetFromUrl("https://www.bilibili.com/video/BV1xx411c7xx?p=2&t=15")).toEqual({
    bvid: "BV1xx411c7xx",
    page: 2,
  });
  expect(bilibiliTargetFromUrl("https://m.bilibili.com/video/av42")).toEqual({ aid: "42", page: 1 });
  expect(bilibiliTargetFromUrl("https://bilibili.com/video/BV1xx411c7xx")).toEqual({
    bvid: "BV1xx411c7xx",
    page: 1,
  });
  expect(bilibiliTargetFromUrl("https://live.bilibili.com/123")).toBeNull();
  expect(bilibiliTargetFromUrl("https://www.bilibili.com/bangumi/play/ep1")).toBeNull();
  expect(bilibiliTargetFromUrl("https://www.bilibili.com/cheese/play/ss1")).toBeNull();
  expect(bilibiliTimestampUrl("BV1xx411c7xx", 2, 3, 9.2)).toBe(
    "https://www.bilibili.com/video/BV1xx411c7xx?p=2&t=9",
  );
  expect(bilibiliTimestampUrl("BV1xx411c7xx", 1, 1, 9)).toBe(
    "https://www.bilibili.com/video/BV1xx411c7xx?t=9",
  );
});

test("prefers a human caption in the interface language before ASR and other languages", () => {
  const tracks = playerResponse(CURRENT_ID).captions.playerCaptionsTracklistRenderer.captionTracks
    .map((track) => ({ ...track, human: track.kind !== "asr" }));
  expect(pickYouTubeCaptionTrack(tracks, "zh-CN")?.baseUrl).toBe("https://example.invalid/zh");
  const asrOnly = tracks.filter((track) => track.baseUrl !== "https://example.invalid/zh");
  expect(pickYouTubeCaptionTrack(asrOnly, "zh-CN")?.baseUrl).toBe("https://example.invalid/zh-auto");
  const other = tracks.filter((track) => !track.languageCode.startsWith("zh"));
  expect(pickYouTubeCaptionTrack(other, "zh-CN")?.baseUrl).toBe("https://example.invalid/ja");
});

test("reads json3 and timedtext XML, drops newline-only events, and decodes entities", () => {
  const json3 = JSON.stringify({
    events: [
      { tStartMs: 0, dDurationMs: 500, segs: [{ utf8: "\n" }] },
      { tStartMs: 1500, dDurationMs: 2000, segs: [{ utf8: "Hello&amp; " }, { utf8: "world&#39;s" }] },
    ],
  });
  expect(cuesFromYouTubeSubtitle(json3, "json3")).toEqual([
    { start: 1.5, end: 3.5, text: "Hello& world's" },
  ]);
  expect(cuesFromYouTubeSubtitle(
    `<transcript><text start="1.5" dur="2">A&amp;B&#39;s</text><text start="4" dur="1">   </text></transcript>`,
    "xml",
  )).toEqual([{ start: 1.5, end: 3.5, text: "A&B's" }]);
  expect(cleanCueText("  a&nbsp;&lt;b&gt;  ")).toBe("a <b>");
});

test("locks chapter times from the player payload and rejects live or upcoming playback", () => {
  const chapters = extractYouTubeChapters({
    playerOverlays: {
      playerOverlayRenderer: {
        decoratedPlayerBarRenderer: {
          playerBar: {
            multiMarkersPlayerBarRenderer: {
              markersMap: [{
                value: {
                  chapters: [
                    { chapterRenderer: { title: { simpleText: "Intro" }, timeRangeStartMillis: 0 } },
                    { chapterRenderer: { title: { simpleText: "Next" }, timeRangeStartMillis: 12500 } },
                  ],
                },
              }],
            },
          },
        },
      },
    },
    markers: {
      macroMarkersListItemRenderer: {
        title: { simpleText: "Intro" },
        onTap: { watchEndpoint: { startTimeSeconds: 0 } },
      },
    },
  });
  expect(chapters).toEqual([
    { start: 0, title: "Intro" },
    { start: 12, title: "Next" },
  ]);
  expect(youtubeCaptureFromRead(`https://www.youtube.com/watch?v=${CURRENT_ID}`, {
    playerResponse: playerResponse(CURRENT_ID, { videoDetails: { ...playerResponse(CURRENT_ID).videoDetails, isLive: true } }),
    subtitleBody: null,
    subtitleFormat: null,
  })).toEqual({ ok: false, reason: "unsupported" });
  expect(youtubeCaptureFromRead(`https://www.youtube.com/watch?v=${CURRENT_ID}`, {
    playerResponse: playerResponse(CURRENT_ID, { videoDetails: { ...playerResponse(CURRENT_ID).videoDetails, isUpcoming: true } }),
    subtitleBody: null,
    subtitleFormat: null,
  })).toEqual({ ok: false, reason: "unsupported" });
});

test("treats ai- language codes as platform captions and ignores is_machine", () => {
  const tracks = bilibiliSubtitleTracks({
    subtitles: [
      { lan: "zh-CN", subtitle_url: "//example.invalid/human.json", is_machine: true },
      { lan: "ai-zh", subtitle_url: "https://example.invalid/auto.json", is_machine: false },
      { lan: "en", subtitle_url: "//example.invalid/en.json" },
    ],
  });
  expect(tracks.map((track) => [track.lan, track.human, track.subtitleUrl])).toEqual([
    ["zh-CN", true, "https://example.invalid/human.json"],
    ["ai-zh", false, "https://example.invalid/auto.json"],
    ["en", true, "https://example.invalid/en.json"],
  ]);
  expect(pickBilibiliSubtitleTrack(tracks, "zh-CN")?.lan).toBe("zh-CN");
  expect(pickBilibiliSubtitleTrack(tracks.filter((track) => track.lan !== "zh-CN"), "zh")?.lan).toBe("ai-zh");
  expect(chaptersFromViewPoints([
    { from: 0, content: "Opening" },
    { from: 252.4, content: "PARA" },
    { from: 10 },
    { from: 12, content: "   " },
  ])).toEqual([
    { start: 0, title: "Opening" },
    { start: 252, title: "PARA" },
  ]);
});

test("does not turn a bangumi redirect or a part-less page into a note", () => {
  const video = {
    bvid: "BV1xx411c7xx",
    aid: 1,
    title: "Anime episode",
    redirect_url: "https://www.bilibili.com/bangumi/play/ep1",
    duration: 100,
    pages: [{ cid: 1, page: 1, part: "Main feature", duration: 100 }],
  };
  expect(bilibiliCaptureFromRead("https://www.bilibili.com/video/BV1xx411c7xx", {
    video,
    viewPoints: [],
    subtitleBody: JSON.stringify({ body: [{ from: 0, to: 1, content: "Never written" }] }),
  })).toEqual({ ok: false, reason: "unsupported" });
  expect(bilibiliCaptureFromRead("https://www.bilibili.com/video/BV1xx411c7xx?p=2", {
    video: { ...video, redirect_url: "", pages: [{ cid: 1, page: 1, part: "Only one part", duration: 20 }] },
    viewPoints: [],
    subtitleBody: null,
  })).toEqual({ ok: false, reason: "not-found" });
});

describe.serial("page main world", () => {
  test("uses the current YouTube player when ytInitialPlayerResponse is the previous video", async () => {
    const source = readYouTubeVideoInPage.toString();
    expect(source).toContain("getPlayerResponse");
    expect(source).toContain("ytInitialPlayerResponse");
    expect(source).not.toContain("pickYouTubeCaptionTrack");
    const calls = [];
    const read = await withPage(() => {
      globalThis.document = {
        getElementById: (id) => id === "movie_player"
          ? { getPlayerResponse: () => playerResponse(CURRENT_ID) }
          : null,
        querySelector: () => null,
      };
      globalThis.window = { ytInitialPlayerResponse: playerResponse(PREVIOUS_ID) };
      globalThis.location = new URL(`https://www.youtube.com/watch?v=${CURRENT_ID}&list=PL1`);
      globalThis.fetch = async (url) => {
        calls.push(String(url));
        if (String(url).includes("fmt=json3") && String(url).includes("example.invalid/zh")) {
          return new Response(JSON.stringify({
            events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "now" }] }],
          }), { status: 200 });
        }
        return new Response("", { status: 404 });
      };
    }, () => readYouTubeVideoInPage("zh-CN"));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.playerResponse.videoDetails.videoId).toBe(CURRENT_ID);
    expect(read.playerResponse.videoDetails.title).toBe("Current video");
    expect(read.subtitleFormat).toBe("json3");
    expect(read.trackKind).toBeUndefined();
    expect(calls.some((url) => url.includes("/x/player/v2"))).toBe(false);
    expect(calls[0]).toContain("fmt=json3");
    const captured = youtubeCaptureFromRead(`https://www.youtube.com/watch?v=${CURRENT_ID}&list=PL1&t=3`, read);
    expect(captured.ok && captured.capture.sourceUrl).toBe(`https://www.youtube.com/watch?v=${CURRENT_ID}`);
    expect(captured.ok && captured.capture.cues).toEqual([{ start: 0, end: 1, text: "now" }]);
    expect(captured.ok && captured.capture.subtitleOrigin).toBe("creator");
  });

  test("does not fall back to a stale ytInitialPlayerResponse after in-site navigation", async () => {
    const calls = [];
    const read = await withPage(() => {
      globalThis.document = {
        getElementById: () => ({ getPlayerResponse: () => { throw new Error("detached"); } }),
        querySelector: () => null,
      };
      globalThis.window = { ytInitialPlayerResponse: playerResponse(PREVIOUS_ID) };
      globalThis.location = new URL(`https://www.youtube.com/watch?v=${CURRENT_ID}`);
      globalThis.fetch = async (url) => {
        calls.push(String(url));
        return new Response("", { status: 404 });
      };
    }, () => readYouTubeVideoInPage("en"));
    expect(read).toEqual({ ok: false, reason: "not-found" });
    expect(calls).toEqual([]);
  });

  test("loads a YouTube cover without cookies and skips a thumbnail the browser cannot read", async () => {
    const calls = [];
    const read = await withPage(() => {
      const response = playerResponse(CURRENT_ID);
      delete response.captions;
      response.videoDetails.thumbnail = {
        thumbnails: [
          { url: "https://i.ytimg.com/vi_webp/x/maxresdefault.webp", width: 1920 },
          { url: "https://i.ytimg.com/vi/x/hqdefault.jpg", width: 336 },
        ],
      };
      globalThis.document = {
        getElementById: (id) => id === "movie_player"
          ? { getPlayerResponse: () => response }
          : null,
        querySelector: () => null,
      };
      globalThis.window = {};
      globalThis.location = new URL(`https://www.youtube.com/watch?v=${CURRENT_ID}`);
      globalThis.fetch = async (url, init) => {
        calls.push({ url: String(url), credentials: init?.credentials });
        if (String(url).includes("maxresdefault")) throw new TypeError("Failed to fetch");
        return new Response(Uint8Array.from([1, 2, 3, 4]), {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        });
      };
    }, () => readYouTubeVideoInPage("zh-CN"));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.thumbnail?.mimeType).toBe("image/jpeg");
    expect(read.thumbnail?.base64).toBe(btoa("\u0001\u0002\u0003\u0004"));
    expect(calls).toEqual([
      { url: "https://i.ytimg.com/vi_webp/x/maxresdefault.webp", credentials: "omit" },
      { url: "https://i.ytimg.com/vi/x/hqdefault.jpg", credentials: "omit" },
    ]);
  });

  test("reads a Shorts player after the page function is serialized on its own", async () => {
    const source = readYouTubeVideoInPage.toString();
    expect(source).toContain("[A-Za-z0-9_-]{11}");
    const readInPage = new Function(`return (${source})`)();
    const read = await withPage(() => {
      globalThis.document = {
        getElementById: (id) => id === "shorts-player"
          ? { getPlayerResponse: () => playerResponse(CURRENT_ID) }
          : null,
        querySelector: () => null,
      };
      globalThis.window = {};
      globalThis.location = new URL(`https://www.youtube.com/shorts/${CURRENT_ID}`);
      globalThis.fetch = async () => new Response("", { status: 404 });
    }, () => readInPage("zh-CN"));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.playerResponse.videoDetails.videoId).toBe(CURRENT_ID);
    const captured = youtubeCaptureFromRead(`https://www.youtube.com/shorts/${CURRENT_ID}`, read);
    expect(captured.ok && captured.capture.title).toBe("Current video");
    expect(captured.ok && captured.capture.sourceUrl).toBe(`https://www.youtube.com/shorts/${CURRENT_ID}`);
  });

  test("signs the Bilibili player query and never calls unsigned /x/player/v2", async () => {
    const source = readBilibiliVideoInPage.toString();
    expect(source).toContain("/x/player/wbi/v2");
    expect(source).not.toContain("/x/player/v2?");
    expect(source).not.toContain("is_machine");
    const img = "7cd084941338484aae1ad9425b84077c";
    const sub = "4932caff0ff746eab6f01bf08b70ac45";
    const mixinTab = [
      46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
      33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
      61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
      36, 20, 34, 44, 52,
    ];
    const mixin = mixinTab.map((index) => (img + sub)[index] ?? "").join("").slice(0, 32);
    const query = "aid=100&bvid=BV1xx411c7xx&cid=22&wts=1700000000";
    const expectedRid = createHash("md5").update(query + mixin).digest("hex");
    const calls = [];
    const read = await withPage(() => {
      Date.now = () => 1_700_000_000_000;
      globalThis.location = new URL("https://www.bilibili.com/video/BV1xx411c7xx?p=2&t=15");
      globalThis.document = { scripts: [] };
      globalThis.window = {
        __INITIAL_STATE__: {
          wbi_img: {
            img_url: `https://i0.hdslb.com/bfs/wbi/${img}.png`,
            sub_url: `https://i0.hdslb.com/bfs/wbi/${sub}.png`,
          },
          videoData: {
            bvid: "BV1xx411c7xx",
            aid: 100,
            title: "Multi-part example",
            pic: "//i0.hdslb.com/cover.jpg",
            owner: { mid: 7, name: "UP" },
            pages: [
              { cid: 11, page: 1, part: "Part one", duration: 30 },
              { cid: 22, page: 2, part: "Part two", duration: 40 },
            ],
            subtitle: { subtitles: [{ lan: "en", subtitle_url: "//example.invalid/page.json" }] },
          },
        },
      };
      globalThis.fetch = async (url) => {
        const href = String(url);
        calls.push(href);
        const path = new URL(href).pathname;
        if (path === "/x/player/wbi/v2") {
          return Response.json({
            data: {
              subtitle: {
                subtitles: [
                  { lan: "ai-zh", subtitle_url: "//example.invalid/auto.json", is_machine: false },
                  { lan: "zh-CN", subtitle_url: "//example.invalid/human.json", is_machine: true },
                ],
              },
              view_points: [{ from: 4, content: "Chapter in this part" }],
            },
          });
        }
        if (href === "https://example.invalid/human.json") {
          return new Response(JSON.stringify({
            body: [{ from: 4, to: 6, content: "Human captions&amp;body" }],
          }), { status: 200 });
        }
        return new Response("not an image", { status: 200, headers: { "content-type": "text/plain" } });
      };
    }, () => readBilibiliVideoInPage("zh-CN"));
    expect(calls.some((url) => new URL(url).pathname === "/x/player/v2")).toBe(false);
    const signed = calls.map((url) => new URL(url)).find((url) => url.pathname === "/x/player/wbi/v2");
    expect(signed?.searchParams.get("cid")).toBe("22");
    expect(signed?.searchParams.get("bvid")).toBe("BV1xx411c7xx");
    expect(signed?.searchParams.get("w_rid")).toBe(expectedRid);
    expect(`${signed?.searchParams.get("aid")}&${signed?.searchParams.get("bvid")}&${signed?.searchParams.get("cid")}&${signed?.searchParams.get("wts")}`)
      .toBe("100&BV1xx411c7xx&22&1700000000");
    expect(calls).toContain("https://example.invalid/human.json");
    expect(calls).not.toContain("https://example.invalid/auto.json");
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.trackLan).toBe("zh-CN");
    const captured = bilibiliCaptureFromRead("https://www.bilibili.com/video/BV1xx411c7xx?p=2&t=15", read);
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;
    expect(captured.capture.partIndex).toBe(2);
    expect(captured.capture.partTitle).toBe("Part two");
    expect(captured.capture.sourceUrl).toBe("https://www.bilibili.com/video/BV1xx411c7xx?p=2");
    expect(captured.capture.subtitleOrigin).toBe("creator");
    expect(captured.capture.chapters).toEqual([{ start: 4, title: "Chapter in this part" }]);
    expect(captured.capture.cues).toEqual([{ start: 4, end: 6, text: "Human captions&body" }]);
    expect(captured.capture.thumbnail).toBeUndefined();
    expect(JSON.stringify(captured.capture)).not.toContain("hdslb.com");
  });
});

test("assembles a Bilibili note from chapters and the transcript", () => {
  const capture = {
    platform: "bilibili",
    videoId: "BV1xx411c7xx",
    partIndex: 1,
    partTitle: "The core of a knowledge base",
    title: "Building a Second Brain: a personal knowledge system from scratch",
    author: "Studio Hurricane",
    duration: 1455,
    sourceUrl: "https://www.bilibili.com/video/BV1xx411c7xx?p=1",
    subtitleOrigin: "platform_auto",
    chapters: [
      { start: 0, title: "Why folders alone stop working" },
      { start: 252, title: "How PARA and progressive summarization fit together" },
    ],
    cues: [
      { start: 0, end: 4, text: "Hi everyone, today we talk about knowledge management." },
      { start: 25, end: 29, text: "Many people save things and never open them again." },
    ],
  };
  const note = buildVideoNote({
    capture,
    labels: LABELS,
    capturedOn: "2026-10-05",
    cover: "placeholder",
  });
  expect(note.markdown).toBe(`# Building a Second Brain: a personal knowledge system from scratch

> **Source**：[Studio Hurricane - Building a Second Brain: a personal knowledge system from scratch](https://www.bilibili.com/video/BV1xx411c7xx?p=1)
> **Platform**：Bilibili · P1 The core of a knowledge base · 24:15
> **Captions**：Automatic captions · **Saved**：2026-10-05

![Cover](/api/v1/resources/EDGEVERRESOURCEID/blob)

## Outline

- [00:00](https://www.bilibili.com/video/BV1xx411c7xx?p=1&t=0) Why folders alone stop working
- [04:12](https://www.bilibili.com/video/BV1xx411c7xx?p=1&t=252) How PARA and progressive summarization fit together

<details>
<summary>Transcript</summary>

- [00:00](https://www.bilibili.com/video/BV1xx411c7xx?p=1&t=0) Hi everyone, today we talk about knowledge management.
- [00:25](https://www.bilibili.com/video/BV1xx411c7xx?p=1&t=25) Many people save things and never open them again.

</details>
`);
  expect(note.markdown).not.toContain("hdslb.com");
  expect(note.markdown).not.toContain("ytimg.com");
  expect(sectionsFromChapters([
    { start: 12.7, title: " Opening&amp; intro " },
    { start: -1, title: "negative" },
    { start: Number.NaN, title: "not a number" },
    { start: 30, title: "   " },
  ])).toEqual([{ start: 12, text: "Opening& intro" }]);
});

test("writes the transcript without chapters and saves source notes for captionless videos", () => {
  const capture = {
    platform: "youtube",
    videoId: CURRENT_ID,
    title: "Current video",
    author: "Channel",
    duration: 90,
    sourceUrl: `https://www.youtube.com/watch?v=${CURRENT_ID}`,
    subtitleOrigin: "creator",
    chapters: [],
    cues: [{ start: 0, end: 2, text: "Hello& there" }],
  };
  const note = videoNoteFromCapture({
    capture,
    labels: LABELS,
    capturedOn: "2026-10-05",
    cover: "none",
  });
  expect(note.toast).toBe("saved");
  expect(note.markdown).toContain("<details>");
  expect(note.markdown).toContain("Hello&amp; there");
  expect(note.markdown).not.toContain("## Outline");
  const bare = videoNoteFromCapture({
    capture: { ...capture, cues: [], subtitleOrigin: undefined },
    labels: LABELS,
    capturedOn: "2026-10-05",
    cover: "none",
  });
  expect(bare.toast).toBe("info");
  expect(bare.markdown).toContain("This video has no captions.");
  expect(bare.markdown).not.toContain("<details>");
});

test("omits the cover when the image upload fails and never hotlinks the thumbnail host", async () => {
  const capture = {
    platform: "youtube",
    videoId: CURRENT_ID,
    title: "Current video",
    author: "Channel",
    duration: 10,
    sourceUrl: `https://www.youtube.com/watch?v=${CURRENT_ID}`,
    chapters: [],
    cues: [{ start: 0, end: 1, text: "caption" }],
    thumbnail: { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" },
  };
  const memos = [];
  const uploaded = [];
  await persistVideoNote({
    notebookId: "nb_1",
    capture,
    labels: LABELS,
    capturedOn: "2026-10-05",
    createMemo: async (body) => { memos.push(body); },
    createWithImage: async (body) => { uploaded.push(body); throw new Error("missing write:resources"); },
  });
  expect(uploaded).toHaveLength(1);
  expect(uploaded[0].tags).toEqual(["web-clip"]);
  expect(uploaded[0].contentMarkdown).toContain("/api/v1/resources/EDGEVERRESOURCEID/blob");
  expect(memos).toHaveLength(1);
  expect(memos[0].tags).toEqual(["web-clip"]);
  expect(memos[0].contentMarkdown).not.toContain("EDGEVERRESOURCEID");
  expect(memos[0].contentMarkdown).not.toContain("ytimg.com");
  expect(memos[0].contentMarkdown).toContain("caption");
  expect(memos[0].videoTranscript).toBeUndefined();
  expect(uploaded[0].videoTranscript).toBeUndefined();
  expect(memos[0].contentMarkdown).not.toContain("edgeever-video-v1");
});

test("saves a video without captions as a source note without queuing transcription", async () => {
  const capture = {
    platform: "youtube",
    videoId: CURRENT_ID,
    title: "Current video",
    author: "Channel",
    duration: 95,
    sourceUrl: `https://www.youtube.com/watch?v=${CURRENT_ID}`,
    chapters: [],
    cues: [],
    thumbnail: { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" },
  };
  const memos = [];
  const uploaded = [];
  await persistVideoNote({
    notebookId: "nb_1",
    capture,
    labels: LABELS,
    capturedOn: "2026-10-05",
    createMemo: async (body) => { memos.push(body); },
    createWithImage: async (body) => { uploaded.push(body); throw new Error("missing write:resources"); },
  });
  expect(uploaded[0].videoTranscript).toBeUndefined();
  expect(memos[0].videoTranscript).toBeUndefined();
  expect(memos[0].contentMarkdown).toContain("This video has no captions.");
  expect(memos[0].contentMarkdown).toContain(`https://www.youtube.com/watch?v=${CURRENT_ID}`);
  expect(memos[0].contentMarkdown).not.toContain("edgeever-video-v1");
});

test("keeps the video menu hosts away from the other page commands", () => {
  const hosts = VIDEO_DOCUMENT_PATTERNS.map((pattern) => /^[a-z]+:\/\/([^/*]+)/i.exec(pattern)?.[1]);
  expect(hosts).toEqual([
    "www.youtube.com",
    "youtube.com",
    "m.youtube.com",
    "www.youtube.com",
    "youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.bilibili.com",
    "bilibili.com",
    "m.bilibili.com",
  ]);
  const background = readFileSync(new URL("./src/background.ts", import.meta.url), "utf8");
  const pagePatterns = [
    "TWEET_DOCUMENT_PATTERNS",
    "GITHUB_DOCUMENT_PATTERNS",
    "XHS_DOCUMENT_PATTERNS",
    "ZHIHU_DOCUMENT_PATTERNS",
    "REDDIT_DOCUMENT_PATTERNS",
  ].flatMap((name) => {
    const block = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(background)?.[1] ?? "";
    return [...block.matchAll(/"(https?:\/\/[^"]+)"/g)].map((match) => match[1]);
  });
  const hostOf = (pattern) => /^[a-z]+:\/\/([^/*]+)/i.exec(pattern)?.[1] ?? "*";
  const videoHosts = new Set(hosts);
  for (const pattern of pagePatterns) expect(videoHosts.has(hostOf(pattern))).toBe(false);
  expect(background).toContain('contexts: ["page", "video"]');
  expect(background).toContain("documentUrlPatterns: VIDEO_DOCUMENT_PATTERNS");
  const manifest = JSON.parse(readFileSync(new URL("./manifest.base.json", import.meta.url), "utf8"));
  expect(manifest.commands).toBeUndefined();
  const contentHosts = JSON.stringify(manifest.content_scripts);
  expect(contentHosts).not.toContain("youtube.com");
  expect(contentHosts).not.toContain("youtu.be");
  expect(contentHosts).not.toContain("bilibili.com");
});

test("ships the video-note phrases in the extension locales", () => {
  const en = messages("en");
  expect(en.saveVideoNoteToEdgeEver.message).toBe("Save video note to RTNote");
  expect(en.videoNoteSaved.message).toBe("Saved the video note.");
  expect(en.videoInfoSaved.message).toBe("Saved the video details.");
  expect(en.videoPageUnsupported.message).toBe("This page is not supported yet.");
  expect(en.videoNotRead.message).toBe("Could not read this video.");
  expect(en.videoNoCaptions.message).toBe("This video has no captions.");
  const pl = messages("pl");
  expect(pl.saveVideoNoteToEdgeEver.message).toBe("Zapisz notatkę z wideo w RTNote");
  expect(pl.videoOutlineHeading.message.length).toBeGreaterThan(0);
  expect(pl.videoTranscriptHeading.message).toBe("Transkrypcja");
  for (const locale of ["en", "zh_CN", "ja", "pl"]) {
    const catalog = messages(locale);
    for (const key of ["saveVideoNoteToEdgeEver", "videoNoteSaved", "videoPageUnsupported", "videoNotRead"]) {
      expect(catalog[key].message.length).toBeGreaterThan(0);
    }
  }
  for (const locale of ["en", "ja", "pl", "zh_CN"]) {
    const catalog = messages(locale);
    for (const key of ["videoTranscriptSaved", "videoTranscriptNeedScope", "videoSummaryHeading", "videoTakeawaysHeading", "modelDirectPermission"]) {
      expect(catalog[key]).toBeUndefined();
    }
  }
});
