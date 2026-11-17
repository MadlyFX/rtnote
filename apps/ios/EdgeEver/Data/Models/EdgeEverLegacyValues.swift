import Foundation

/// Chinese values that EdgeEver stored in user data. RTNote writes English, but notes,
/// caches and drafts from EdgeEver still carry these, so readers recognise them.
/// Translation data, not UI text. Mirrors `packages/shared/src/memo-title.ts` and
/// `packages/shared/src/edgeever-legacy-values.ts`.
enum EdgeEverLegacyValues {
    /// Default titles EdgeEver stored for untitled notes.
    static let defaultMemoTitles: [String] = ["无标题笔记"]

    /// Text prefixes EdgeEver put before attachment links (full-width and ASCII colon).
    static let attachmentPrefixes: [String] = ["附件：", "附件:"]
}
