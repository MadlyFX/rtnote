import SwiftUI

/// The branding logo (light or dark variant for the current appearance). Shows
/// `fallback` (the built-in mark) when there is no custom logo, while it loads, and
/// when it fails to load.
struct BrandLogoView<Fallback: View>: View {
    let branding: BrandingStore
    var size: CGFloat = 48
    @ViewBuilder var fallback: () -> Fallback

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        if let url = branding.logoURL(dark: colorScheme == .dark) {
            AsyncImage(url: url) { phase in
                if let image = phase.image {
                    image
                        .resizable()
                        .interpolation(.high)
                        .scaledToFit()
                        .frame(width: size, height: size)
                        .clipShape(RoundedRectangle(cornerRadius: size * 0.29, style: .continuous))
                } else {
                    fallback()
                }
            }
            .frame(width: size, height: size)
            .id(url)
            .accessibilityLabel(branding.name)
        } else {
            fallback()
        }
    }
}
