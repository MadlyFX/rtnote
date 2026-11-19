import SwiftUI

/// Android `WorkspaceSettingsView` parity: full-height "Me" content above the shared bottom navigation.
struct SettingsView: View {
    /// Each UI language's name in that language, as shown in the language menu.
    private static let languageNames = (en: "English", zh: "简体中文", ja: "日本語", pl: "Polski")

    @Environment(AppEnvironment.self) private var env
    @Environment(\.colorScheme) private var colorScheme
    let onClose: () -> Void

    private enum RootTab: Hashable {
        case general
        case account
        case system
        // Extended (not on Android root Me, but reachable from system/account extras)
        case tags
        case tokens
        case devices
        case users
    }

    @State private var tab: RootTab?
    @State private var showLocalePicker = false
    @State private var copiedSystemInfo = false
    @State private var instanceHealth: InstanceHealth?
    @State private var instanceVersion: String?
    @State private var instanceLatencyMilliseconds: Int?
    @State private var instanceDiagnosticsFailed = false

    private var title: String {
        switch tab {
        case .general: return env.preferences.t("General", zh: "常规设置", pl: "Ogólne")
        case .account: return env.preferences.t("Account", zh: "登录设置", pl: "Konto")
        case .system: return env.preferences.t("System info", zh: "系统信息", pl: "Informacje o systemie")
        case .tags: return env.preferences.t("Tags", zh: "标签管理", pl: "Tagi")
        case .tokens: return "API Token"
        case .devices: return env.preferences.t("Devices", zh: "登录设备", pl: "Urządzenia")
        case .users: return env.preferences.t("Users", zh: "用户管理", pl: "Użytkownicy")
        case nil: return env.preferences.t("Me", zh: "我的", pl: "Profil")
        }
    }

    private var headerIcon: String {
        switch tab {
        case .general: return "slider.horizontal.3"
        case .account: return "shield.checkered"
        case .system: return "info.circle"
        case .tags: return "tag"
        case .tokens: return "key"
        case .devices: return "iphone"
        case .users: return "person.2"
        case nil: return "person"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            settingsHeader
            ScrollView {
                Group {
                    if let tab {
                        detailContent(tab)
                            .transition(.opacity.combined(with: .move(edge: .trailing)))
                    } else {
                        rootMenu
                            .transition(.opacity)
                    }
                }
                .padding(16)
                .padding(.bottom, 96)
                .animation(Motion.listContent, value: tab)
            }
            .background(AppTheme.background)
        }
        .background(AppTheme.background.ignoresSafeArea())
        .preferredColorScheme(env.preferences.colorScheme)
        .task(id: tab) {
            guard tab == .system else { return }
            await loadInstanceDiagnostics()
        }
    }

    // MARK: - Header (Android settingsHeader)

    private var settingsHeader: some View {
        HStack(spacing: 0) {
            Button {
                if tab != nil {
                    withAnimation(Motion.chip) { tab = nil }
                } else {
                    onClose()
                }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.secondary)
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)

            HStack(spacing: 8) {
                Image(systemName: headerIcon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(AppTheme.accentStrong)
                Text(title)
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundStyle(AppTheme.title)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, 4)

            Button {
                withAnimation(Motion.chip) {
                    env.preferences.theme = resolvedDarkMode ? "light" : "dark"
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: resolvedDarkMode ? "sun.max" : "moon")
                        .font(.system(size: 16, weight: .semibold))
                    Text(themeToggleLabel)
                        .font(.system(size: 14, weight: .bold))
                        .lineLimit(1)
                }
                .foregroundStyle(AppTheme.slate)
                .padding(.horizontal, 8)
                .frame(height: 36)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 56)
        .background(AppTheme.card)
        .overlay(alignment: .bottom) {
            Rectangle().fill(AppTheme.border).frame(height: 1)
        }
    }

    private var themeToggleLabel: String {
        // Android shows the *action* text: switch to light when dark, else switch to dark
        if resolvedDarkMode {
            return env.preferences.t("Light mode", zh: "切换到浅色模式", pl: "Tryb jasny")
        }
        return env.preferences.t("Dark mode", zh: "切换到深色模式", pl: "Tryb ciemny")
    }

    private var resolvedDarkMode: Bool {
        env.preferences.theme == "dark" || (env.preferences.theme == "system" && colorScheme == .dark)
    }

    // MARK: - Root Me menu (Android activeTab === null)

