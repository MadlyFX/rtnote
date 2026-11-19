import Foundation
import WebKit

/// In-memory blob map so WKWebView can load authenticated images via a custom scheme
/// without embedding multi-megabyte data: URLs into evaluateJavaScript strings.
actor ResourceBlobStore {
    static let shared = ResourceBlobStore()

    private var blobs: [String: (data: Data, mimeType: String)] = [:]

    func put(id: String, data: Data, mimeType: String) {
        blobs[id] = (data, mimeType)
    }

    func get(id: String) -> (data: Data, mimeType: String)? {
        blobs[id]
    }

    func remove(id: String) {
        blobs[id] = nil
    }
}

/// Serves `rtnote-res://local/<resourceId>` image and audio bytes into the TipTap WKWebView.
final class RTNoteResourceSchemeHandler: NSObject, WKURLSchemeHandler, @unchecked Sendable {
    static let scheme = "rtnote-res"

    /// Build a short local URL for a cached resource id.
    static func localURL(for resourceId: String) -> String {
        let encoded = resourceId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? resourceId
        return "\(scheme)://local/\(encoded)"
    }

    static func resourceId(from url: URL) -> String? {
        guard url.scheme == scheme else { return nil }
        // rtnote-res://local/<id>
        let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !path.isEmpty else { return nil }
        return path.removingPercentEncoding ?? path
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url,
              let id = Self.resourceId(from: url)
        else {
            urlSchemeTask.didFailWithError(
                NSError(domain: "RTNoteResource", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid resource URL"])
            )
            return
        }

        Task {
            guard let entry = await ResourceBlobStore.shared.get(id: id) else {
                urlSchemeTask.didFailWithError(
                    NSError(domain: "RTNoteResource", code: 404, userInfo: [NSLocalizedDescriptionKey: "Resource not cached"])
                )
                return
            }
            // HTTPURLResponse is more reliable for <img> loads than plain URLResponse
            // (especially for non-bitmap types served through a custom scheme).
            // <audio> asks for byte ranges; answer them so playback can seek.
            let total = entry.data.count
            let range = Self.byteRange(
                header: urlSchemeTask.request.value(forHTTPHeaderField: "Range"),
                total: total
            )
            var headers: [String: String] = [
                "Content-Type": entry.mimeType,
                "Accept-Ranges": "bytes",
                "Access-Control-Allow-Origin": "*",
            ]
            let body: Data
            let status: Int
            if let range {
                body = entry.data.subdata(in: range)
                status = 206
                headers["Content-Range"] = "bytes \(range.lowerBound)-\(range.upperBound - 1)/\(total)"
            } else {
                body = entry.data
                status = 200
            }
            headers["Content-Length"] = String(body.count)
            guard let response = HTTPURLResponse(
                url: url,
                statusCode: status,
                httpVersion: "HTTP/1.1",
                headerFields: headers
            ) else {
                urlSchemeTask.didFailWithError(
                    NSError(domain: "RTNoteResource", code: 500, userInfo: [NSLocalizedDescriptionKey: "Bad response"])
                )
                return
            }
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(body)
            urlSchemeTask.didFinish()
        }
    }

    /// Parses a single `bytes=start-end` / `bytes=start-` / `bytes=-suffix` range.
    /// Returns nil for no header, multiple ranges or an unsatisfiable range (serve the whole body).
    static func byteRange(header: String?, total: Int) -> Range<Int>? {
        guard let header, total > 0 else { return nil }
        let value = header.trimmingCharacters(in: .whitespaces)
        guard value.lowercased().hasPrefix("bytes="), !value.contains(",") else { return nil }
        let spec = value.dropFirst("bytes=".count)
        let parts = spec.split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false)
        guard parts.count == 2 else { return nil }
        let startText = parts[0].trimmingCharacters(in: .whitespaces)
        let endText = parts[1].trimmingCharacters(in: .whitespaces)
        if startText.isEmpty {
            guard let suffix = Int(endText), suffix > 0 else { return nil }
            return max(0, total - suffix)..<total
        }
        guard let start = Int(startText), start >= 0, start < total else { return nil }
        let end: Int
        if endText.isEmpty {
            end = total - 1
        } else {
            guard let parsed = Int(endText), parsed >= start else { return nil }
            end = min(parsed, total - 1)
        }
        return start..<(end + 1)
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // No long-running network task to cancel; blobs are already in memory.
    }
}
