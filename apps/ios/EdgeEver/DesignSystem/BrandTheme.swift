import Observation
import SwiftUI

/// A light/dark pair of `0xRRGGBB` values.
struct HexPair: Equatable, Sendable {
    var light: UInt32
    var dark: UInt32

    init(_ light: UInt32, _ dark: UInt32) {
        self.light = light
        self.dark = dark
    }

    var color: Color { Color(light: light, dark: dark) }
}

/// The accent family of `AppTheme`. `standard` holds today's exact values; a custom
/// branding accent derives the whole family from the branding light/dark accents.
struct AccentPalette: Equatable, Sendable {
    var accent: HexPair
    var accentStrong: HexPair
    var accentBright: HexPair
    var accentSoft: HexPair
    var accentBorder: HexPair
    var accentText: HexPair
    var accentAction: HexPair
    /// Filled primary button behind white text (login button).
    var primaryFill: HexPair
    var searchActiveFill: HexPair
    var syncProgressTrack: HexPair
    var syncProgressFill: HexPair
    var fabShadow: HexPair

    /// True when this palette came from a custom branding accent.
    var isCustom: Bool

    static let standard = AccentPalette(
        accent: HexPair(0x059669, 0x34D399),
        accentStrong: HexPair(0x047857, 0x6EE7B7),
        accentBright: HexPair(0x10B981, 0x34D399),
        accentSoft: HexPair(0xECFDF5, 0x064E3B),
        accentBorder: HexPair(0xA7F3D0, 0x047857),
        accentText: HexPair(0x065F46, 0xA7F3D0),
        accentAction: HexPair(0x059669, 0x047857),
        primaryFill: HexPair(0x047857, 0x047857),
        searchActiveFill: HexPair(0xECFDF5, 0x064E3B),
        syncProgressTrack: HexPair(0xD1FAE5, 0x065F46),
        syncProgressFill: HexPair(0x059669, 0x34D399),
        fabShadow: HexPair(0x10B981, 0x34D399),
        isCustom: false
    )

    /// Default branding (or a custom branding that keeps the stock accent) keeps
    /// `standard` unchanged; any other accent derives a new family.
    static func forBranding(_ branding: ResolvedBranding) -> AccentPalette {
        let defaultAccent = ResolvedBranding.defaultAccentHex
        guard branding.isCustom,
              branding.colors.light.accent != defaultAccent || branding.colors.dark.accent != defaultAccent,
              let light = BrandHex.value(branding.colors.light.accent),
              let dark = BrandHex.value(branding.colors.dark.accent)
        else { return .standard }
        return derived(light: light, dark: dark)
    }

    static func derived(light: UInt32, dark: UInt32) -> AccentPalette {
        let white: UInt32 = 0xFFFFFF
        let black: UInt32 = 0x000000
        // Dark surfaces of AppTheme (card dark), so soft fills sit in the app's dark palette.
        let darkSurface: UInt32 = 0x0F172A
        let l = light
        let d = dark
        let lightStrong = BrandColorMath.mix(l, black, 0.2)
        let lightSoft = BrandColorMath.mix(white, l, 0.08)
        let darkSoft = BrandColorMath.mix(darkSurface, d, 0.3)
        return AccentPalette(
            accent: HexPair(l, d),
            accentStrong: HexPair(lightStrong, BrandColorMath.mix(d, white, 0.3)),
            accentBright: HexPair(BrandColorMath.mix(l, white, 0.15), d),
            accentSoft: HexPair(lightSoft, darkSoft),
            accentBorder: HexPair(BrandColorMath.mix(white, l, 0.35), BrandColorMath.mix(darkSurface, d, 0.6)),
            accentText: HexPair(BrandColorMath.mix(l, black, 0.4), BrandColorMath.mix(d, white, 0.55)),
            accentAction: HexPair(
                BrandColorMath.darkened(l, toLuminanceAtMost: 0.3),
                BrandColorMath.darkened(BrandColorMath.mix(d, black, 0.25), toLuminanceAtMost: 0.2)
            ),
            primaryFill: HexPair(
                BrandColorMath.darkened(lightStrong, toLuminanceAtMost: 0.2),
                BrandColorMath.darkened(BrandColorMath.mix(d, black, 0.3), toLuminanceAtMost: 0.2)
            ),
            searchActiveFill: HexPair(lightSoft, darkSoft),
            syncProgressTrack: HexPair(BrandColorMath.mix(white, l, 0.18), BrandColorMath.mix(darkSurface, d, 0.45)),
            syncProgressFill: HexPair(l, d),
            fabShadow: HexPair(BrandColorMath.mix(l, white, 0.15), d),
            isCustom: true
        )
    }
}

