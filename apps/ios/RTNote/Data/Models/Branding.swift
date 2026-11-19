import Foundation

/// Server branding as returned by `GET /api/public/branding` and `GET /api/v1/branding`.
/// Mirrors `ResolvedBranding` in `packages/shared/src/branding.ts`.
///
/// Decoding is lenient: a missing or invalid field falls back to the built-in RTNote
/// default, so an older or newer server can never break the app shell.
struct ResolvedBranding: Codable, Equatable, Sendable {
    static let defaultName = "RTNote"
    static let nameMaxLength = 48
    static let footerTextMaxLength = 280
    static let footerLinkLimit = 6
    /// Default light accent of the server palette. The iOS app keeps its own green for it.
    static let defaultAccentHex = "#b5501b"

    var name: String
    /// Light-mode logo: a server-relative path (`/api/public/branding/assets/…`), an
    /// https URL, or "" for the built-in mark.
    var logoUrl: String
    /// Dark-mode logo; falls back to the light logo.
    var logoDarkUrl: String
    var faviconUrl: String
    /// Light-mode accent, `#rrggbb`.
    var color: String
    var colors: BrandColors
    var fonts: BrandFonts
    var footer: BrandFooter
    /// True when anything differs from the built-in RTNote branding.
    var isCustom: Bool

    static let `default` = ResolvedBranding(
        name: defaultName,
        logoUrl: "",
        logoDarkUrl: "",
        faviconUrl: "",
        color: defaultAccentHex,
        colors: .default,
        fonts: .default,
        footer: .empty,
        isCustom: false
    )

    init(
        name: String,
        logoUrl: String,
        logoDarkUrl: String,
        faviconUrl: String,
        color: String,
        colors: BrandColors,
        fonts: BrandFonts,
        footer: BrandFooter,
        isCustom: Bool
    ) {
        self.name = name
        self.logoUrl = logoUrl
        self.logoDarkUrl = logoDarkUrl
        self.faviconUrl = faviconUrl
        self.color = color
        self.colors = colors
        self.fonts = fonts
        self.footer = footer
        self.isCustom = isCustom
    }

    private enum CodingKeys: String, CodingKey {
        case name, logoUrl, logoDarkUrl, faviconUrl, color, colors, fonts, footer, isCustom
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        func string(_ key: CodingKeys) -> String? {
            (try? container.decodeIfPresent(String.self, forKey: key)) ?? nil
        }

        let name = Self.sanitizeName(string(.name))
        let logoUrl = Self.sanitizeAssetURL(string(.logoUrl))
        let logoDarkUrl = Self.sanitizeAssetURL(string(.logoDarkUrl)).nonEmpty ?? logoUrl
        let faviconUrl = Self.sanitizeAssetURL(string(.faviconUrl)).nonEmpty ?? logoUrl
        let colors = ((try? container.decodeIfPresent(BrandColors.self, forKey: .colors)) ?? nil) ?? .default
        let fonts = ((try? container.decodeIfPresent(BrandFonts.self, forKey: .fonts)) ?? nil) ?? .default
        let footer = ((try? container.decodeIfPresent(BrandFooter.self, forKey: .footer)) ?? nil) ?? .empty
        let serverCustom = ((try? container.decodeIfPresent(Bool.self, forKey: .isCustom)) ?? nil) ?? false

        self.name = name
        self.logoUrl = logoUrl
        self.logoDarkUrl = logoDarkUrl
        self.faviconUrl = faviconUrl
        // `color` is always the light accent, as on the server.
        self.color = colors.light.accent
        self.colors = colors
        self.fonts = fonts
        self.footer = footer
        self.isCustom = false
        // Trust the server when it says custom (it may know fields this client does not),
        // and recompute locally so a cache or a buggy payload cannot hide a change.
        self.isCustom = serverCustom || !matchesBuiltInDefault
    }

    /// Same rule as `isDefaultResolvedBranding` on the server.
    var matchesBuiltInDefault: Bool {
        name == Self.defaultName
            && logoUrl.isEmpty && logoDarkUrl.isEmpty && faviconUrl.isEmpty
            && colors == .default
            && fonts == .default
            && footer.text.isEmpty && footer.links.isEmpty
    }

