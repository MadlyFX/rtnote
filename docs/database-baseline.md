# Database baseline

RTNote's database starts from one migration, `migrations/0100_baseline.sql`. It replaces the 93 migrations inherited from EdgeEver (`0001_initial.sql` to `0094_branding.sql`), which carried Chinese seed data, AI writing-assist tables that a later migration dropped, and years of repairs to seeds that no longer exist.

## What the baseline contains

- The schema the old migrations ended with, table for table, index for index and trigger for trigger. Only formatting and comments differ. `tests/baseline-migration.test.ts` compares it with `tests/fixtures/edgeever-0094-schema.sql`, a snapshot of that schema.
- No AI writing-assist tables. The speech-transcription tables (`ai_transcription_*`) stay; voice memos use them.
- The default workspace for a new installation, in English: five notebooks, the welcome note, five note templates and the built-in object storage row. First sign-in still translates them into the reader's language while nobody has changed them, and still copies the example notes in.

Identifiers that stored data depends on keep their names, such as `ws_default`, `nb_inbox`, `memo_welcome`, the `edgeever-resources` bucket default and the `_edgeever_migrations` table.

## How each database takes it

Every runner (Wrangler for D1, the Docker server and the desktop sidecar) applies the migration files it has not recorded yet. The baseline handles three cases:

| Database | What happens |
| --- | --- |
| Empty | Creates the schema and seeds the default workspace. |
| Already migrated through `0094_branding.sql` | Changes nothing. Every `CREATE` is `IF NOT EXISTS` and the seeds are skipped. The runner records the baseline as applied, and `/api/health` then reports migration `0100`. |
| Stopped before `0094_branding.sql` | Refused with `CHECK constraint failed: database stopped partway through the pre-baseline migrations…`. Nothing is changed. |

To fix a refused database, deploy the last RTNote release that still shipped the old migrations, let it finish migrating, then deploy this one. On Docker, take a volume backup first as usual.

## Rules from here on

- Never edit `0100_baseline.sql` once released. Put every schema or seed change in a new, higher-numbered migration (`0101_…`, `0102_…`).
- Seed data in the baseline must stay identical to the shared seed definitions in `packages/shared/src/default-workspace-seeds.ts` and `memo-template-seeds.ts`. The welcome note is recognised as untouched by its exact content hash; the baseline test checks this.
- Code that recognises EdgeEver's seed values (`LEGACY_*` constants) stays: older databases and EdgeEver backups still carry them.
