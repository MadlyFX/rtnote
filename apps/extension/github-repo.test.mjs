import { describe, expect, test } from "bun:test";
import { createWindow } from "@mixmark-io/domino";
import { createContext, runInContext } from "node:vm";
import { bundleTestScripts } from "./bundle-test-scripts.mjs";
import {
  cleanRepoDescription,
  githubRepoFactsFromSource,
  githubRepoNoteMarkdown,
  githubRepoNoteTitle,
  githubRepoTarget,
  readmeLead,
} from "./src/github-repo.ts";

const labels = {
  capturedAt: "2026-10-01T00:00:00.000Z",
  sourceLabel: "Source",
  capturedAtLabel: "Captured at",
  homepageLabel: "Homepage",
  languageLabel: "Language",
  licenseLabel: "License",
  topicsLabel: "Topics",
};

const source = (overrides = {}) => ({
  pageUrl: "https://github.com/tianma-if/edgeever",
  openGraphDescription: "",
  embeddedJsonChunks: [],
  aboutText: "",
  homepage: "",
  topics: [],
  license: "",
  language: "",
  readmeParagraphs: [],
  ...overrides,
});

const sidebarPayload = (overrides = {}) => JSON.stringify({
  payload: {
    sidebarAbout: {
      description: "Open-source, AI-native knowledge base.",
      website: "https://rtnote.example",
      topics: [{ name: "notes" }, { name: "mcp" }, { name: "notes" }],
      ownerLogin: "tianma-if",
      repoName: "rtnote",
      stargazerCount: 1915,
      forksCount: 995,
      repo: { license: { spdxId: "AGPL-3.0", name: "GNU Affero General Public License v3.0" } },
      ...overrides,
    },
  },
});

describe("github repository addresses", () => {
  test("accepts a repository home and a code tree, and ignores other GitHub pages", () => {
    expect(githubRepoTarget("https://github.com/tianma-if/edgeever")).toEqual({
      owner: "tianma-if",
      name: "rtnote",
      canonicalUrl: "https://github.com/tianma-if/edgeever",
    });
    expect(githubRepoTarget("https://www.github.com/tianma-if/edgeever/?tab=readme-ov-file#readme")?.canonicalUrl)
      .toBe("https://github.com/tianma-if/edgeever");
    expect(githubRepoTarget("https://github.com/tianma-if/edgeever/tree/main")?.canonicalUrl)
      .toBe("https://github.com/tianma-if/edgeever");
    expect(githubRepoTarget("https://github.com/tianma-if/edgeever/tree/release/1.0/apps")?.canonicalUrl)
      .toBe("https://github.com/tianma-if/edgeever");
    expect(githubRepoTarget("https://github.com/tianma-if/edgeever/issues/12")).toBeNull();
    expect(githubRepoTarget("https://github.com/tianma-if/edgeever/pull/4")).toBeNull();
    expect(githubRepoTarget("https://github.com/tianma-if/edgeever/blob/main/README.md")).toBeNull();
    expect(githubRepoTarget("https://github.com/tianma-if/edgeever/tree")).toBeNull();
    expect(githubRepoTarget("https://github.com/tianma-if")).toBeNull();
    expect(githubRepoTarget("https://gist.github.com/tianma-if/edgeever")).toBeNull();
    expect(githubRepoTarget("https://example.com/tianma-if/edgeever")).toBeNull();
  });
});

