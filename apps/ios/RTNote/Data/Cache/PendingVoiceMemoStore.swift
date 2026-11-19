import Foundation

/// File naming and storage for voice memo recordings.
enum VoiceMemoFiles {
    static let mimeType = "audio/mp4"
    static let fileExtension = "m4a"

    /// Application Support/VoiceMemos. Recordings live here until their upload succeeds;
    /// unlike Caches, the system never purges it.
    static func directory() throws -> URL {
        let base = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let directory = base.appendingPathComponent("VoiceMemos", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    /// Matches shared `createVoiceMemoClientId` (`vm_` + random id).
    static func newClientId() -> String {
        "vm_" + UUID().uuidString.lowercased()
    }

    /// On-disk file for a recording; named by client id so names never collide.
    static func fileURL(clientId: String) throws -> URL {
        try directory().appendingPathComponent("\(clientId).\(fileExtension)")
    }

    /// Matches shared `createVoiceMemoFilename`: `Voice memo 2026-11-15 14.03.22.m4a`.
    static func displayFilename(date: Date, prefix: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd HH.mm.ss"
        let unsafe = CharacterSet(charactersIn: "\\/:*?\"<>|")
        let cleaned = prefix.components(separatedBy: unsafe).joined(separator: " ")
            .split(whereSeparator: { $0.isWhitespace })
            .joined(separator: " ")
        let safePrefix = cleaned.isEmpty ? "Voice memo" : cleaned
        return "\(safePrefix) \(formatter.string(from: date)).\(fileExtension)"
    }

    /// Matches shared `formatVoiceMemoDuration`: `m:ss`, or `h:mm:ss` from one hour.
    static func formatDuration(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds.rounded(.down)))
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let secs = total % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        }
        return String(format: "%d:%02d", minutes, secs)
    }
}

/// A recording saved on this device whose voice memo block is not filled in yet.
struct PendingVoiceMemo: Codable, Equatable, Sendable {
    var clientId: String
    var filename: String
    var mimeType: String
    var byteSize: Int
    var durationMs: Int
    var createdAt: Date
    /// Set once the server accepted the file, so a retry only fills in the block.
    var uploadedURL: String?
    var uploadedByteSize: Int?
}

/// Durable list of recordings waiting to be uploaded or written into their note.
///
/// iOS has no offline resource queue, so a recording is kept here (index plus file in
/// Application Support) from the moment it stops until its voice memo block holds the
/// uploaded URL. The editor retries whenever a note containing the block is opened.
@MainActor
final class PendingVoiceMemoStore {
    static let shared = PendingVoiceMemoStore()

    private(set) var entries: [PendingVoiceMemo] = []
    private let indexURL: URL?

    init(directory: URL? = try? VoiceMemoFiles.directory()) {
        indexURL = directory?.appendingPathComponent("pending.json")
        if let indexURL,
           let data = try? Data(contentsOf: indexURL),
           let saved = try? JSONDecoder().decode([PendingVoiceMemo].self, from: data)
        {
            entries = saved
        }
    }

    func entry(clientId: String) -> PendingVoiceMemo? {
        entries.first { $0.clientId == clientId }
    }

    func add(_ entry: PendingVoiceMemo) {
        entries.removeAll { $0.clientId == entry.clientId }
        entries.append(entry)
        save()
    }

    func markUploaded(clientId: String, url: String, byteSize: Int) {
        guard let index = entries.firstIndex(where: { $0.clientId == clientId }) else { return }
        entries[index].uploadedURL = url
        entries[index].uploadedByteSize = byteSize
        save()
    }

    /// Forget a recording once its block holds the uploaded URL, and delete the local file.
    func remove(clientId: String) {
        entries.removeAll { $0.clientId == clientId }
        save()
        if let url = try? VoiceMemoFiles.fileURL(clientId: clientId) {
            try? FileManager.default.removeItem(at: url)
        }
    }

    /// Entries whose block appears in `documentJSON` (client ids are unique random strings).
    func entries(referencedBy documentJSON: String) -> [PendingVoiceMemo] {
        entries.filter { documentJSON.contains($0.clientId) }
    }

    private func save() {
        guard let indexURL else { return }
        do {
            let data = try JSONEncoder().encode(entries)
            try data.write(to: indexURL, options: .atomic)
        } catch {
            NSLog("PendingVoiceMemoStore: save failed %@", String(describing: error))
        }
    }
}
