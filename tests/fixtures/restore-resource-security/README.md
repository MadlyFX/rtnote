# EdgeEver archive fixture

`v2.12.0.zip` is a real backup exported by EdgeEver v2.12.0 (official release commit `eeaab088f41d0417fbce2266f58ff4adde7f5d76`). It holds one notebook, one note with a revision, and four synthetic attachments, with no credentials or user data.

RTNote made a clean break from EdgeEver's stored formats and does not restore EdgeEver backups. The test checks that this archive is rejected as an unsupported format before anything reaches the server.

Run: `bun test apps/api/src/resource-restore-security.test.mjs`.