    /// Resolves the logo for the given appearance against the server base URL.
    func logoURL(dark: Bool, baseURL: URL?) -> URL? {
        let raw = dark ? (logoDarkUrl.nonEmpty ?? logoUrl) : logoUrl
        return Self.resolveAssetURL(raw, baseURL: baseURL)
    }

    static func resolveAssetURL(_ raw: String, baseURL: URL?) -> URL? {
        guard !raw.isEmpty else { return nil }
        if raw.hasPrefix("/") {
            guard let baseURL else { return nil }
            let base = baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            return URL(string: base + raw)
        }
        return URL(string: raw)
    }

    // MARK: - Sanitizing

    static func sanitizeName(_ raw: String?) -> String {
        guard let raw else { return defaultName }
        let space = Unicode.Scalar(UInt8(0x20))
        var scalars = String.UnicodeScalarView()
        for scalar in raw.unicodeScalars {
            scalars.append((scalar.value < 0x20 || scalar.value == 0x7F) ? space : scalar)
        }
        let withoutControls = String(scalars)
        let collapsed = withoutControls
            .split(whereSeparator: { $0.isWhitespace })
            .joined(separator: " ")
        let limited = String(collapsed.prefix(nameMaxLength))
        return limited.isEmpty ? defaultName : limited
    }

    /// Accepts only server asset paths and https URLs, like `coerceResolvedBranding`.
    static func sanitizeAssetURL(_ raw: String?) -> String {
        guard let raw else { return "" }
        if raw.hasPrefix("/api/public/branding/assets/") {
            return raw.contains(where: { $0.isWhitespace }) ? "" : raw
        }
        return isSafeHTTPSURL(raw) ? raw : ""
    }

    static func isSafeHTTPSURL(_ raw: String) -> Bool {
        guard raw.lowercased().hasPrefix("https://"),
              !raw.contains(where: { $0.isWhitespace || "\"'<>\\".contains($0) }),
              let components = URLComponents(string: raw),
              let host = components.host, !host.isEmpty,
              components.user == nil, components.password == nil
        else { return false }
        return true
    }
}

struct BrandColorScheme: Codable, Equatable, Sendable {
    var background: String
    var surface: String
    var sidebar: String
    var text: String
    var border: String
    var accent: String

    static let defaultLight = BrandColorScheme(
        background: "#f4efe6", surface: "#fbf8f2", sidebar: "#ece5d8",
        text: "#2b2620", border: "#e2d9c9", accent: ResolvedBranding.defaultAccentHex
    )
    static let defaultDark = BrandColorScheme(
        background: "#1a1714", surface: "#26221d", sidebar: "#1f1b17",
        text: "#ece4d6", border: "#3a332b", accent: "#d9692c"
    )

    init(background: String, surface: String, sidebar: String, text: String, border: String, accent: String) {
        self.background = background
        self.surface = surface
        self.sidebar = sidebar
        self.text = text
        self.border = border
        self.accent = accent
    }

    private enum CodingKeys: String, CodingKey {
        case background, surface, sidebar, text, border, accent
    }

    /// Decodes against light defaults; `BrandColors` re-applies the right mode's defaults.
    init(from decoder: Decoder) throws {
        try self.init(from: decoder, defaults: .defaultLight)
    }

    init(from decoder: Decoder, defaults: BrandColorScheme) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        func hex(_ key: CodingKeys, _ fallback: String) -> String {
            let raw = (try? container.decodeIfPresent(String.self, forKey: key)) ?? nil
            return BrandHex.normalize(raw) ?? fallback
        }
        self.background = hex(.background, defaults.background)
        self.surface = hex(.surface, defaults.surface)
        self.sidebar = hex(.sidebar, defaults.sidebar)
        self.text = hex(.text, defaults.text)
        self.border = hex(.border, defaults.border)
        self.accent = hex(.accent, defaults.accent)
    }
}

struct BrandColors: Codable, Equatable, Sendable {
    var light: BrandColorScheme
    var dark: BrandColorScheme

    static let `default` = BrandColors(light: .defaultLight, dark: .defaultDark)