describe("github repository card", () => {
  test("captures rendered repository facts when initial JSON is missing or too large", () => {
    const [script] = bundleTestScripts(["capture-github"]);
    for (const json of ["", JSON.stringify({ ownerLogin: "tianma-if", readme: "x".repeat(500_000) })]) {
      const window = createWindow(`
        <meta name="octolytics-dimension-repository_nwo" content="tianma-if/edgeever">
        <script type="application/json">${json}</script>
        <div class="sidebarSection__oqw6Y8">
          <h2>About</h2><p class="description__ej4leF">A portable notes workspace.</p>
          <div class="websiteRow__c4vvco"><a href="https://rtnote.example">rtnote.example</a></div>
          <a href="/topics/notes">notes</a>
          <a href="#license"><svg class="octicon-law"></svg>AGPL-3.0 license</a>
        </div>`, "https://github.com/tianma-if/edgeever/tree/main");
      Object.getPrototypeOf(window.document.querySelectorAll("span"))[Symbol.iterator] ??= Array.prototype[Symbol.iterator];
      let result;
      runInContext(script, createContext({
        document: window.document,
        location: window.location,
        __rtnoteGithubClipPayload: { requestId: "regression" },
        chrome: { runtime: { sendMessage: (message) => { result = message.result; } } },
      }));
      expect(result?.ok).toBe(true);
      expect(result.source.embeddedJsonChunks).toEqual([]);
      expect(githubRepoFactsFromSource(result.source)).toMatchObject({
        owner: "tianma-if", name: "rtnote", intro: "A portable notes workspace.",
        homepage: "https://rtnote.example/", topics: ["notes"], license: "AGPL-3.0",
      });
      expect(githubRepoFactsFromSource({ ...result.source, repositoryNwo: "other/repo" })).toBeNull();
      expect(githubRepoFactsFromSource({ ...result.source, repositoryNwo: undefined })).toBeNull();
      expect(githubRepoFactsFromSource({ ...result.source, pageUrl: "https://github.com/features/copilot" })).toBeNull();
    }
  });

  test("drops GitHub's generated description and the repository suffix", () => {
    expect(cleanRepoDescription(
      "Open-source notes. - tianma-if/edgeever",
      "tianma-if",
      "rtnote",
    )).toBe("Open-source notes.");
    expect(cleanRepoDescription(
      "Open-source notes &amp; sync. - rtnote/apps at main · tianma-if/edgeever",
      "tianma-if",
      "rtnote",
    )).toBe("Open-source notes & sync.");
    expect(cleanRepoDescription(
      "Contribute to tianma-if/edgeever development by creating an account on GitHub.",
      "tianma-if",
      "rtnote",
    )).toBe("");
  });

  test("uses the first real README paragraph when the about text is empty", () => {
    expect(readmeLead(["", "ok", "This is the project introduction."])).toBe("This is the project introduction.");
    expect(readmeLead(["ア".repeat(900)]).endsWith("…")).toBe(true);
    expect(readmeLead(["ア".repeat(900)]).length).toBe(801);
  });

  test("builds a card from the repository payload and leaves out live counters", () => {
    const facts = githubRepoFactsFromSource(source({
      pageUrl: "https://github.com/Tianma-IF/EdgeEver/tree/main/apps",
      openGraphDescription: "Open-source, AI-native knowledge base. - tianma-if/edgeever",
      embeddedJsonChunks: [sidebarPayload()],
      language: "TypeScript 62.1%",
      topics: ["notes", "sqlite"],
    }));
    expect(facts).toMatchObject({
      owner: "tianma-if",
      name: "rtnote",
      canonicalUrl: "https://github.com/tianma-if/edgeever",
      intro: "Open-source, AI-native knowledge base.",
      homepage: "https://rtnote.example/",
      language: "TypeScript",
      license: "AGPL-3.0",
      topics: ["notes", "mcp", "sqlite"],
    });
    const markdown = githubRepoNoteMarkdown({ ...facts, ...labels });
    expect(githubRepoNoteTitle(facts.owner, facts.name)).toBe("tianma-if/edgeever");
    expect(markdown.startsWith("Open-source, AI-native knowledge base.")).toBe(true);
    expect(markdown).toContain("Homepage: [rtnote.example](https://rtnote.example/)");
    expect(markdown).toContain("Language: TypeScript");
    expect(markdown).toContain("License: AGPL-3.0");
    expect(markdown).toContain("Topics: notes, mcp, sqlite");
    expect(markdown).toContain("[https://github.com/tianma-if/edgeever](https://github.com/tianma-if/edgeever)");
    expect(markdown).toContain("Captured at: 2026-10-01T00:00:00.000Z");
    expect(markdown).not.toContain("1915");
    expect(markdown).not.toContain("995");
  });

  test("reads a code tree that only identifies the repository, then uses the README lead", () => {
    const facts = githubRepoFactsFromSource(source({
      pageUrl: "https://github.com/tianma-if/edgeever/tree/main",
      openGraphDescription: "Contribute to tianma-if/edgeever development by creating an account on GitHub.",
      embeddedJsonChunks: [JSON.stringify({
        payload: {
          codeViewLayoutRoute: {
            repo: { ownerLogin: "tianma-if", name: "rtnote", defaultBranch: "main" },
          },
        },
      })],
      readmeParagraphs: ["Go", "A portable notes workspace for long-term writing."],
    }));
    expect(facts?.intro).toBe("A portable notes workspace for long-term writing.");
    expect(facts?.homepage).toBe("");
    expect(facts?.topics).toEqual([]);
    const markdown = githubRepoNoteMarkdown({ ...facts, ...labels });
    expect(markdown).not.toContain("Homepage:");
    expect(markdown).not.toContain("Topics:");
    expect(markdown).toContain("Source: [https://github.com/tianma-if/edgeever](https://github.com/tianma-if/edgeever)");
  });

  test("does not treat an unrelated GitHub page as the repository in the address", () => {
    expect(githubRepoFactsFromSource(source({
      pageUrl: "https://github.com/features/copilot",
      openGraphDescription: "AI pair programmer.",
      embeddedJsonChunks: [sidebarPayload()],
    }))).toBeNull();
    expect(githubRepoFactsFromSource(source({
      pageUrl: "https://github.com/tianma-if/edgeever/issues/8",
      embeddedJsonChunks: [sidebarPayload()],
    }))).toBeNull();
  });
});
