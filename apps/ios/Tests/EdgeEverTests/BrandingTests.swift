import XCTest
@testable import EdgeEver

final class BrandingTests: XCTestCase {
    private func decode(_ json: String) throws -> ResolvedBranding {
        try EdgeEverJSON.decoder.decode(ResolvedBranding.self, from: Data(json.utf8))
    }

    // MARK: - Lenient decoding

    func testEmptyObjectDecodesToDefaults() throws {
        let branding = try decode("{}")
        XCTAssertEqual(branding, .default)
        XCTAssertFalse(branding.isCustom)
        XCTAssertEqual(branding.name, "RTNote")
        XCTAssertEqual(branding.color, "#16a06e")
        XCTAssertEqual(branding.colors.dark.background, "#121315")
    }

    func testFullDefaultPayloadDecodesToDefaults() throws {
        let branding = try decode("""
        {"name":"RTNote","logoUrl":"","logoDarkUrl":"","faviconUrl":"","color":"#16a06e","colors":{"light":{"background":"#eef1f4","surface":"#f8fafb","sidebar":"#e7ebef","text":"#212121","border":"#e1e5ea","accent":"#16a06e"},"dark":{"background":"#121315","surface":"#222325","sidebar":"#17181a","text":"#dedede","border":"#323437","accent":"#16a06e"}},"fonts":{"heading":"system","body":"system"},"footer":{"text":"","links":[]},"isCustom":false}
        """)
        XCTAssertEqual(branding, .default)
    }

    func testCustomPayloadDecodes() throws {
        let branding = try decode("""
        {"name":"Acme Notes","logoUrl":"/api/public/branding/assets/bra_abc123","logoDarkUrl":"","colors":{"light":{"accent":"#2563EB"},"dark":{"accent":"#60a5fa"}},"fonts":{"heading":"serif","body":"mono"},"footer":{"text":"Hi","links":[{"label":"Site","url":"https://acme.example"}]},"isCustom":true,"futureField":{"x":1}}
        """)
        XCTAssertEqual(branding.name, "Acme Notes")
        XCTAssertEqual(branding.logoUrl, "/api/public/branding/assets/bra_abc123")
        // Dark logo falls back to the light logo.
        XCTAssertEqual(branding.logoDarkUrl, branding.logoUrl)
        XCTAssertEqual(branding.colors.light.accent, "#2563eb")
        XCTAssertEqual(branding.color, "#2563eb")
        XCTAssertEqual(branding.colors.dark.accent, "#60a5fa")
        // Missing tokens keep the defaults of their own mode.
        XCTAssertEqual(branding.colors.light.background, "#eef1f4")
        XCTAssertEqual(branding.colors.dark.background, "#121315")
        XCTAssertEqual(branding.fonts, BrandFonts(heading: "serif", body: "mono"))
        XCTAssertEqual(branding.footer.links, [BrandFooterLink(label: "Site", url: "https://acme.example")])
        XCTAssertTrue(branding.isCustom)
    }

    func testInvalidValuesFallBackToDefaults() throws {
        let branding = try decode("""
        {"name":42,"logoUrl":"javascript:alert(1)","logoDarkUrl":"http://insecure.example/logo.png","colors":{"light":{"accent":"green","background":"#12345","text":"#abc"},"dark":"nope"},"fonts":{"heading":"comic-sans","body":7},"footer":{"text":5,"links":[{"label":"x","url":"http://insecure.example"}]},"isCustom":"yes"}
        """)
        XCTAssertEqual(branding.name, "RTNote")
        XCTAssertEqual(branding.logoUrl, "")
        XCTAssertEqual(branding.logoDarkUrl, "")
        XCTAssertEqual(branding.colors.light.accent, "#16a06e")
        XCTAssertEqual(branding.colors.light.background, "#eef1f4")
        // Three-digit hex expands like the server schema does.
        XCTAssertEqual(branding.colors.light.text, "#aabbcc")
        XCTAssertEqual(branding.colors.dark, BrandColorScheme.defaultDark)
        XCTAssertEqual(branding.fonts, .default)
        XCTAssertEqual(branding.footer, .empty)
        // Only the text colour differs from the default.
        XCTAssertTrue(branding.isCustom)
    }