    init(light: BrandColorScheme, dark: BrandColorScheme) {
        self.light = light
        self.dark = dark
    }

    private enum CodingKeys: String, CodingKey { case light, dark }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.light = Self.scheme(container, .light, defaults: .defaultLight)
        self.dark = Self.scheme(container, .dark, defaults: .defaultDark)
    }

    private static func scheme(
        _ container: KeyedDecodingContainer<CodingKeys>,
        _ key: CodingKeys,
        defaults: BrandColorScheme
    ) -> BrandColorScheme {
        guard let nested = try? container.superDecoder(forKey: key),
              let scheme = try? BrandColorScheme(from: nested, defaults: defaults)
        else { return defaults }
        return scheme
    }
}

struct BrandFonts: Codable, Equatable, Sendable {
    static let knownIds: Set<String> = ["system", "sans", "serif", "rounded", "slab", "mono"]

    var heading: String
    var body: String

    static let `default` = BrandFonts(heading: "system", body: "system")

    init(heading: String, body: String) {
        self.heading = heading
        self.body = body
    }

    private enum CodingKeys: String, CodingKey { case heading, body }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        func font(_ key: CodingKeys) -> String {
            let raw = (try? container.decodeIfPresent(String.self, forKey: key)) ?? nil
            guard let raw, Self.knownIds.contains(raw) else { return "system" }
            return raw
        }
        self.heading = font(.heading)
        self.body = font(.body)
    }
}

struct BrandFooterLink: Codable, Equatable, Sendable {
    var label: String
    var url: String
}

struct BrandFooter: Codable, Equatable, Sendable {
    var text: String
    var links: [BrandFooterLink]

    static let empty = BrandFooter(text: "", links: [])

    init(text: String, links: [BrandFooterLink]) {
        self.text = text
        self.links = links
    }

    private enum CodingKeys: String, CodingKey { case text, links }

    private struct LooseLink: Decodable {
        var label: String?
        var url: String?
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let text = ((try? container.decodeIfPresent(String.self, forKey: .text)) ?? nil) ?? ""
        let rawLinks = ((try? container.decodeIfPresent([LooseLink].self, forKey: .links)) ?? nil) ?? []
        self.text = String(text.prefix(ResolvedBranding.footerTextMaxLength))
        self.links = rawLinks.compactMap { link -> BrandFooterLink? in
            guard let label = link.label, let url = link.url, ResolvedBranding.isSafeHTTPSURL(url) else { return nil }
            return BrandFooterLink(label: label, url: url)
        }
        .prefix(ResolvedBranding.footerLinkLimit)
        .map { $0 }
    }
}

/// `GET /api/public/branding`.
struct PublicBrandingResponse: Decodable, Sendable {
    var branding: ResolvedBranding
}

/// `GET /api/v1/branding`. Only the resolved results are read; the editable
/// instance/workspace settings stay a web feature.
struct WorkspaceBrandingResponse: Decodable, Sendable {
    var effective: ResolvedBranding
    var instanceEffective: ResolvedBranding?

    private enum CodingKeys: String, CodingKey { case effective, instanceEffective }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.effective = try container.decode(ResolvedBranding.self, forKey: .effective)
        self.instanceEffective = (try? container.decodeIfPresent(ResolvedBranding.self, forKey: .instanceEffective)) ?? nil
    }
}

enum BrandHex {
    /// `#abc` / `#AABBCC` → `#aabbcc`; anything else → nil.
    static func normalize(_ raw: String?) -> String? {
        guard let raw else { return nil }
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard value.hasPrefix("#") else { return nil }
        var digits = String(value.dropFirst())
        let allowed = Set("0123456789abcdef")
        guard digits.allSatisfy({ allowed.contains($0) }) else { return nil }
        if digits.count == 3 {
            digits = digits.map { "\($0)\($0)" }.joined()
        }
        guard digits.count == 6 else { return nil }
        return "#\(digits)"
    }

    /// `#rrggbb` → `0xRRGGBB`.
    static func value(_ hex: String) -> UInt32? {
        guard let normalized = normalize(hex) else { return nil }
        return UInt32(normalized.dropFirst(), radix: 16)
    }
}

private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
}
