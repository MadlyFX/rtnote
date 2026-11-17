import SwiftUI

struct RootView: View {
    @Environment(AppEnvironment.self) private var env

    var body: some View {
        Group {
            if env.session.isLoading {
                ProgressView(env.preferences.t("启动中…", en: "Starting…", ja: "起動しています…", pl: "Uruchamianie…"))
            } else if env.session.isSignedIn {
                if env.session.isMfaRebindRequired {
                    ForcedTotpRebindView()
                } else {
                    WorkspaceView()
                }
            } else {
                LoginView()
            }
        }
        // System controls follow a custom branding accent; nil keeps the asset AccentColor.
        .tint(AppTheme.brandTint)
        // Re-evaluates branding whenever the session appears, ends or changes server/user.
        .task(id: brandingSessionKey) {
            await env.refreshBranding(force: true)
        }
        .task {
            await env.bootstrap()
            await AutoLogin.attemptIfConfigured(env: env)
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
            Task {
                if env.session.isSignedIn {
                    await env.runSyncCycle()
                }
            }
            Task {
                // Throttled to one fetch per 5 minutes.
                await env.refreshBranding(force: false)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didEnterBackgroundNotification)) { _ in
            Task {
                if let scope = env.session.dataScope {
                    _ = try? await env.outboxFlusher.flush(scope: scope)
                }
            }
        }
    }

    private var brandingSessionKey: String {
        let store = env.session
        if store.isLoading { return "loading" }
        guard let current = store.session else { return "signed-out" }
        return [
            current.baseUrl,
            current.user?.id ?? "",
            store.isMfaRebindRequired ? "restricted" : "full",
        ].joined(separator: "|")
    }
}
