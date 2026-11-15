# Contributing to RTNote

Thank you for contributing. Please read [AGENTS.md](AGENTS.md) first: it lists the project rules, including identifiers that must not be renamed.

## Branches

- Create a branch for each change from the latest `main`, for example `feat/short-description` or `fix/short-description`.
- Open a pull request against `MadlyFX/rtnote:main`.
- If your Fork also deploys RTNote on Cloudflare, keep its `main` for deployment and do your work on separate branches. Every push to the deployment `main` redeploys your instance.

```sh
git clone https://github.com/<your-account>/rtnote.git
cd rtnote
git remote add upstream https://github.com/MadlyFX/rtnote.git
git fetch upstream
git switch -c feat/short-description upstream/main
```

To update an in-progress branch:

```sh
git fetch upstream
git rebase upstream/main
git push --force-with-lease origin feat/short-description
```

## Verify your changes

```sh
bun install
bun run lint
bun run typecheck
bun run typecheck:mobile
bun run build:web
bun run test
```

CI runs the same checks on Ubuntu for every pull request. The test suite targets Linux and macOS; on Windows, rely on CI for the full result. Platform-specific changes may need extra checks on that platform.

## Writing

Write code comments, UI strings, docs and commit messages in English. Add new UI strings to the English catalog in `packages/shared/src/i18n/en-US.ts` and provide the same keys in the other catalogs.