enum BrandColorMath {
    /// Linear sRGB mix: `amountOfB` = 0 → a, 1 → b.
    static func mix(_ a: UInt32, _ b: UInt32, _ amountOfB: Double) -> UInt32 {
        let t = min(1, max(0, amountOfB))
        func channel(_ shift: UInt32) -> UInt32 {
            let ca = Double((a >> shift) & 0xFF)
            let cb = Double((b >> shift) & 0xFF)
            let value = (ca + (cb - ca) * t).rounded()
            return UInt32(min(255, max(0, value))) << shift
        }
        return channel(16) | channel(8) | channel(0)
    }

    /// WCAG relative luminance (0…1).
    static func luminance(_ hex: UInt32) -> Double {
        func linear(_ shift: UInt32) -> Double {
            let c = Double((hex >> shift) & 0xFF) / 255
            return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * linear(16) + 0.7152 * linear(8) + 0.0722 * linear(0)
    }

    /// Mixes towards black until white text reads on it (a light accent would
    /// otherwise make white button labels unreadable).
    static func darkened(_ hex: UInt32, toLuminanceAtMost limit: Double) -> UInt32 {
        var value = hex
        var amount = 0.0
        while luminance(value) > limit, amount < 0.9 {
            amount += 0.1
            value = mix(hex, 0x000000, amount)
        }
        return value
    }
}

/// Process-wide current accent family. `AppTheme`'s accent tokens read it, and since it
/// is `@Observable`, every view body that used one re-renders when branding changes.
/// Written only on the main actor (by `BrandingStore`).
@Observable
final class BrandThemeState: @unchecked Sendable {
    static let shared = BrandThemeState()

    private(set) var palette: AccentPalette = .standard
    private(set) var colors = AccentColors(.standard)

    func apply(_ next: AccentPalette) {
        guard next != palette else { return }
        palette = next
        colors = AccentColors(next)
    }
}

/// Resolved SwiftUI colours of an `AccentPalette`, built once per change.
struct AccentColors {
    let accent: Color
    let accentStrong: Color
    let accentBright: Color
    let accentSoft: Color
    let accentBorder: Color
    let accentText: Color
    let accentAction: Color
    let primaryFill: Color
    let searchActiveFill: Color
    let syncProgressTrack: Color
    let syncProgressFill: Color
    let fabShadow: Color
    /// `.tint` for system controls; nil keeps the asset-catalog AccentColor.
    let tint: Color?

    init(_ palette: AccentPalette) {
        accent = palette.accent.color
        accentStrong = palette.accentStrong.color
        accentBright = palette.accentBright.color
        accentSoft = palette.accentSoft.color
        accentBorder = palette.accentBorder.color
        accentText = palette.accentText.color
        accentAction = palette.accentAction.color
        primaryFill = palette.primaryFill.color
        searchActiveFill = palette.searchActiveFill.color
        syncProgressTrack = palette.syncProgressTrack.color
        syncProgressFill = palette.syncProgressFill.color
        fabShadow = palette.fabShadow.color.opacity(0.28)
        tint = palette.isCustom ? palette.accent.color : nil
    }
}
