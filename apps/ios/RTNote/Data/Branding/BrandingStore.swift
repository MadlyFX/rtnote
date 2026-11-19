import Foundation
import Observation

/// Holds the branding the app shows and keeps `BrandThemeState` (the accent family)
/// in step with it.
///
/// - Signed in: `effective` from `GET /api/v1/branding`, cached in UserDefaults so the
///   next launch shows it before the network answers.
/// - Signed out: the instance default from `GET /api/public/branding` for the URL typed
///   on the sign-in screen (memory only).
/// - Any failure (offline, 404 from an older server, bad payload) keeps what is shown.
@Observable
@MainActor
final class BrandingStore {
    enum Source: String, Codable, Sendable {
        case builtIn
        case publicInstance
        case workspace
    }

    /// Minimum gap between non-forced refreshes (foreground).
    static let refreshInterval: TimeInterval = 5 * 60
    static let cacheKey = "rtnote.branding.cache.v1"

    private(set) var branding: ResolvedBranding = .default
    /// Server the branding came from; server-relative logo paths resolve against it.
    private(set) var baseURL: URL?
    private(set) var source: Source = .builtIn

    private let defaults: UserDefaults
    private let now: () -> Date
    @ObservationIgnored private var lastWorkspaceAttempt: (key: String, at: Date)?
    @ObservationIgnored private var workspaceFetchInFlight = false
    /// Bumped by `reset()` and each request so a late answer cannot overwrite newer state.
    @ObservationIgnored private var generation = 0

    private struct Cached: Codable {
        var baseUrl: String
        var branding: ResolvedBranding
    }

    init(defaults: UserDefaults = .standard, now: @escaping () -> Date = { Date() }) {
        self.defaults = defaults
        self.now = now
        loadCache()
    }

    var name: String { branding.name }

    func logoURL(dark: Bool) -> URL? {
        branding.logoURL(dark: dark, baseURL: baseURL)
    }

    // MARK: - Signed in

    /// Fetches the workspace branding. `force` skips the 5-minute throttle (launch,
    /// sign-in); foreground refreshes pass `false`.
    func refreshWorkspace(client: APIClient, force: Bool) async {
        let base = await client.baseURL
        let key = base.absoluteString
        if !force {
            if workspaceFetchInFlight { return }
            if let last = lastWorkspaceAttempt, last.key == key,
               now().timeIntervalSince(last.at) < Self.refreshInterval
            {
                return
            }
        }
        lastWorkspaceAttempt = (key: key, at: now())
        workspaceFetchInFlight = true
        defer { workspaceFetchInFlight = false }
        // Also invalidates a public request still running from the sign-in screen.
        generation += 1
        let startGeneration = generation
        do {
            let response = try await client.getBranding()
            guard startGeneration == generation else { return }
            apply(response.effective, baseURL: base, source: .workspace)
            saveCache()
        } catch {
            // Keep the cached / current branding.
        }
    }

    // MARK: - Signed out

    /// Instance default branding for a server URL (sign-in screen or restricted session).
    func refreshPublic(baseURL: URL) async {
        generation += 1
        let startGeneration = generation
        let client = APIClient(baseURL: baseURL)
        let base = await client.baseURL
        do {
            let branding = try await client.getPublicBranding()
            guard startGeneration == generation else { return }
            apply(branding, baseURL: base, source: .publicInstance)
        } catch {
            guard startGeneration == generation else { return }
            // Branding of another server must not stay on screen for this one.
            if self.baseURL?.absoluteString != base.absoluteString {
                applyDefault()
            }
        }
    }

    /// Sign-in screen cleared its URL: drop branding fetched for an earlier URL.
    func clearPublic() {
        guard source == .publicInstance else { return }
        generation += 1
        applyDefault()
    }

    // MARK: - Sign-out

    /// Back to built-in branding and forget the cache.
    func reset() {
        generation += 1
        lastWorkspaceAttempt = nil
        defaults.removeObject(forKey: Self.cacheKey)
        applyDefault()
    }

    /// No session (sign-out, a 401, or none at launch): drop workspace branding and its
    /// cache, but keep branding the sign-in screen fetched for its URL.
    func sessionEnded() {
        if source == .workspace || defaults.object(forKey: Self.cacheKey) != nil {
            reset()
        }
    }

    /// Workspace branding cached for another server must not show for this session.
    func discardWorkspace(unlessFrom url: URL) {
        guard source == .workspace else { return }
        if baseURL?.rtNoteNormalizedBase.absoluteString != url.rtNoteNormalizedBase.absoluteString {
            reset()
        }
    }

    // MARK: - Internals

    private func applyDefault() {
        apply(.default, baseURL: nil, source: .builtIn)
    }

    private func apply(_ next: ResolvedBranding, baseURL: URL?, source: Source) {
        if branding != next { branding = next }
        if self.baseURL != baseURL { self.baseURL = baseURL }
        if self.source != source { self.source = source }
        BrandThemeState.shared.apply(AccentPalette.forBranding(next))
    }

    private func loadCache() {
        guard let data = defaults.data(forKey: Self.cacheKey),
              let cached = try? JSONDecoder().decode(Cached.self, from: data),
              let url = URL(string: cached.baseUrl)
        else {
            BrandThemeState.shared.apply(.standard)
            return
        }
        apply(cached.branding, baseURL: url, source: .workspace)
    }

    private func saveCache() {
        guard source == .workspace, let baseURL else { return }
        let cached = Cached(baseUrl: baseURL.absoluteString, branding: branding)
        if let data = try? JSONEncoder().encode(cached) {
            defaults.set(data, forKey: Self.cacheKey)
        }
    }
}