    func testNameIsSanitized() throws {
        XCTAssertEqual(try decode(#"{"name":"  Acme\n\tNotes  "}"#).name, "Acme Notes")
        XCTAssertEqual(try decode(#"{"name":"   "}"#).name, "RTNote")
        XCTAssertEqual(try decode("{\"name\":\"\(String(repeating: "a", count: 60))\"}").name.count, 48)
    }

    func testIsCustomIsRecomputedWhenServerOmitsIt() throws {
        XCTAssertTrue(try decode(#"{"name":"Acme"}"#).isCustom)
        XCTAssertFalse(try decode(#"{"name":"RTNote"}"#).isCustom)
    }

    func testEnvelopes() throws {
        let publicResponse = try EdgeEverJSON.decoder.decode(PublicBrandingResponse.self, from: Data("""
        {"branding":{"name":"Acme"}}
        """.utf8))
        XCTAssertEqual(publicResponse.branding.name, "Acme")

        let workspace = try EdgeEverJSON.decoder.decode(WorkspaceBrandingResponse.self, from: Data("""
        {"instance":{},"workspace":{},"effective":{"name":"Team"},"instanceEffective":{"name":"Acme"},"permissions":{"canEditInstance":false},"notebooks":[]}
        """.utf8))
        XCTAssertEqual(workspace.effective.name, "Team")
        XCTAssertEqual(workspace.instanceEffective?.name, "Acme")
    }

    func testCacheRoundTrip() throws {
        let original = try decode(##"{"name":"Acme","colors":{"light":{"accent":"#2563eb"}}}"##)
        let data = try JSONEncoder().encode(original)
        XCTAssertEqual(try JSONDecoder().decode(ResolvedBranding.self, from: data), original)
    }

    func testLogoURLResolvesAgainstBase() throws {
        let branding = try decode(#"{"logoUrl":"/api/public/branding/assets/bra_light1","logoDarkUrl":"/api/public/branding/assets/bra_dark01"}"#)
        let base = URL(string: "https://notes.example/")!
        XCTAssertEqual(branding.logoURL(dark: false, baseURL: base)?.absoluteString, "https://notes.example/api/public/branding/assets/bra_light1")
        XCTAssertEqual(branding.logoURL(dark: true, baseURL: base)?.absoluteString, "https://notes.example/api/public/branding/assets/bra_dark01")
        XCTAssertNil(branding.logoURL(dark: false, baseURL: nil))
        XCTAssertNil(ResolvedBranding.default.logoURL(dark: false, baseURL: base))
    }

    // MARK: - Accent mapping

    func testStandardPaletteKeepsTodaysValues() {
        let standard = AccentPalette.standard
        XCTAssertEqual(standard.accent, HexPair(0x059669, 0x34D399))
        XCTAssertEqual(standard.accentStrong, HexPair(0x047857, 0x6EE7B7))
        XCTAssertEqual(standard.accentBright, HexPair(0x10B981, 0x34D399))
        XCTAssertEqual(standard.accentSoft, HexPair(0xECFDF5, 0x064E3B))
        XCTAssertEqual(standard.accentBorder, HexPair(0xA7F3D0, 0x047857))
        XCTAssertEqual(standard.accentText, HexPair(0x065F46, 0xA7F3D0))
        XCTAssertEqual(standard.accentAction, HexPair(0x059669, 0x047857))
        XCTAssertEqual(standard.primaryFill, HexPair(0x047857, 0x047857))
        XCTAssertEqual(standard.searchActiveFill, HexPair(0xECFDF5, 0x064E3B))
        XCTAssertEqual(standard.syncProgressTrack, HexPair(0xD1FAE5, 0x065F46))
        XCTAssertEqual(standard.syncProgressFill, HexPair(0x059669, 0x34D399))
        XCTAssertEqual(standard.fabShadow, HexPair(0x10B981, 0x34D399))
        XCTAssertFalse(standard.isCustom)
    }

    func testDefaultBrandingKeepsStandardPalette() throws {
        XCTAssertEqual(AccentPalette.forBranding(.default), .standard)
        XCTAssertEqual(AccentPalette.forBranding(try decode("{}")), .standard)
        // Custom name/logo with the stock accent: colours stay exactly as today.
        let renamed = try decode(#"{"name":"Acme","isCustom":true}"#)
        XCTAssertTrue(renamed.isCustom)
        XCTAssertEqual(AccentPalette.forBranding(renamed), .standard)
    }

    func testCustomAccentDerivesPalette() throws {
        let branding = try decode(##"{"colors":{"light":{"accent":"#2563eb"},"dark":{"accent":"#60a5fa"}}}"##)
        let palette = AccentPalette.forBranding(branding)
        XCTAssertTrue(palette.isCustom)
        XCTAssertEqual(palette.accent, HexPair(0x2563EB, 0x60A5FA))
        XCTAssertEqual(palette.syncProgressFill, palette.accent)
        XCTAssertNotEqual(palette.accentSoft, AccentPalette.standard.accentSoft)
        // Filled buttons stay dark enough for white labels.
        XCTAssertLessThanOrEqual(BrandColorMath.luminance(palette.primaryFill.light), 0.2)
        XCTAssertLessThanOrEqual(BrandColorMath.luminance(palette.primaryFill.dark), 0.2)
        XCTAssertLessThanOrEqual(BrandColorMath.luminance(palette.accentAction.dark), 0.2)
    }

    func testLightAccentIsDarkenedForButtons() {
        let palette = AccentPalette.derived(light: 0xD4D4D4, dark: 0xD4D4D4)
        XCTAssertLessThanOrEqual(BrandColorMath.luminance(palette.primaryFill.light), 0.2)
        XCTAssertLessThanOrEqual(BrandColorMath.luminance(palette.accentAction.light), 0.3)
    }

    func testColorMath() {
        XCTAssertEqual(BrandColorMath.mix(0x000000, 0xFFFFFF, 0), 0x000000)
        XCTAssertEqual(BrandColorMath.mix(0x000000, 0xFFFFFF, 1), 0xFFFFFF)
        XCTAssertEqual(BrandColorMath.mix(0x000000, 0xFFFFFF, 0.5), 0x808080)
        XCTAssertEqual(BrandHex.value("#16a06e"), 0x16A06E)
        XCTAssertNil(BrandHex.value("16a06e"))
        XCTAssertEqual(BrandHex.normalize(" #ABC "), "#aabbcc")
        XCTAssertNil(BrandHex.normalize("#ggg"))
    }

    // MARK: - Store

    @MainActor
    func testStoreCachesWorkspaceBrandingAndResets() throws {
        let suite = "rtnote.tests.branding.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }

        let cachedBranding = try decode(##"{"name":"Acme","colors":{"light":{"accent":"#2563eb"}}}"##)
        struct Cached: Encodable { var baseUrl: String; var branding: ResolvedBranding }
        defaults.set(
            try JSONEncoder().encode(Cached(baseUrl: "https://notes.example", branding: cachedBranding)),
            forKey: BrandingStore.cacheKey
        )

        let store = BrandingStore(defaults: defaults)
        XCTAssertEqual(store.branding, cachedBranding)
        XCTAssertEqual(store.source, .workspace)
        XCTAssertEqual(store.baseURL?.absoluteString, "https://notes.example")
        XCTAssertTrue(BrandThemeState.shared.palette.isCustom)

        store.sessionEnded()
        XCTAssertEqual(store.branding, .default)
        XCTAssertEqual(store.source, .builtIn)
        XCTAssertNil(defaults.data(forKey: BrandingStore.cacheKey))
        XCTAssertEqual(BrandThemeState.shared.palette, .standard)
    }
}
