import SwiftUI
import WebKit

@MainActor
enum NoteImageFontPickerOptions {
    static func choices(_ preferences: PreferencesStore) -> [(id: String, label: String)] {
        [
            ("auto", preferences.t("Follow Theme", zh: "跟随主题", pl: "Zgodnie z motywem") + " (" + themeLabel(preferences) + ")"),
            ("kai", preferences.t("Handwritten Kai", zh: "文楷手书", pl: "Pismo odręczne Kai")),
            ("serif", preferences.t("Serif", zh: "文艺衬线", pl: "Szeryfowa")),
            ("sans", preferences.t("Sans", zh: "现代无衬线", pl: "Bezszeryfowa")),
            ("mono", preferences.t("Mono", zh: "极客等宽", pl: "Monospace")),
        ] + NoteImageFontCatalog.choices.map { ($0.id, preferences.t($0.en, zh: $0.zh, pl: $0.en)) }
    }

    private static func themeLabel(_ preferences: PreferencesStore) -> String {
        guard let labels = NoteImageFontCatalog.templateLabels[preferences.noteImageShare.theme] else { return "" }
        return preferences.t(labels.en, zh: labels.zh, ja: labels.ja, pl: labels.pl)
    }

    static func label(_ preferences: PreferencesStore) -> String {
        if preferences.noteImageShare.fontStyle == "auto" { return themeLabel(preferences) }
        return choices(preferences).first { $0.id == preferences.noteImageShare.fontStyle }?.label ?? ""
    }
}

struct NoteImageFontPickerView: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var loading = true
    @State private var failed = false
    @State private var attempt = 0

    var body: some View {
        ZStack {
            if let url = NoteImageFontPickerWebView.packagedHTMLURL() {
                NoteImageFontPickerWebView(
                    url: url,
                    configuration: configuration,
                    onReady: { loading = false },
                    onFailure: { loading = false; failed = true },
                    onSelect: { id in
                        env.preferences.noteImageShare.fontStyle = id
                        dismiss()
                    }
                )
                .id(attempt)
                .opacity(failed ? 0 : 1)
                if loading { ProgressView() }
                if failed {
                    ContentUnavailableView {
                        Label(env.preferences.t("Failed to load", zh: "加载失败", pl: "Nie udało się wczytać"), systemImage: "exclamationmark.triangle")
                    } actions: {
                        Button(env.preferences.t("Retry", zh: "重试", pl: "Spróbuj ponownie")) {
                            failed = false
                            loading = true
                            attempt += 1
                        }
                    }
                }
            } else {
                ContentUnavailableView(env.preferences.t("Failed to load", zh: "加载失败", pl: "Nie udało się wczytać"), systemImage: "exclamationmark.triangle")
            }
        }
        .navigationTitle(env.preferences.t("Typography", zh: "字体风格", pl: "Typografia"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private var configuration: [String: Any] {
        let preferences = env.preferences
        return [
            "selected": preferences.noteImageShare.fontStyle,
            "theme": preferences.noteImageShare.theme,
            "dark": colorScheme == .dark,
            "title": preferences.t("Typography", zh: "字体风格", pl: "Typografia"),
            "sample": preferences.t("Capture a little inspiration", zh: "记录此刻的灵感", ja: "今この瞬間のひらめきを記録", pl: "Zapisz chwilę inspiracji"),
            "latinSample": "Capture a little inspiration",
            "loading": preferences.t("Loading preview…", zh: "正在加载示例…", ja: "プレビューを読み込み中…", pl: "Ładowanie podglądu…"),
            "unavailable": preferences.t("Preview unavailable; you can still select this font", zh: "示例暂不可用，仍可选择", ja: "プレビューを表示できませんが、選択できます", pl: "Podgląd niedostępny; nadal możesz wybrać tę czcionkę"),
            "options": NoteImageFontPickerOptions.choices(preferences).map { ["id": $0.id, "label": $0.label] },
        ]
    }
}

struct NoteImageFontPickerWebView: UIViewRepresentable {
    let url: URL
    let configuration: [String: Any]
    let onReady: () -> Void
    let onFailure: () -> Void
    let onSelect: (String) -> Void

    static func packagedHTMLURL() -> URL? {
        Bundle.main.url(forResource: "font-picker", withExtension: "html", subdirectory: "EditorBundle")
            ?? Bundle.main.url(forResource: "font-picker", withExtension: "html")
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.mediaTypesRequiringUserActionForPlayback = .all
        config.userContentController.add(context.coordinator, name: "fontPicker")
        if let data = try? JSONSerialization.data(withJSONObject: configuration),
           let json = String(data: data, encoding: .utf8) {
            config.userContentController.addUserScript(WKUserScript(
                source: "window.EdgeEverFontPickerConfiguration = \(json);",
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            ))
        }
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        context.coordinator.parent = self
    }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.stopLoading()
        uiView.navigationDelegate = nil
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "fontPicker")
    }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        var parent: NoteImageFontPickerWebView
        init(_ parent: NoteImageFontPickerWebView) { self.parent = parent }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, let body = message.body as? [String: String] else { return }
            switch body["type"] {
            case "ready": parent.onReady()
            case "select":
                guard let id = body["id"],
                      let choices = parent.configuration["options"] as? [[String: String]],
                      choices.contains(where: { $0["id"] == id }) else { return }
                parent.onSelect(id)
            default: break
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { parent.onFailure() }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { parent.onFailure() }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { parent.onFailure() }
    }
}