    private var rootMenu: some View {
        VStack(spacing: 16) {
            // Card 1: general + account
            settingsMenuCard {
                menuRow(
                    icon: "slider.horizontal.3",
                    iconTint: AppTheme.accent,
                    iconBg: AppTheme.accentSoft,
                    title: env.preferences.t("General", zh: "常规设置", pl: "Ogólne"),
                    showBorder: false
                ) {
                    withAnimation(Motion.chip) { tab = .general }
                }
                menuRow(
                    icon: "shield.checkered",
                    iconTint: AppTheme.accent,
                    iconBg: AppTheme.accentSoft,
                    title: env.preferences.t("Account", zh: "登录设置", pl: "Konto"),
                    showBorder: true
                ) {
                    withAnimation(Motion.chip) { tab = .account }
                }
            }

            // Card 2: system + feedback
            settingsMenuCard {
                menuRow(
                    icon: "info.circle",
                    iconTint: AppTheme.accent,
                    iconBg: AppTheme.accentSoft,
                    title: env.preferences.t("System info", zh: "系统信息", pl: "Informacje o systemie"),
                    subtitle: env.preferences.t(
                        "View version and runtime info.",
                        zh: "查看版本与运行环境信息。",
                        pl: "Wyświetl informacje o wersji i środowisku uruchomieniowym."
                    ),
                    showBorder: false
                ) {
                    withAnimation(Motion.chip) { tab = .system }
                }
                menuRow(
                    icon: "bubble.left.and.bubble.right",
                    iconTint: AppTheme.secondary,
                    iconBg: AppTheme.searchFill,
                    title: env.preferences.t("Feedback", zh: "意见反馈", pl: "Opinia"),
                    subtitle: env.preferences.t(
                        "Report issues or suggest features",
                        zh: "报告问题或提出功能建议",
                        pl: "Zgłoś problem lub zaproponuj funkcję"
                    ),
                    trailing: .external,
                    showBorder: true
                ) {
                    if let url = feedbackURL { UIApplication.shared.open(url) }
                }
            }
        }
    }

    private enum TrailingKind { case chevron, external }

