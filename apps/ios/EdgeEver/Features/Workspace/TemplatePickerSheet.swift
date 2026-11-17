import SwiftUI

/// Android `MobileCreateChoiceModal` — blank vs template.
struct CreateChoiceSheet: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss

    var canCreate: Bool
    var onBlank: () -> Void
    var onTemplate: () -> Void
    /// Creates a note and starts recording a voice memo in it.
    var onVoiceMemo: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(AppTheme.sheetHandle)
                .frame(width: 42, height: 4)
                .padding(.top, 10)
                .padding(.bottom, 8)

            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(env.preferences.t("New note", zh: "新建笔记", pl: "Nowa notatka"))
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(AppTheme.title)
                    Text(env.preferences.t("Choose how to create", zh: "选择创建方式", pl: "Wybierz sposób tworzenia"))
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.secondary)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(AppTheme.title)
                        .frame(width: 38, height: 38)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(env.preferences.t("Close", zh: "关闭", pl: "Zamknij"))
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 48)
            .overlay(alignment: .bottom) {
                Rectangle().fill(AppTheme.border).frame(height: 1)
            }

            VStack(spacing: 0) {
                choiceRow(
                    systemImage: "doc.text",
                    title: env.preferences.t("Blank note", zh: "空白笔记", pl: "Pusta notatka"),
                    description: env.preferences.t("Start with an empty page", zh: "从空白页开始记录", pl: "Zacznij od pustej strony")
                ) {
                    dismiss()
                    onBlank()
                }
                choiceRow(
                    systemImage: "square.grid.2x2",
                    title: env.preferences.t("New from template", zh: "从模板新建", pl: "Nowa z szablonu"),
                    description: env.preferences.t(
                        "Use meeting notes, weekly reviews, and more",
                        zh: "使用会议纪要、周报等预设结构",
                        pl: "Użyj notatek ze spotkań, przeglądów tygodniowych i innych"
                    )
                ) {
                    dismiss()
                    onTemplate()
                }
                if let onVoiceMemo {
                    choiceRow(
                        systemImage: "mic",
                        title: env.preferences.t("New voice memo", zh: "新建语音备忘", ja: "新しいボイスメモ", pl: "Nowa notatka głosowa"),
                        description: env.preferences.t(
                            "Create a note and start recording",
                            zh: "新建笔记并立即开始录音",
                            ja: "ノートを作成してすぐに録音を開始します",
                            pl: "Utwórz notatkę i od razu zacznij nagrywać"
                        )
                    ) {
                        dismiss()
                        onVoiceMemo()
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
            .padding(.bottom, 12)
        }
        .background(AppTheme.card)
        .presentationDetents([.height(onVoiceMemo == nil ? 280 : 350)])
        .presentationDragIndicator(.hidden)
        .accessibilityIdentifier("createChoiceSheet")
    }

    private func choiceRow(
        systemImage: String,
        title: String,
        description: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: systemImage)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(AppTheme.title)
                    .frame(width: 40, height: 40)
                    .background(AppTheme.searchFill)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(AppTheme.title)
                    Text(description)
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.secondary)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 14)
            .contentShape(Rectangle())
            .opacity(canCreate ? 1 : 0.45)
        }
        .buttonStyle(.plain)
        .disabled(!canCreate)
    }
}

/// Android `MobileTemplatePickerModal` — persisted, editable templates.
struct TemplatePickerSheet: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss

    var onSelect: (CreateMemoSeed) -> Void

    @State private var templates: [SelectableMemoTemplate] = []
    @State private var galleryTemplates: [SelectableMemoTemplate] = []
    @State private var isLoading = false
    @State private var loadFailed = false

    var body: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(AppTheme.sheetHandle)
                .frame(width: 42, height: 4)
                .padding(.top, 10)
                .padding(.bottom, 8)

            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(env.preferences.t("New from template", zh: "从模板新建", pl: "Nowa z szablonu"))
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(AppTheme.title)
                    Text(env.preferences.t(
                        "Choose a template to get started. Every template can be edited or deleted on the web.",
                        zh: "选择一个模板快速开始。所有模板都可以在网页端修改或删除。",
                        pl: "Wybierz szablon, aby zacząć. Każdy szablon możesz edytować lub usunąć w wersji webowej."
                    ))
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(AppTheme.title)
                        .frame(width: 38, height: 38)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(env.preferences.t("Close", zh: "关闭", pl: "Zamknij"))
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 10)
            .overlay(alignment: .bottom) {
                Rectangle().fill(AppTheme.border).frame(height: 1)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    sectionTitle(env.preferences.t("Templates", zh: "模板", pl: "Szablony"))

                    if isLoading {
                        HStack(spacing: 8) {
                            ProgressView().controlSize(.small)
                            Text(env.preferences.t("Loading templates", zh: "正在加载模板", pl: "Wczytywanie szablonów"))
                                .font(.system(size: 12))
                                .foregroundStyle(AppTheme.secondary)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 10)
                    } else if loadFailed {
                        hint(env.preferences.t(
                            "Templates could not load. Please try again later.",
                            zh: "模板暂时无法加载，请稍后重试。",
                            pl: "Nie udało się wczytać szablonów. Spróbuj ponownie później."
                        ))
                    } else if templates.isEmpty {
                        hint(env.preferences.t(
                            "No templates yet. Create one or save a note as a template on the web.",
                            zh: "暂无模板。可在网页端新建模板，或将常用笔记另存为模板。",
                            pl: "Brak szablonów. Utwórz szablon lub zapisz notatkę jako szablon w wersji webowej."
                        ))
                    }

                    ForEach(templates) { template in
                        templateRow(template)
                    }

                    if !galleryTemplates.isEmpty {
                        sectionTitle(env.preferences.t("Template Gallery", zh: "模板库", ja: "テンプレートギャラリー", pl: "Galeria szablonów"))
                        ForEach(galleryTemplates) { template in
                            templateRow(template)
                        }
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
                .padding(.bottom, 20)
            }
        }
        .background(AppTheme.card)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.hidden)
        .accessibilityIdentifier("templatePickerSheet")
        .task { await loadTemplates() }
        .task { await loadGallery() }
    }

    private func loadTemplates() async {
        isLoading = true
        loadFailed = false
        defer { isLoading = false }
        do {
            let list = try await env.session.client.listTemplates()
            templates = list.map(SelectableMemoTemplate.init)
        } catch {
            loadFailed = true
            templates = []
        }
    }

    /// Servers without the gallery endpoint simply leave the section hidden.
    private func loadGallery() async {
        do {
            let list = try await env.session.client.listTemplateGallery(locale: env.preferences.apiLocale)
            galleryTemplates = list.map(SelectableMemoTemplate.init)
        } catch {
            galleryTemplates = []
        }
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(AppTheme.secondary)
            .padding(.horizontal, 8)
            .padding(.top, 8)
            .padding(.bottom, 4)
    }

    private func hint(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12))
            .foregroundStyle(AppTheme.secondary)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
    }

    private func templateRow(_ template: SelectableMemoTemplate) -> some View {
        Button {
            onSelect(template.createSeed)
            dismiss()
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "square.grid.2x2")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.accentStrong)
                    .frame(width: 32, height: 32)
                    .background(AppTheme.accentSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .padding(.top, 1)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(template.name)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(AppTheme.title)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                    }
                    if !template.description.isEmpty {
                        Text(template.description)
                            .font(.system(size: 12))
                            .foregroundStyle(AppTheme.secondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("templateRow-\(template.id)")
    }

}
