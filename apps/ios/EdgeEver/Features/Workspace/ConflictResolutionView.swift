import SwiftUI

/// Minimal conflict UI: discard local queue item and rehydrate from server.
struct ConflictResolutionView: View {
    @Environment(AppEnvironment.self) private var env
    let item: OutboxItem
    var onResolved: () -> Void

    @State private var busy = false
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(env.preferences.t("Sync conflict", zh: "同步冲突", pl: "Konflikt synchronizacji")).font(.headline)
            Text(env.preferences.t(
                "The local draft differs from the server version. Discard local changes and use the cloud version, or resolve it later.",
                zh: "本地草稿与服务器版本不一致。你可以丢弃本地更改并采用云端内容，或稍后再处理。",
                pl: "Lokalny szkic różni się od wersji na serwerze. Odrzuć lokalne zmiany i użyj wersji z chmury lub rozwiąż to później."
            ))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if let err = item.lastError {
                Text(err).font(.caption).foregroundStyle(.red)
            }
            if let error {
                Text(error).font(.caption).foregroundStyle(.red)
            }
            HStack {
                Button(env.preferences.t("Discard local", zh: "丢弃本地", pl: "Odrzuć lokalne")) {
                    Task { await discardLocal() }
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .disabled(busy)
                Button(env.preferences.t("Later", zh: "稍后", pl: "Później")) { onResolved() }
                    .disabled(busy)
            }
        }
        .padding()
    }

    private func discardLocal() async {
        guard let scope = env.session.dataScope else { return }
        busy = true
        defer { busy = false }
        do {
            let remote = try await env.session.client.getMemo(id: item.memoId, includeDeleted: true)
            _ = try env.outbox.remove(scope: scope, id: item.id, expectedVersion: nil)
            try env.mirror.upsertMemo(scope: scope, memo: remote)
            try env.drafts.clear(scope: scope, key: DraftRepository.memoKey(item.memoId))
            onResolved()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