    private func settingsMenuCard<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(spacing: 0) {
            content()
        }
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
    }

    private func menuRow(
        icon: String,
        iconTint: Color,
        iconBg: Color,
        title: String,
        subtitle: String? = nil,
        trailing: TrailingKind = .chevron,
        showBorder: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(iconBg)
                        .frame(width: 32, height: 32)
                    Image(systemName: icon)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(iconTint)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(AppTheme.title)
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 12))
                            .foregroundStyle(AppTheme.secondary)
                            .lineLimit(2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: trailing == .external ? "arrow.up.right" : "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(AppTheme.muted)
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 64)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .overlay(alignment: .top) {
            if showBorder {
                Rectangle().fill(AppTheme.cardBorder).frame(height: 1)
                    .padding(.leading, 16)
            }
        }
    }

    // MARK: - Detail tabs

    @ViewBuilder
    private func detailContent(_ tab: RootTab) -> some View {
        switch tab {
        case .general:
            generalContent
        case .account:
            accountContent
        case .system:
            systemContent
        case .tags:
            TagsManagementView()
        case .tokens:
            ApiTokensView()
        case .devices:
            DevicesView()
        case .users:
            UsersManagementView()
        }
    }

    private var generalContent: some View {
        VStack(spacing: 16) {
            settingsGroup(
                title: env.preferences.t("Preferences", zh: "偏好设置", pl: "Preferencje"),
                icon: "photo"
            ) {
                preferenceBlock(
                    title: env.preferences.t("Language", zh: "界面语言", pl: "Język"),
                    description: env.preferences.t("Switch the product UI language.", zh: "切换产品界面的显示语言。", pl: "Zmień język interfejsu aplikacji.")
                ) {
                    Menu {
                        Button(env.preferences.t("System", zh: "跟随系统", ja: "システムに合わせる", pl: "Systemowy")) { env.preferences.localeCode = "system" }
                        Button(Self.languageNames.zh) { env.preferences.localeCode = "zh-CN" }
                        Button(Self.languageNames.en) { env.preferences.localeCode = "en-US" }
                        Button(Self.languageNames.ja) { env.preferences.localeCode = "ja" }
                        Button(Self.languageNames.pl) { env.preferences.localeCode = "pl" }
                    } label: {
                        HStack {
                            Text(localeLabel)
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.title)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(AppTheme.secondary)
                        }
                        .padding(.horizontal, 12)
                        .frame(minHeight: 40)
                        .background(AppTheme.card)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8).stroke(AppTheme.border, lineWidth: 1)
                        )
                    }
                }

                preferenceBlock(
                    title: env.preferences.t("Compress note images", zh: "压缩笔记内图片", pl: "Kompresuj obrazy w notatkach"),
                    description: env.preferences.t(
                        "Compress large images to WebP (max edge 2560) before upload to save storage and bandwidth.",
                        zh: "上传前将大图压缩为 WebP（最长边 2560），节省存储与流量。",
                        pl: "Przed przesłaniem kompresuj duże obrazy do WebP (najdłuższy bok 2560), aby oszczędzać miejsce i transfer."
                    ),
                    showTopBorder: true
                ) {
                    Toggle("", isOn: Bindable(env.preferences).useCompression)
                        .labelsHidden()
                        .tint(AppTheme.accent)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                preferenceBlock(
                    title: env.preferences.t("Show notes from sub-notebooks", zh: "父笔记本中显示子笔记本笔记", ja: "サブノートブックのノートを表示", pl: "Pokazuj notatki z podnotatników"),
                    showTopBorder: true
                ) {
                    Toggle("", isOn: Bindable(env.preferences).showDescendantNotes)
                        .labelsHidden()
                        .tint(AppTheme.accent)
                        .accessibilityLabel(env.preferences.t(
                            "Show notes from sub-notebooks in parent notebooks",
                            zh: "是否在父笔记本中显示子笔记本中的笔记",
                            ja: "親ノートブックにサブノートブックのノートを表示する",
                            pl: "Pokazuj notatki z podnotatników w notatnikach nadrzędnych"
                        ))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                // List density lives in list-options sheet (Android NotesActionsModal), not here.

                preferenceBlock(
                    title: env.preferences.t("Maximum recording length", zh: "最长录音时长", ja: "最大録音時間", pl: "Maksymalna długość nagrania"),
                    description: env.preferences.t(
                        "Voice memos stop recording automatically at this length to save storage.",
                        zh: "语音备忘达到此时长后会自动停止录音，以节省存储空间。",
                        ja: "ストレージを節約するため、ボイスメモはこの長さで録音を自動停止します。",
                        pl: "Notatki głosowe przestają się nagrywać po tym czasie, aby oszczędzać miejsce."
                    ),
                    showTopBorder: true
                ) {
                    Menu {
                        ForEach(PreferencesStore.voiceMemoMaxMinuteOptions, id: \.self) { minutes in
                            Button(voiceMemoMinutesLabel(minutes)) { env.preferences.voiceMemoMaxMinutes = minutes }
                        }
                    } label: {
                        HStack {
                            Text(voiceMemoMinutesLabel(env.preferences.voiceMemoMaxMinutes))
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.title)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(AppTheme.secondary)
                        }
                        .padding(.horizontal, 12)
                        .frame(minHeight: 40)
                        .background(AppTheme.card)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8).stroke(AppTheme.border, lineWidth: 1)
                        )
                    }
                    .accessibilityLabel(env.preferences.t("Maximum recording length", zh: "最长录音时长", ja: "最大録音時間", pl: "Maksymalna długość nagrania"))
                }
            }
        }
    }

    private func voiceMemoMinutesLabel(_ minutes: Int) -> String {
        env.preferences.t("\(minutes) minutes", zh: "\(minutes) 分钟", ja: "\(minutes) 分", pl: "\(minutes) min")
    }

    private var accountContent: some View {
        VStack(spacing: 16) {
            // Account summary card
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(AppTheme.accentSoft).frame(width: 40, height: 40)
                    Image(systemName: "person")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(AppTheme.accentStrong)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(env.preferences.t("Current account", zh: "当前账户", pl: "Bieżące konto"))
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(AppTheme.secondary)
                    Text(env.session.session?.user?.displayName ?? env.session.session?.user?.username ?? "—")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(AppTheme.title)
                    let role = env.session.session?.user?.role == "owner"
                        ? env.preferences.t("Owner", zh: "实例管理员", pl: "Właściciel")
                        : env.preferences.t("Member", zh: "成员", pl: "Członek")
                    Text("@\(env.session.session?.user?.username ?? "—") · \(role)")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.secondary)
                        .padding(.top, 1)
                }
                Spacer(minLength: 0)
            }
            .padding(16)
            .background(AppTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 1)
            )

            // Change password panel (Android AccountSecurityPanel)
            AccountPasswordPanel()

            // Two-factor authentication (TOTP) — issue #671
            TotpSettingsPanel()

            // Extended links (tokens/devices/users/tags) — compact rows, not on Android root Me
            settingsMenuCard {
                menuRow(icon: "iphone", iconTint: AppTheme.accent, iconBg: AppTheme.accentSoft,
                        title: env.preferences.t("Devices", zh: "登录设备", pl: "Urządzenia"), showBorder: false) {
                    withAnimation(Motion.chip) { tab = .devices }
                }
                menuRow(icon: "key", iconTint: AppTheme.accent, iconBg: AppTheme.accentSoft,
                        title: "API Token", showBorder: true) {
                    withAnimation(Motion.chip) { tab = .tokens }
                }
                menuRow(icon: "tag", iconTint: AppTheme.accent, iconBg: AppTheme.accentSoft,
                        title: env.preferences.t("Tags", zh: "标签管理", pl: "Tagi"), showBorder: true) {
                    withAnimation(Motion.chip) { tab = .tags }
                }
                if env.session.session?.user?.role == "owner" {
                    menuRow(icon: "person.2", iconTint: AppTheme.accent, iconBg: AppTheme.accentSoft,
                            title: env.preferences.t("Users", zh: "用户管理", pl: "Użytkownicy"), showBorder: true) {
                        withAnimation(Motion.chip) { tab = .users }
                    }
                }
            }

            // Logout card
            VStack(alignment: .leading, spacing: 0) {
                Button {
                    Task {
                        await env.session.signOut()
                        onClose()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 15, weight: .bold))
                        Text(env.preferences.t("Sign out", zh: "退出登录", pl: "Wyloguj się"))
                            .font(.system(size: 14, weight: .heavy))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .frame(minHeight: 40)
                    .background(AppTheme.dangerAction)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(AppTheme.dangerSurface)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(AppTheme.dangerBorder, lineWidth: 1)
            )
        }
    }

    private var systemContent: some View {
        VStack(spacing: 16) {
            settingsGroup(title: env.preferences.t("System info", zh: "系统信息", pl: "Informacje o systemie"), icon: "info.circle") {
                Button {
                    UIPasteboard.general.string = systemInfoText
                    copiedSystemInfo = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) { copiedSystemInfo = false }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: copiedSystemInfo ? "checkmark.shield" : "doc.on.doc")
                        Text(copiedSystemInfo
                            ? env.preferences.t("Copied", zh: "已复制", pl: "Skopiowano")
                            : env.preferences.t("Copy info", zh: "复制信息", pl: "Kopiuj informacje"))
                            .font(.system(size: 14, weight: .bold))
                        Spacer()
                    }
                    .foregroundStyle(copiedSystemInfo ? AppTheme.accentStrong : AppTheme.title)
                    .padding(.horizontal, 16)
                    .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
            }

            systemInfoGroup(
                title: env.preferences.t("Cloud instance", zh: "云端实例", pl: "Instancja w chmurze"),
                description: env.preferences.t("Version and deployment environment for the connected instance.", zh: "当前连接实例的版本与部署环境。", pl: "Wersja i środowisko wdrożenia połączonej instancji."),
                icon: "cloud",
                items: cloudSystemInfoItems,
                notice: clientAheadOfInstanceNotice
            )

            systemInfoGroup(
                title: env.preferences.t("Current client", zh: "当前客户端", pl: "Bieżący klient"),
                description: env.preferences.t("The RTNote app and runtime environment on this device.", zh: "这台设备上的 RTNote 应用与运行环境。", pl: "Aplikacja RTNote i środowisko uruchomieniowe na tym urządzeniu."),
                icon: "iphone",
                items: clientSystemInfoItems
            )

            systemInfoGroup(
                title: env.preferences.t("Connection and sync", zh: "连接与同步", pl: "Połączenie i synchronizacja"),
                description: env.preferences.t("Connection and local sync queue status.", zh: "实例连接与本地同步队列状态。", pl: "Stan połączenia i lokalnej kolejki synchronizacji."),
                icon: "arrow.triangle.2.circlepath",
                items: connectionSystemInfoItems
            )

            Button {
                Task { await env.runSyncCycle() }
            } label: {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text(env.preferences.t("Sync now", zh: "立即同步", pl: "Synchronizuj teraz"))
                        .font(.system(size: 14, weight: .bold))
                    if env.isSyncing { ProgressView() }
                }
                .frame(maxWidth: .infinity)
                .frame(minHeight: 44)
                .foregroundStyle(AppTheme.title)
                .background(AppTheme.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.border, lineWidth: 1))
            }
            .buttonStyle(.plain)

            if let err = env.lastSyncError {
                Text(err)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AppTheme.danger)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Building blocks

    private var localeLabel: String {
        switch env.preferences.localeCode {
        case "zh-CN": return Self.languageNames.zh
        case "en-US": return Self.languageNames.en
        case "ja": return Self.languageNames.ja
        case "pl": return Self.languageNames.pl
        default: return env.preferences.t("System", zh: "跟随系统", ja: "システムに合わせる", pl: "Systemowy")
        }
    }

    private var clientAheadOfInstanceNotice: String? {
        let clientVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
        guard let clientVersion, let instanceVersion, Self.isClient(clientVersion, aheadOfInstance: instanceVersion) else {
            return nil
        }
        switch instanceHealth?.runtime {
        case "cloudflare-workers":
            return env.preferences.t(
                "This client is newer than the connected cloud instance. Redeploy the instance from the latest RTNote code to update it.",
                zh: "当前客户端版本高于云端实例。可等待每天自动更新，或手动运行 Update deployed RTNote 工作流。",
                pl: "Ten klient jest nowszy niż połączona instancja w chmurze. Możesz poczekać na codzienną automatyczną aktualizację instancji lub uruchomić workflow Update deployed RTNote."
            )
        case "self-hosted-bun":
            return env.preferences.t(
                "This client is newer than the connected cloud instance. You can wait for the daily automatic instance update, or run ./update.sh in the install directory (default ~/rtnote).",
                zh: "当前客户端版本高于云端实例。可等待每天自动更新，或在安装目录执行 ./update.sh（默认 ~/rtnote）。",
                pl: "Ten klient jest nowszy niż połączona instancja w chmurze. Możesz poczekać na codzienną automatyczną aktualizację instancji lub uruchomić ./update.sh w katalogu instalacji (domyślnie ~/rtnote)."
            )
        default:
            return env.preferences.t(
                "This client is newer than the connected cloud instance. You can wait for the daily automatic instance update, or update the instance manually.",
                zh: "当前客户端版本高于云端实例。可等待每天自动更新，也可手动更新实例。",
                pl: "Ten klient jest nowszy niż połączona instancja w chmurze. Możesz poczekać na codzienną automatyczną aktualizację instancji lub zaktualizować ją ręcznie."
            )
        }
    }

    private static func isClient(_ clientVersion: String, aheadOfInstance instanceVersion: String) -> Bool {
        func core(_ value: String) -> [Int]? {
            let pattern = #"^v?(\d+)\.(\d+)\.(\d+)"#
            guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else { return nil }
            let range = NSRange(value.startIndex..., in: value)
            guard let match = regex.firstMatch(in: value, range: range) else { return nil }
            let numbers = (1...3).compactMap { index -> Int? in
                guard let part = Range(match.range(at: index), in: value) else { return nil }
                return Int(value[part])
            }
            return numbers.count == 3 ? numbers : nil
        }
        guard let client = core(clientVersion), let instance = core(instanceVersion) else { return false }
        for index in 0..<3 where client[index] != instance[index] {
            return client[index] > instance[index]
        }
        return false
    }

    private struct SystemInfoItem {
        let label: String
        let value: String
        var localOnly = false
    }

    private var currentClientDisplaySize: String {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        let screen = scene?.screen ?? UIScreen.main
        let screenWidth = Int(screen.bounds.width.rounded())
        let screenHeight = Int(screen.bounds.height.rounded())
        guard screenWidth > 0, screenHeight > 0, screen.scale > 0 else {
            return env.preferences.t("Unknown", zh: "未知", pl: "Nieznane")
        }
        let screenText = "\(screenWidth)×\(screenHeight)"
        let dpr = Self.formatDevicePixelRatio(screen.scale)
        return env.preferences.t(
            "\(screenText) @\(dpr)x",
            zh: "\(screenText) @\(dpr)x",
            ja: "\(screenText) @\(dpr)x",
            pl: "\(screenText) @\(dpr)x"
        )
    }

    private static func formatDevicePixelRatio(_ value: CGFloat) -> String {
        let rounded = (value * 100).rounded() / 100
        if rounded == CGFloat(Int(rounded)) {
            return String(Int(rounded))
        }
        return String(format: "%g", Double(rounded))
    }

    private var currentDeviceModel: String {
        var info = utsname()
        uname(&info)
        let machine = withUnsafePointer(to: &info.machine) { pointer in
            pointer.withMemoryRebound(to: CChar.self, capacity: Int(_SYS_NAMELEN)) {
                String(cString: $0)
            }
        }
        let trimmed = machine.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? env.preferences.t("Unknown", zh: "未知", pl: "Nieznane") : trimmed
    }

    private var clientSystemInfoItems: [SystemInfoItem] {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "—"
        let language = env.preferences.localeCode == "system"
            ? "\(env.preferences.resolvedLocale.identifier) (\(env.preferences.t("Follow system", zh: "跟随系统", pl: "Zgodnie z systemem")))"
            : env.preferences.resolvedLocale.identifier
        return [
            SystemInfoItem(label: env.preferences.t("Version", zh: "版本", pl: "Wersja"), value: "v\(version)"),
            SystemInfoItem(label: env.preferences.t("Build", zh: "构建", pl: "Kompilacja"), value: build),
            SystemInfoItem(label: env.preferences.t("Client", zh: "客户端", pl: "Klient"), value: env.preferences.t("Mobile app", zh: "移动应用", pl: "Aplikacja mobilna")),
            SystemInfoItem(label: env.preferences.t("System", zh: "系统", pl: "Systemowy"), value: "iOS"),
            SystemInfoItem(label: env.preferences.t("System version", zh: "系统版本", pl: "Wersja systemu"), value: UIDevice.current.systemVersion),
            SystemInfoItem(
                label: env.preferences.t("Device model", zh: "设备型号", ja: "機種", pl: "Model urządzenia"),
                value: currentDeviceModel
            ),
            SystemInfoItem(
                label: env.preferences.t("Screen resolution", zh: "屏幕分辨率", ja: "画面解像度", pl: "Rozdzielczość ekranu"),
                value: currentClientDisplaySize
            ),
            SystemInfoItem(label: env.preferences.t("Language", zh: "语言", pl: "Język"), value: language),
            SystemInfoItem(label: env.preferences.t("Time zone", zh: "时区", pl: "Strefa czasowa"), value: TimeZone.current.identifier),
            SystemInfoItem(label: env.preferences.t("Mode", zh: "安装形态", pl: "Tryb"), value: env.preferences.t("Native SwiftUI app", zh: "原生 SwiftUI 应用", pl: "Natywna aplikacja SwiftUI")),
        ]
    }

    private var cloudSystemInfoItems: [SystemInfoItem] {
        var items: [SystemInfoItem] = []
        if let instanceURL = env.session.session?.baseUrl, !instanceURL.isEmpty {
            items.append(SystemInfoItem(
                label: env.preferences.t("Instance URL", zh: "实例地址", ja: "インスタンス URL", pl: "Adres URL instancji"),
                value: instanceURL,
                localOnly: true
            ))
        }
        items.append(contentsOf: [
            SystemInfoItem(
                label: env.preferences.t("Instance version", zh: "实例版本", pl: "Wersja instancji"),
                value: instanceVersion.map { "v\($0.replacingOccurrences(of: "^v", with: "", options: .regularExpression))" } ?? unknownSystemInfoValue
            ),
            SystemInfoItem(label: env.preferences.t("Instance build", zh: "实例构建", pl: "Kompilacja instancji"), value: instanceHealth?.build ?? unknownSystemInfoValue),
            SystemInfoItem(
                label: env.preferences.t("Instance deployment time", zh: "实例部署时间", ja: "インスタンスのデプロイ時刻", pl: "Czas wdrożenia instancji"),
                value: deploymentVersionTimeLabel(instanceHealth?.deploymentVersionCreatedAt)
            ),
            SystemInfoItem(label: env.preferences.t("Database version", zh: "数据库版本", pl: "Wersja bazy danych"), value: instanceHealth?.migration ?? unknownSystemInfoValue),
            SystemInfoItem(label: env.preferences.t("Database backend", zh: "数据库后端", pl: "Backend bazy danych"), value: databaseBackendLabel(instanceHealth?.storage?.database)),
            SystemInfoItem(label: env.preferences.t("New upload object storage", zh: "新上传对象存储", pl: "Magazyn obiektów dla nowych przesyłanych plików"), value: objectStorageLabel(instanceHealth)),
        ])
        if instanceHealth?.objectStorageProvider == "s3" {
            items.append(SystemInfoItem(
                label: env.preferences.t("Existing attachments", zh: "已有附件", pl: "Istniejące załączniki"),
                value: env.preferences.t("Read from original storage", zh: "继续从原存储读取", pl: "Odczyt z pierwotnego magazynu")
            ))
        }
        items.append(SystemInfoItem(
            label: env.preferences.t("Deployment platform", zh: "部署平台", pl: "Platforma wdrożenia"),
            value: deploymentPlatformLabel(instanceHealth?.runtime)
        ))
        if instanceHealth?.runtime == "self-hosted-bun" {
            items.append(SystemInfoItem(
                label: env.preferences.t("Container image source", zh: "容器镜像来源", pl: "Źródło obrazu kontenera"),
                value: containerImageSourceLabel(instanceHealth?.containerImageSource)
            ))
        }
        return items
    }

    private var connectionSystemInfoItems: [SystemInfoItem] {
        let queueItems = env.session.dataScope.flatMap { try? env.outbox.listItems(scope: $0) } ?? []
        let pending = queueItems.filter { $0.status == .pending || $0.status == .syncing }.count
        let failed = queueItems.filter { $0.status == .error || $0.status == .conflict }.count
        let connection = instanceHealth != nil
            ? env.preferences.t("Connected", zh: "连接正常", pl: "Połączono")
            : instanceDiagnosticsFailed
                ? env.preferences.t("Connection failed", zh: "连接失败", pl: "Błąd połączenia")
                : env.preferences.t("Checking", zh: "正在检查", pl: "Sprawdzanie")
        return [
            SystemInfoItem(label: env.preferences.t("Instance connection", zh: "实例连接", pl: "Połączenie z instancją"), value: connection),
            SystemInfoItem(
                label: env.preferences.t("Health check time", zh: "健康检查耗时", ja: "ヘルスチェック時間", pl: "Czas sprawdzenia stanu"),
                value: instanceLatencyMilliseconds.map { "\($0) ms" } ?? unknownSystemInfoValue
            ),
            SystemInfoItem(label: env.preferences.t("Pending sync", zh: "待同步", pl: "Oczekuje na synchronizację"), value: String(pending)),
            SystemInfoItem(label: env.preferences.t("Failed or conflicted", zh: "失败或冲突", pl: "Błędy lub konflikty"), value: String(failed)),
        ]
    }

    private var unknownSystemInfoValue: String {
        env.preferences.t("Unknown", zh: "未知", pl: "Nieznane")
    }

    private func deploymentVersionTimeLabel(_ timestamp: String?) -> String {
        guard let timestamp else { return unknownSystemInfoValue }
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let parsed = parser.date(from: timestamp) ?? ISO8601DateFormatter().date(from: timestamp)
        guard let parsed else { return unknownSystemInfoValue }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: parsed)
    }

    private func databaseBackendLabel(_ backend: String?) -> String {
        switch backend {
        case "d1": return "D1"
        case "sqlite": return "SQLite"
        case let value?: return value
        case nil: return unknownSystemInfoValue
        }
    }

    private func objectStorageLabel(_ health: InstanceHealth?) -> String {
        if health?.objectStorageProvider == "s3" {
            return env.preferences.t("Third-party S3-compatible OSS", zh: "第三方 S3 兼容 OSS", pl: "Zewnętrzny magazyn OSS zgodny z S3")
        }
        guard health?.objectStorageProvider == "builtin" else { return unknownSystemInfoValue }
        switch health?.storage?.resources {
        case "r2": return env.preferences.t("Built-in R2", zh: "内置 R2", pl: "Wbudowany R2")
        case "filesystem": return env.preferences.t("Local filesystem", zh: "本地文件系统", pl: "Lokalny system plików")
        case "s3": return env.preferences.t("Instance-provided S3-compatible storage", zh: "实例内置 S3 兼容存储", pl: "Magazyn zgodny z S3 dostarczany przez instancję")
        default: return unknownSystemInfoValue
        }
    }

    private func deploymentPlatformLabel(_ runtime: String?) -> String {
        switch runtime {
        case "cloudflare-workers": return "Cloudflare"
        case "self-hosted-bun": return "Docker"
        default: return unknownSystemInfoValue
        }
    }

    private func containerImageSourceLabel(_ source: String?) -> String {
        switch source {
        case "official-ghcr": return "GitHub Container Registry (GHCR)"
        case "official-cn-mirror": return env.preferences.t("Official regional mirror", zh: "中国大陆官方镜像", pl: "Oficjalny mirror dla Chin kontynentalnych")
        case "custom": return env.preferences.t("Custom image", zh: "自定义镜像", pl: "Własny obraz")
        default: return unknownSystemInfoValue
        }
    }

    private var systemInfoText: String {
        systemInfoText(includeLocalOnly: true)
    }

    private func systemInfoText(includeLocalOnly: Bool) -> String {
        let keep: (SystemInfoItem) -> Bool = includeLocalOnly ? { _ in true } : { !$0.localOnly }
        return [
            systemInfoTextSection(env.preferences.t("Cloud instance", zh: "云端实例", pl: "Instancja w chmurze"), items: cloudSystemInfoItems.filter(keep)),
            systemInfoTextSection(env.preferences.t("Current client", zh: "当前客户端", pl: "Bieżący klient"), items: clientSystemInfoItems.filter(keep)),
            systemInfoTextSection(env.preferences.t("Connection and sync", zh: "连接与同步", pl: "Połączenie i synchronizacja"), items: connectionSystemInfoItems.filter(keep)),
        ].joined(separator: "\n\n")
    }

    private func systemInfoTextSection(_ title: String, items: [SystemInfoItem]) -> String {
        ([title] + items.map { "\($0.label): \($0.value)" }).joined(separator: "\n")
    }

    private func loadInstanceDiagnostics() async {
        guard env.session.isSignedIn else {
            instanceDiagnosticsFailed = true
            return
        }
        instanceDiagnosticsFailed = false
        let startedAt = Date()
        do {
            async let health = env.session.client.getInstanceHealth()
            async let release = env.session.client.getInstanceRelease()
            let (resolvedHealth, resolvedRelease) = try await (health, release)
            instanceHealth = resolvedHealth
            instanceVersion = resolvedRelease.version
            instanceLatencyMilliseconds = max(0, Int(Date().timeIntervalSince(startedAt) * 1_000))
        } catch {
            instanceHealth = nil
            instanceVersion = nil
            instanceLatencyMilliseconds = nil
            instanceDiagnosticsFailed = true
        }
    }

    private var feedbackURL: URL? {
        // The issue text is English or Chinese only (GitHub issues are read by maintainers).
        let english = env.preferences.isEnglish
        func text(_ en: String, zh: String) -> String { english ? en : zh }
        let heading = text("Feedback", zh: "反馈内容")
        let prompt = text(
            "Describe the problem, steps to reproduce it, or the feature you would like to see.",
            zh: "请描述遇到的问题、复现步骤，或你希望增加的功能。"
        )
        let privacy = text(
            "GitHub Issues are public. Do not include passwords, tokens, instance URLs, or private note content.",
            zh: "GitHub Issue 公开可见，请勿提交密码、Token、实例地址或私人笔记内容。"
        )
        let infoHeading = text("System information", zh: "系统信息")
        let notice = text(
            "The following information was generated by RTNote to help diagnose the issue.",
            zh: "以下信息由 RTNote 自动生成，可帮助定位问题。"
        )
        let info = systemInfoText(includeLocalOnly: false)
        let body = """
        ## \(heading)

        \(prompt)

        > \(privacy)

        ## \(infoHeading)

        \(notice)

        ```text
        \(info)
        ```
        """
        var components = URLComponents(string: "https://github.com/MadlyFX/rtnote/issues/new")
        components?.queryItems = [
            URLQueryItem(name: "title", value: text("[Feedback] ", zh: "[反馈] ")),
            URLQueryItem(name: "body", value: body),
            URLQueryItem(name: "system-info", value: info),
            URLQueryItem(name: "client", value: "iOS"),
        ]
        return components?.url
    }

    private func settingsGroup<Content: View>(
        title: String,
        icon: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.accentStrong)
                Text(title)
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundStyle(AppTheme.title)
            }
            .padding(16)
            content()
        }
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
            )
    }

    private func systemInfoGroup(
        title: String,
        description: String,
        icon: String,
        items: [SystemInfoItem],
        notice: String? = nil
    ) -> some View {
        settingsGroup(title: title, icon: icon) {
            Text(description)
                .font(.system(size: 12))
                .foregroundStyle(AppTheme.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)

            if let notice {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 11, weight: .semibold))
                    Text(notice)
                        .font(.system(size: 11))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .foregroundStyle(AppTheme.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
            }

            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                infoRow(item.label, item.value, showBorder: true)
            }
        }
    }

    private func preferenceBlock<Content: View>(
        title: String,
        description: String? = nil,
        showTopBorder: Bool = false,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(AppTheme.title)
                if let description {
                    Text(description)
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .top) {
            if showTopBorder {
                Rectangle().fill(AppTheme.cardBorder).frame(height: 1)
            }
        }
    }

    private func infoRow(_ title: String, _ value: String, showBorder: Bool) -> some View {
        HStack(alignment: .top) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.title)
                .multilineTextAlignment(.trailing)
                .textSelection(.enabled)
        }
        .padding(16)
        .overlay(alignment: .top) {
            if showBorder {
                Rectangle().fill(AppTheme.cardBorder).frame(height: 1)
            }
        }
    }
}

// MARK: - Password panel (Android AccountSecurityPanel)
