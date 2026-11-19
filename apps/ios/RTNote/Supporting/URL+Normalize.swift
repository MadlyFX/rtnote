import Foundation

extension URL {
    /// Strip trailing slashes for stable instance keys / API base URLs.
    var rtNoteNormalizedBase: URL {
        var absolute = absoluteString
        while absolute.hasSuffix("/") {
            absolute.removeLast()
        }
        return URL(string: absolute) ?? self
    }
}

enum RTNotePublicDemo {
    static let instanceURLString = "https://demo.rtnote.example"
}

enum RTNoteURLNormalizer {
    static func normalizeInstanceURL(_ raw: String) throws -> URL {
        var trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            throw RTNoteURLError.empty
        }
        if !trimmed.contains("://") {
            trimmed = "https://\(trimmed)"
        }
        guard var components = URLComponents(string: trimmed), let host = components.host, !host.isEmpty else {
            throw RTNoteURLError.invalid
        }
        if host.lowercased() == "demo" {
            components.scheme = "https"
            components.host = "demo.rtnote.example"
        }
        components.fragment = nil
        components.query = nil
        guard let url = components.url else {
            throw RTNoteURLError.invalid
        }
        return url.rtNoteNormalizedBase
    }
}

enum RTNoteURLError: LocalizedError {
    case empty
    case invalid

    var errorDescription: String? {
        switch self {
        case .empty:
            return "Instance URL is required."
        case .invalid:
            return "Instance URL is invalid."
        }
    }
}
