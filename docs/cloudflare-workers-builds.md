# Cloudflare Workers Builds

## Setup

For first-time setup, create the `edgeever` Worker with **Start with Hello World!**, deploy `EDGE_EVER_AUTH_PASSWORD` as a runtime Secret, then connect the Fork through the existing Worker’s **Settings → Builds → Connect**. Follow the [online deployment guide](deploy-cloudflare-button.md), use the repository root and `main` branch, and keep the default `npx wrangler deploy` command. Existing projects can keep their explicit build and `bun run deploy:cloudflare-builds` commands.

Authorization:

1. Approve the **Cloudflare Workers & Pages** GitHub App for the deployment repository.
2. If the Agent integration needs a Cloudflare API token, use a User API Token limited to the target account.
3. Configure the deployment API token in Cloudflare under **Worker -> Settings -> Build -> API token**. The automatically generated token may lack D1 permissions; confirm it has D1 read and edit permissions for the target account before deploying. Select this token in the Worker’s **Settings → Builds → API token** and save the build settings. Subsequent Cloudflare Workers Builds runs use it for database migrations and Worker deployment.

Set `EDGE_EVER_AUTH_PASSWORD` as a runtime Secret under the Worker's **Settings → Variables and Secrets**, not as a Builds variable.

Ordinary deployments use D1 `edgeever`, R2 `edgeever-resources`, and username `admin`. Put optional non-secret instance settings under **Settings → Build → Build variables and secrets**. These variables are available only during the build; the deploy command uses them to generate a temporary Wrangler configuration. Keep the tracked `wrangler.toml` unchanged.

Without an explicit override, existing deployments keep their current R2 bucket and administrator username.

## Updates and troubleshooting

- A push to `main` builds, applies D1 migrations, deploys, and verifies RTNote.
- To take a newer RTNote version, use GitHub **Sync fork** on the Fork to bring `main` up to date with `MadlyFX/rtnote`; the push triggers a new build.
- A Fork that keeps its own application-code changes on `main` must merge RTNote updates itself and resolve conflicts before pushing.
- Build failure: inspect the Worker **Deployments** log and confirm the Deployment commit SHA matches Fork `main`.
