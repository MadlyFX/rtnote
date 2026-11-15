import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { repositoryWranglerConfigError } from "../scripts/wrangler-runner.mjs";
import {
  edgeEverDeploymentEnvironment,
  hasPlaceholderD1Binding,
  shouldRunEdgeEverDeployment,
} from "../packages/wrangler/dispatch.mjs";

const repositoryRoot = resolve(import.meta.dir, "..");
const normalizeLineEndings = (value: string) => value.replace(/\r\n/g, "\n");
const readRepositoryFile = (path: string) =>
  normalizeLineEndings(readFileSync(resolve(repositoryRoot, path), "utf8"));

describe("Cloudflare deployment entrypoints", () => {
  test("all entrypoints converge on the common deployment pipeline", () => {
    const packageJson = JSON.parse(readRepositoryFile("package.json"));
    const scripts = packageJson.scripts as Record<string, string>;

    expect(scripts.deploy).toContain("bun run build:cloudflare");
    expect(scripts.deploy).toContain("EDGE_EVER_USE_EXISTING_AUTH_SECRET=true");
    expect(scripts.deploy).toContain("deploy:ci");
    expect(scripts["deploy:manual"]).toBe(
      "export EDGE_EVER_DEPLOYMENT_TRIGGER=manual EDGE_EVER_DEPLOYMENT_METHOD=local_cli && bun run deploy:doctor && bun run build:cloudflare && bun run deploy:ci",
    );
    expect(scripts["deploy:ci"]).toBe(
      "bun run db:migrate:remote && bun run deploy:worker && bun run deploy:verify",
    );
    expect(scripts["deploy:cloudflare-builds"]).toBe(
      "EDGE_EVER_USE_EXISTING_AUTH_SECRET=true bun run deploy:ci",
    );
    expect(scripts["build:cloudflare"]).toContain("bun run build:worker");

    const wranglerConfig = readRepositoryFile("wrangler.toml");
    expect(wranglerConfig).toContain('main = ".wrangler/edgeever-worker/index.js"');
    expect(wranglerConfig).toContain("no_bundle = true");
    expect(wranglerConfig).toContain("find_additional_modules = true");
    expect(wranglerConfig).toContain('globs = ["modules/*.js"]');
  });

  test("Cloudflare's default Wrangler command cannot bypass the deployment pipeline", () => {
    const packageJson = JSON.parse(readRepositoryFile("package.json"));
    const shimPackage = JSON.parse(readRepositoryFile("packages/wrangler/package.json"));
    const shim = readRepositoryFile("packages/wrangler/bin/wrangler.js");
    const englishGuide = readRepositoryFile("docs/deploy-cloudflare-button.md");

    expect(packageJson.devDependencies.wrangler).toBe("workspace:*");
    expect(shimPackage.name).toBe("wrangler");
    expect(shimPackage.dependencies["edgeever-wrangler-cli"]).toMatch(/^npm:wrangler@/);
    expect(shim).toContain('["run", "deploy"]');
    const placeholderConfig = 'database_id = "00000000-0000-0000-0000-000000000000"';
    const legacyConfig = 'database_id = "11111111-1111-1111-1111-111111111111"';
    expect(hasPlaceholderD1Binding(placeholderConfig)).toBe(true);
    expect(hasPlaceholderD1Binding(legacyConfig)).toBe(false);
    expect(shouldRunEdgeEverDeployment(
      ["deploy"],
      { WORKERS_CI: "1" },
      placeholderConfig,
    )).toBe(true);
    expect(shouldRunEdgeEverDeployment(["deploy"], {}, placeholderConfig)).toBe(false);
    expect(shouldRunEdgeEverDeployment(
      ["deploy"],
      { WORKERS_CI: "1" },
      legacyConfig,
    )).toBe(false);
    expect(shouldRunEdgeEverDeployment(
      ["deploy"],
      { WORKERS_CI: "1", WRANGLER_CONFIG: "custom.toml" },
      placeholderConfig,
    )).toBe(false);
    expect(shouldRunEdgeEverDeployment(
      ["deploy", "--config", "custom.toml"],
      { WORKERS_CI: "1" },
      placeholderConfig,
    )).toBe(false);
    expect(shouldRunEdgeEverDeployment(
      ["deploy", "--env", "production"],
      { WORKERS_CI: "1" },
      placeholderConfig,
    )).toBe(false);
    expect(shouldRunEdgeEverDeployment(
      ["deploy", "--name", "custom-worker"],
      { WORKERS_CI: "1" },
      placeholderConfig,
    )).toBe(false);
    expect(shouldRunEdgeEverDeployment(
      ["deploy"],
      { WORKERS_CI: "1", EDGE_EVER_WRANGLER_BYPASS_SHIM: "1" },
      placeholderConfig,
    )).toBe(false);
    expect(edgeEverDeploymentEnvironment({ WORKERS_CI: "1" }))
      .toMatchObject({
        EDGE_EVER_DEPLOYMENT_TRIGGER: "main_push",
        EDGE_EVER_DEPLOYMENT_METHOD: "cloudflare_workers_builds_default",
      });
    expect(englishGuide).toContain("Deploy command: npx wrangler deploy");
  });

  test("deployment verification lets piped diagnostics flush before exiting", () => {
    const verificationScript = readRepositoryFile("scripts/verify-deployment.mjs");

    expect(verificationScript).toContain("process.exitCode = 1");
    expect(verificationScript).not.toContain("process.exit(1)");
  });

  test("online deployment declares the required authentication Secret", () => {
    const example = readRepositoryFile(".dev.vars.example");
    expect(example).toMatch(/^EDGE_EVER_AUTH_PASSWORD=\s*$/m);

    const packageJson = JSON.parse(readRepositoryFile("package.json"));
    expect(packageJson.cloudflare.bindings.EDGE_EVER_AUTH_PASSWORD.description).toBeTruthy();

    const englishGuide = readRepositoryFile("docs/deploy-cloudflare-button.md");
    expect(englishGuide).toContain("Worker runtime Secret, not a Workers Builds variable");
  });

  test("Workers Builds receives configuration but never the runtime password", () => {
    const setup = readRepositoryFile("scripts/cloudflare-workers-builds.mjs");

    expect(setup).toContain('"AUTH_USERNAME"');
    expect(setup).toContain('"AUTH_LOGIN_WINDOW_SECONDS"');
    expect(setup).not.toContain('"AUTH_PASSWORD",');
    expect(setup).not.toContain('"AUTH_PASSWORD_HASH",');
    expect(setup).not.toContain("Missing EDGE_EVER_AUTH_PASSWORD");
    expect(setup).toContain("is_secret: false");
  });

  test("online deployment resolves the D1 id without editing the repository config", () => {
    const runner = readRepositoryFile("scripts/run-wrangler.mjs");
    const wranglerConfig = readRepositoryFile("wrangler.toml");
    const englishAgentDoc = readRepositoryFile("docs/agent-deploy-cloudflare.md");

    expect(wranglerConfig).toContain(
      'database_id = "00000000-0000-0000-0000-000000000000"',
    );
    expect(runner).toContain('"d1", "list", "--json"');
    expect(runner).toContain("findD1DatabaseIdByName");
    expect(runner).toContain("repositoryWranglerConfigError(config, usesRepositoryConfig)");
    expect(runner).not.toContain("replace the database_id placeholder");
    expect(englishAgentDoc).toContain("automatically resolves the D1 UUID");
  });

  test("rejects instance-specific values in the repository Wrangler config", () => {
    const repositoryConfig = readRepositoryFile("wrangler.toml");
    expect(repositoryConfig).toContain('[version_metadata]\nbinding = "CF_VERSION_METADATA"');
    const instanceConfigs = [
      repositoryConfig.replace('name = "edgeever"', 'name = "my-notes"'),
      repositoryConfig.replace("workers_dev = true", "workers_dev = false"),
      repositoryConfig.replace('database_name = "edgeever"', 'database_name = "my-notes"'),
      repositoryConfig.replace(
        'database_id = "00000000-0000-0000-0000-000000000000"',
        'database_id = "11111111-1111-1111-1111-111111111111"',
      ),
      repositoryConfig.replace('bucket_name = "edgeever-resources"', 'bucket_name = "my-notes"'),
      repositoryConfig.replace('compatibility_date = "2026-06-26"', 'compatibility_date = "2026-08-17"'),
      `${repositoryConfig}\n[vars]\nEDGE_EVER_AUTH_USERNAME = "owner"\n`,
      `${repositoryConfig}\n[[routes]]\npattern = "notes.example.com"\ncustom_domain = true\n`,
    ];

    for (const instanceConfig of instanceConfigs) {
      const error = repositoryWranglerConfigError(instanceConfig, true);
      expect(error).toContain("Refusing instance-specific setting");
      expect(error).toContain("EDGE_EVER_*");
      expect(error).toContain("WRANGLER_CONFIG");
    }
    expect(repositoryWranglerConfigError(repositoryConfig, true)).toBeUndefined();
    expect(repositoryWranglerConfigError(instanceConfigs[0], false)).toBeUndefined();
  });

  test("keeps D1 resolver diagnostics out of Wrangler JSON stdout", () => {
    const workingDirectory = mkdtempSync(resolve(tmpdir(), "edgeever-wrangler-output-"));
    const wranglerBinDirectory = resolve(
      workingDirectory,
      "node_modules",
      "wrangler",
      "bin",
    );
    const queryOutput = JSON.stringify([{ results: [{ name: "users" }] }]);
    const inheritedEnvironment = Object.fromEntries(
      ["PATH", "Path", "PATHEXT", "SystemRoot", "ComSpec", "TEMP", "TMP"]
        .map((name) => [name, process.env[name]])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    const environment = {
      ...inheritedEnvironment,
      EDGE_EVER_INSTANCE: "",
      WRANGLER_CONFIG: resolve(workingDirectory, "wrangler.external.toml"),
    };

    try {
      mkdirSync(wranglerBinDirectory, { recursive: true });
      writeFileSync(
        resolve(workingDirectory, "wrangler.external.toml"),
        [
          'name = "edgeever"',
          'database_name = "edgeever"',
          'database_id = "00000000-0000-0000-0000-000000000000"',
          'bucket_name = "edgeever-resources"',
          'preview_bucket_name = "edgeever-resources-preview"',
          'migrations_dir = "migrations"',
          "",
        ].join("\n"),
      );
      writeFileSync(
        resolve(wranglerBinDirectory, "wrangler.js"),
        [
          'const args = process.argv.slice(2);',
          'if (args.includes("list")) {',
          '  process.stdout.write(JSON.stringify([{ name: "edgeever", uuid: "11111111-1111-1111-1111-111111111111" }]));',
          "} else {",
          `  process.stdout.write(${JSON.stringify(`${queryOutput}\n`)});`,
          "}",
          "",
        ].join("\n"),
      );

      const resultPath = resolve(workingDirectory, "result.json");
      const runnerArguments = [
        "d1",
        "execute",
        "DB",
        "--remote",
        "--command",
        "SELECT name FROM sqlite_master",
        "--json",
      ];
      const harness = spawnSync(
        "node",
        [
          "-e",
          [
            'const { spawnSync } = require("node:child_process");',
            'const { writeFileSync } = require("node:fs");',
            "const result = spawnSync(",
            "  process.env.EDGE_TEST_RUNTIME,",
            "  [process.env.EDGE_TEST_RUNNER, ...JSON.parse(process.env.EDGE_TEST_ARGUMENTS)],",
            '  { cwd: process.env.EDGE_TEST_CWD, encoding: "utf8", env: process.env },',
            ");",
            "writeFileSync(process.env.EDGE_TEST_RESULT, JSON.stringify({",
            "  status: result.status,",
            "  stdout: result.stdout,",
            "  stderr: result.stderr,",
            "  error: result.error?.message,",
            "}));",
          ].join("\n"),
        ],
        {
          env: {
            ...environment,
            EDGE_TEST_ARGUMENTS: JSON.stringify(runnerArguments),
            EDGE_TEST_CWD: workingDirectory,
            EDGE_TEST_RESULT: resultPath,
            EDGE_TEST_RUNNER: resolve(repositoryRoot, "scripts", "run-wrangler.mjs"),
            EDGE_TEST_RUNTIME: process.execPath,
          },
        },
      );
      expect(harness.status).toBe(0);
      const result = JSON.parse(readFileSync(resultPath, "utf8")) as {
        error?: string;
        status: number;
        stderr: string;
        stdout: string;
      };

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stdout).toBe(`${queryOutput}\n`);
      expect(result.stderr).toContain("[info] resolving Cloudflare D1 database id for edgeever");
      expect(result.stderr).toContain("[ok] resolved D1 database edgeever");
    } finally {
      rmSync(workingDirectory, { force: true, recursive: true });
    }
  });

  test("records the public Worker target reported by a CI deployment", () => {
    const workingDirectory = mkdtempSync(resolve(tmpdir(), "edgeever-deployment-target-"));
    const wranglerBinDirectory = resolve(
      workingDirectory,
      "node_modules",
      "wrangler",
      "bin",
    );
    const inheritedEnvironment = Object.fromEntries(
      ["PATH", "Path", "PATHEXT", "SystemRoot", "ComSpec", "TEMP", "TMP"]
        .map((name) => [name, process.env[name]])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    );

    try {
      mkdirSync(wranglerBinDirectory, { recursive: true });
      writeFileSync(
        resolve(workingDirectory, "wrangler.external.toml"),
        [
          'name = "edgeever"',
          "workers_dev = true",
          'database_name = "edgeever"',
          'database_id = "11111111-1111-1111-1111-111111111111"',
          'bucket_name = "edgeever-resources"',
          'preview_bucket_name = "edgeever-resources-preview"',
          'migrations_dir = "migrations"',
          "",
        ].join("\n"),
      );
      writeFileSync(
        resolve(wranglerBinDirectory, "wrangler.js"),
        [
          'if (process.argv.includes("deployments")) {',
          '  process.stdout.write(JSON.stringify({ versions: [{ version_id: "legacy-version", percentage: 100 }] }));',
          '} else if (process.argv.includes("versions")) {',
          '  process.stdout.write(JSON.stringify({ resources: { bindings: [',
          '    { name: "RESOURCES", type: "r2_bucket", bucket_name: "legacy-user-resources" },',
          '    { name: "EDGE_EVER_AUTH_USERNAME", type: "plain_text", text: "legacy-owner" }',
          '  ] } }));',
          '} else if (process.argv.includes("deploy")) {',
          '  process.stdout.write("Uploaded edgeever\\nDeployed edgeever triggers (0.4 sec)\\n  https://edgeever.example.workers.dev\\nCurrent Version ID: version-1\\n");',
          "}",
          "",
        ].join("\n"),
      );

      const result = spawnSync(
        process.execPath,
        [resolve(repositoryRoot, "scripts", "run-wrangler.mjs"), "deploy"],
        {
          cwd: workingDirectory,
          encoding: "utf8",
          env: {
            ...inheritedEnvironment,
            CI: "true",
            EDGE_EVER_AUTH_PASSWORD: "test-password",
            EDGE_EVER_INSTANCE: "",
            WRANGLER_CONFIG: resolve(workingDirectory, "wrangler.external.toml"),
          },
        },
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(readFileSync(
        resolve(workingDirectory, ".wrangler.deployment-targets.json"),
        "utf8",
      ))).toEqual({
        urls: ["https://edgeever.example.workers.dev"],
        versionId: "version-1",
      });
      const generatedConfig = readFileSync(
        resolve(workingDirectory, ".wrangler.generated.toml"),
        "utf8",
      );
      expect(generatedConfig).toContain('bucket_name = "legacy-user-resources"');
      expect(generatedConfig).toContain('EDGE_EVER_R2_BUCKET_NAME = "legacy-user-resources"');
      expect(generatedConfig).toContain('EDGE_EVER_AUTH_USERNAME = "legacy-owner"');
    } finally {
      rmSync(workingDirectory, { force: true, recursive: true });
    }
  });
});
