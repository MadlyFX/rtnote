import SwiftUI
import Pow
import UIKit

/// Android WorkspaceMemoDetail shell parity (detailHeader*, detailMeta*, detailEditFab).
struct MemoDetailView: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    let memoId: String
    var initialShareImage = false
    /// Present editor from the parent `WorkspaceView` (more reliable than cover on a pushed page).
    var onEdit: (String, MemoEditInitialFocus) -> Void = { _, _ in }

    @State private var memo: MemoDetail?
    @State private var showRevisions = false
    @State private var memoSharePayload: MemoSharePayload?
    @State private var imageExportSharePayload: MemoImageExportSharePayload?
    @State private var imageExportPreviewPayload: MemoImageExportPreviewPayload?
    @State private var imageExportDocumentPayload: MemoImageExportDocumentPayload?
    @State private var imageExportMessage: MemoImageExportMessage?
    @State private var imageExporting = false
    @State private var imageFontStatus = "ready"
    @State private var imageFontRecoveryId: String?
    @State private var imageFontsRecovered = false
    @State private var retryImageFonts: (() -> Void)?
    @State private var imageExportRequestId: String?
    @State private var imageExportBuffer = MemoImageExportBuffer()
    @State private var imageShareOptionsOpen = false
    @State private var imageExportIntent: MemoImageExportIntent = .share
    @State private var error: String?
    @State private var conflictItem: OutboxItem?
    @State private var outboxStatus: OutboxStatus?
    @State private var lastOutboxError: String?
    @State private var pinPulse = false
    @State private var searchOpen = false
    @State private var titleCollapsed = false
    @State private var searchQuery = ""
    @State private var searchMatchCount = 0
    @State private var searchMatchIndex = 0
    @State private var showDeleteConfirm = false
    @State private var showMoreMenu = false
    @State private var showNoteIdCopied = false
    @State private var showNotebookPicker = false
    @State private var resourceTarget: ResourceTarget?
    @State private var imagePreview: (source: String, alt: String)?
    /// TipTap EditorBundle is ~4MB; keep native text visible until first setContent finishes.
    @State private var bodyReady = false
    @State private var initialShareImageHandled = false

    var body: some View {
        @Bindable var preferences = env.preferences
        return VStack(spacing: 0) {
            detailHeader
            if syncStatus == .conflict, memo != nil {
                conflictBanner
            } else if syncStatus == .error || syncStatus == .pending, memo != nil {
                syncBanner
            }
            if let memo {
                detailBody(memo)
            } else if let error {
                ContentUnavailableView(
                    env.preferences.t("Failed to load", zh: "加载失败", pl: "Nie udało się wczytać"),
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else {
                // Should almost never flash: load() runs onAppear before next frame when mirror is warm.
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(AppTheme.card)
        // UIKit FAB in overlay — SwiftUI Button over WKWebView often receives zero taps.
        .overlay(alignment: .bottomTrailing) {
            if let memo, !memo.isDeleted, !blocksRichTextEdit(memo) {
                EditFabButton(
                    accessibilityLabel: env.preferences.t("Edit note", zh: "编辑笔记", pl: "Edytuj notatkę")
                ) {
                    onEdit(memo.id, .body)
                }
                .frame(width: 56, height: 56)
                .padding(.trailing, 12)
                .padding(.bottom, 12)
            }
        }
        .background(AppTheme.card.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .accessibilityIdentifier(DetailMemoChrome.root)
        .sheet(isPresented: $showRevisions) {
            if let memo {
                RevisionsView(
                    memoId: memo.id,
                    memoTitle: memo.title,
                    isDeleted: memo.isDeleted
                ) {
                    showRevisions = false
                    load()
                }
            }
        }
        .sheet(item: $conflictItem) { item in
            ConflictResolutionView(item: item) {
                conflictItem = nil
                load()
                refreshSyncStatus()
            }
        }
        .sheet(item: $resourceTarget) { target in
            ResourceActionSheet(
                target: target,
                canMutate: memo.map { !$0.isDeleted && !$0.id.hasPrefix("local:") } ?? false,
                onContentChanged: { load() }
            )
            .presentationDetents([.height(360), .medium])
            .presentationDragIndicator(.hidden)
        }
        .sheet(item: $memoSharePayload) { payload in
            ActivityShareView(items: [payload.message, payload.url]) { _, _, error in
                if let error { self.error = error.localizedDescription }
                memoSharePayload = nil
            }
        }
        .sheet(item: $imageExportSharePayload) { payload in
            ActivityShareView(items: [payload.url]) { _, _, shareError in
                if let shareError {
                    imageExportMessage = MemoImageExportMessage(
                        title: env.preferences.t("Export failed", zh: "导出失败", pl: "Eksport nie powiódł się"),
                        message: shareError.localizedDescription
                    )
                }
                imageExportSharePayload = nil
            }
        }
        .sheet(item: $imageExportDocumentPayload) { payload in
            MemoImageDocumentExportView(fileURL: payload.url) { result in
                if case let .failure(exportError) = result {
                    imageExportMessage = MemoImageExportMessage(
                        title: env.preferences.t("Save failed", zh: "保存失败", pl: "Nie udało się zapisać"),
                        message: exportError.localizedDescription
                    )
                }
                imageExportDocumentPayload = nil
            }
        }
        .sheet(item: $imageExportPreviewPayload, onDismiss: {
            imageFontRecoveryId = nil
            retryImageFonts = nil
            if let requestId = imageExportRequestId { imageExportBuffer.cancel(requestId: requestId) }
            imageExportRequestId = nil
            imageExporting = false
        }) { payload in
            let currentPayload = imageExportPreviewPayload ?? payload
            MemoImageExportPreviewView(
                payload: currentPayload,
                isLoadingFonts: imageExporting,
                onRetryFonts: { retryImageFonts?() },
                isEnglish: env.preferences.isEnglish,
                isPolish: env.preferences.uiLanguage == .polish,
                onCopy: {
                    guard let image = UIImage(contentsOfFile: currentPayload.url.path) else {
                        imageExportMessage = MemoImageExportMessage(
                            title: env.preferences.t("Copy failed", zh: "复制失败", pl: "Nie udało się skopiować"),
                            message: env.preferences.t("The generated image could not be read.", zh: "无法读取生成的图片。", pl: "Nie udało się odczytać wygenerowanego obrazu.")
                        )
                        return
                    }
                    UIPasteboard.general.image = image
                    imageExportMessage = MemoImageExportMessage(
                        title: env.preferences.t("Copied", zh: "复制成功", pl: "Skopiowano"),
                        message: env.preferences.t("The image is on your clipboard.", zh: "图片已复制到剪贴板。", pl: "Obraz jest w schowku.")
                    )
                },
                onSave: {
                    imageFontRecoveryId = nil
                    imageExportPreviewPayload = nil
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                        imageExportDocumentPayload = MemoImageExportDocumentPayload(url: currentPayload.url)
                    }
                },
                onShare: {
                    imageFontRecoveryId = nil
                    imageExportPreviewPayload = nil
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                        imageExportSharePayload = MemoImageExportSharePayload(url: currentPayload.url)
                    }
                }
            )
        }
        .sheet(isPresented: $imageShareOptionsOpen) {
            NavigationStack {
                Form {
                    Section(env.preferences.t("Theme", zh: "主题风格", pl: "Motyw")) {
                        Picker(env.preferences.t("Theme", zh: "主题风格", pl: "Motyw"), selection: Binding(
                            get: { preferences.noteImageShare.theme },
                            set: { theme in
                                var share = preferences.noteImageShare
                                share.theme = theme
                                share.fontStyle = "auto"
                                preferences.noteImageShare = share
                            }
                        )) {
                            Text(env.preferences.t("Glass", zh: "透明", pl: "Szkło")).tag("glass")
                            Text(env.preferences.t("Quote", zh: "金句", pl: "Cytat")).tag("quote")
                            Text(env.preferences.t("Book excerpt", zh: "书摘", pl: "Fragment książki")).tag("book")
                            Text(env.preferences.t("Memo", zh: "备忘录", pl: "Notatka")).tag("memo")
                            Text(env.preferences.t("Bento", zh: "便当", pl: "Bento")).tag("bento")
                            Text(env.preferences.t("Black Sun", zh: "黑日", pl: "Czarne słońce")).tag("black-sun")
                            Text(env.preferences.t("Frame", zh: "框界", pl: "Ramka")).tag("frame")
                            Text(env.preferences.t("Handwritten", zh: "手写", pl: "Pismo odręczne")).tag("handwritten")
                            Text(env.preferences.t("Code", zh: "代码", pl: "Kod")).tag("code")
                        }
                        .pickerStyle(.menu)
                    }
                    Section(env.preferences.t("Typography", zh: "字体风格", pl: "Typografia")) {
                        NavigationLink {
                            NoteImageFontPickerView()
                        } label: {
                            HStack {
                                Text(env.preferences.t("Typography", zh: "字体风格", pl: "Typografia"))
                                Spacer()
                                Text(NoteImageFontPickerOptions.label(preferences))
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.trailing)
                            }
                        }
                        Text(env.preferences.t(
                            "Downloadable fonts need a connection on first use and are cached. PuHuiTi and other recommended fonts use larger, complete original files.",
                            zh: "下载型字体首次使用需联网并缓存；普惠体等推荐字体使用完整文件，首次下载较大。",
                            pl: "Czcionki są pobierane przy pierwszym użyciu i zapisywane lokalnie. PuHuiTi i inne polecane czcionki używają większych, pełnych plików."
                        ))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    }
                    Section(env.preferences.t("Font size", zh: "字号大小", pl: "Rozmiar czcionki")) {
                        Picker(env.preferences.t("Font size", zh: "字号大小", pl: "Rozmiar czcionki"), selection: $preferences.noteImageShare.fontSize) {
                            Text(env.preferences.t("Compact", zh: "紧凑", pl: "Kompaktowy")).tag("sm")
                            Text(env.preferences.t("Standard", zh: "标准", pl: "Standardowy")).tag("md")
                            Text(env.preferences.t("Comfortable", zh: "舒适", pl: "Wygodny")).tag("lg")
                        }
                        .pickerStyle(.segmented)
                    }
                    Section(env.preferences.t("Card width", zh: "卡片宽度", pl: "Szerokość karty")) {
                        Picker(env.preferences.t("Card width", zh: "卡片宽度", pl: "Szerokość karty"), selection: $preferences.noteImageShare.cardWidth) {
                            Text(env.preferences.t("Compact", zh: "紧凑", pl: "Kompaktowy")).tag("compact")
                            Text(env.preferences.t("Standard", zh: "标准", pl: "Standardowy")).tag("standard")
                            Text(env.preferences.t("Wide", zh: "宽屏", pl: "Szeroka")).tag("wide")
                        }
                        .pickerStyle(.segmented)
                    }
                    Section(env.preferences.t("Content elements", zh: "显示内容", pl: "Elementy treści")) {
                        Toggle(env.preferences.t("Note title", zh: "笔记标题", pl: "Tytuł notatki"), isOn: $preferences.noteImageShare.showTitle)
                        Toggle(env.preferences.t("Notebook", zh: "笔记本", pl: "Notatnik"), isOn: $preferences.noteImageShare.showNotebook)
                        Toggle(env.preferences.t("Tags", zh: "标签", pl: "Tagi"), isOn: $preferences.noteImageShare.showTags)
                        Toggle(env.preferences.t("Updated time", zh: "更新时间", pl: "Czas aktualizacji"), isOn: $preferences.noteImageShare.showUpdatedAt)
                        Toggle(env.preferences.t("RTNote branding", zh: "RTNote 品牌标识", pl: "Oznaczenie RTNote"), isOn: $preferences.noteImageShare.showBranding)
                    }
                    Section(env.preferences.t("Image format", zh: "图片格式", pl: "Format obrazu")) {
                        Picker(env.preferences.t("Image format", zh: "图片格式", pl: "Format obrazu"), selection: $preferences.noteImageShare.format) {
                            Text(env.preferences.t("PNG · Best for text", zh: "PNG · 超清无损", pl: "PNG · Najlepszy do tekstu")).tag("png")
                            Text(env.preferences.t("JPEG · Smaller file", zh: "JPEG · 体积小", pl: "JPEG · Mniejszy plik")).tag("jpeg")
                        }
                        .pickerStyle(.segmented)
                    }
                }
                .navigationTitle(env.preferences.t("Share as image", zh: "分享为图片", pl: "Udostępnij jako obraz"))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(env.preferences.t("Cancel", zh: "取消", pl: "Anuluj")) { imageShareOptionsOpen = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button(env.preferences.t("Generate Preview", zh: "生成预览", pl: "Generuj podgląd")) {
                            guard let memo else { return }
                            imageShareOptionsOpen = false
                            exportMemoImage(
                                memo,
                                format: env.preferences.noteImageShare.format,
                                theme: env.preferences.noteImageShare.theme,
                                fontStyle: env.preferences.noteImageShare.fontStyle,
                                fontSize: env.preferences.noteImageShare.fontSize,
                                cardWidth: env.preferences.noteImageShare.cardWidth,
                                showTitle: env.preferences.noteImageShare.showTitle,
                                showNotebook: env.preferences.noteImageShare.showNotebook,
                                showTags: env.preferences.noteImageShare.showTags,
                                showUpdatedAt: env.preferences.noteImageShare.showUpdatedAt,
                                showBranding: env.preferences.noteImageShare.showBranding,
                                intent: .preview
                            )
                        }
                        .disabled(imageExporting || !bodyReady || memo == nil)
                    }
                }
            }
        }
        .overlay(alignment: .bottom) {
            if imageExporting && imageExportPreviewPayload == nil {
                ProgressView(imageFontStatus == "loading"
                    ? env.preferences.t("Loading font…", zh: "字体加载中…", ja: "フォントを読み込み中…", pl: "Ładowanie czcionki…")
                    : env.preferences.t("Generating image…", zh: "正在生成图片…", ja: "画像を生成中…", pl: "Generowanie obrazu…"))
                    .padding().background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12)).padding()
            }
        }
        .alert(item: $imageExportMessage) { message in
            Alert(
                title: Text(message.title),
                message: Text(message.message),
                dismissButton: .default(Text(env.preferences.t("OK", zh: "确定", pl: "OK")))
            )
        }
        .sheet(isPresented: $showNotebookPicker) {
            EditNotebookPickerSheet(
                notebooks: availableNotebooks,
                selectedId: memo?.notebookId ?? ""
            ) { notebookId in
                showNotebookPicker = false
                guard let memo else { return }
                Task { await moveMemoToNotebook(memo, notebookId: notebookId) }
            }
            .presentationDetents([.medium, .large])
        }
        .fullScreenCover(isPresented: Binding(
            get: { imagePreview != nil },
            set: { if !$0 { imagePreview = nil } }
        )) {
            if let imagePreview {
                ResourceImagePreviewHost(
                    source: imagePreview.source,
                    alt: imagePreview.alt,
                    baseURL: env.session.session.flatMap { URL(string: $0.baseUrl) },
                    token: env.session.session?.token,
                    onClose: {
                        self.imagePreview = nil
                    },
                    canMutate: memo.map { !$0.isDeleted && !$0.id.hasPrefix("local:") } ?? false,
                    onContentChanged: {
                        load()
                        // Rename/delete may invalidate the blob; close preview after mutation.
                        self.imagePreview = nil
                    }
                )
            }
        }
        .confirmationDialog(
            env.preferences.t("Note actions", zh: "笔记操作", pl: "Działania na notatce"),
            isPresented: $showMoreMenu,
            titleVisibility: .visible
        ) {
            if let memo {
                if !blocksRichTextEdit(memo) {
                    Button(env.preferences.t("Edit", zh: "编辑", pl: "Edytuj")) { onEdit(memo.id, .body) }
                }
                Button(
                    memo.isPinned
                        ? env.preferences.t("Unpin", zh: "取消置顶", pl: "Odepnij")
                        : env.preferences.t("Pin", zh: "置顶", pl: "Przypnij")
                ) {
                    Task {
                        await togglePin(memo)
                        pinPulse.toggle()
                    }
                }
                Button(env.preferences.t("Share link", zh: "分享链接", pl: "Udostępnij link")) {
                    Task { await shareMemo(memo) }
                }
                Button(
                    imageExporting
                        ? env.preferences.t("Exporting image…", zh: "正在导出图片…", pl: "Eksportowanie obrazu…")
                        : env.preferences.t("Share as image", zh: "分享为图片", pl: "Udostępnij jako obraz")
                ) {
                    imageShareOptionsOpen = true
                }
                .disabled(imageExporting || !bodyReady)
                Button(env.preferences.t("Advanced export PNG", zh: "高级导出 PNG", pl: "Zaawansowany eksport PNG")) {
                    exportMemoImage(memo, format: "png")
                }
                .disabled(imageExporting || !bodyReady)
                Button(env.preferences.t("Export JPEG", zh: "导出 JPEG", pl: "Eksportuj JPEG")) {
                    exportMemoImage(memo, format: "jpeg")
                }
                .disabled(imageExporting || !bodyReady)
                Button(
                    isTemporaryMemoId(memo.id)
                        ? env.preferences.t("Copy note ID after sync", zh: "同步后可复制笔记 ID", pl: "Identyfikator notatki można skopiować po synchronizacji")
                        : env.preferences.t("Copy note ID", zh: "复制笔记 ID", pl: "Kopiuj identyfikator notatki")
                ) {
                    UIPasteboard.general.string = memo.id
                    showNoteIdCopied = true
                }
                .disabled(isTemporaryMemoId(memo.id))
                Button(env.preferences.t("Revisions", zh: "修订历史", pl: "Wersje")) { showRevisions = true }
                Button(env.preferences.t("Delete", zh: "删除", pl: "Usuń"), role: .destructive) {
                    showDeleteConfirm = true
                }
            }
        }
        .alert(env.preferences.t("Delete note", zh: "删除笔记", pl: "Usuń notatkę"), isPresented: $showDeleteConfirm) {
            Button(env.preferences.t("Delete", zh: "删除", pl: "Usuń"), role: .destructive) {
                if let memo { Task { await deleteMemo(memo) } }
            }
            Button(env.preferences.t("Cancel", zh: "取消", pl: "Anuluj"), role: .cancel) {}
        } message: {
            Text(env.preferences.t("The note will move to trash.", zh: "笔记将移入回收站。", pl: "Notatka zostanie przeniesiona do kosza."))
        }
        .alert(
            env.preferences.t("Note ID copied", zh: "笔记 ID 已复制", pl: "Skopiowano identyfikator notatki"),
            isPresented: $showNoteIdCopied
        ) {
            Button(env.preferences.t("OK", zh: "好", pl: "OK"), role: .cancel) {}
        } message: {
            Text(memo?.id ?? memoId)
        }
        // Local SQLite mirror is sync and cheap — load before the first blank ProgressView frame.
        .onAppear {
            if memo == nil {
                load()
            }
            refreshSyncStatus()
            TipTapWarmPool.warmIfNeeded()
            SharedTipTapRuntime.viewer.resetReaderScroll()
            openInitialShareImageIfReady()
        }
        .onDisappear {
            if let requestId = imageExportRequestId {
                imageExportBuffer.cancel(requestId: requestId)
            }
            imageExportRequestId = nil
            imageFontRecoveryId = nil
            retryImageFonts = nil
            imageExporting = false
        }
        .onChange(of: bodyReady) { _, _ in
            openInitialShareImageIfReady()
        }
        .task(id: memoId) {
            // Re-load if mirror was empty on first paint (rare race during bootstrap).
            if memo == nil {
                load()
            }
            refreshSyncStatus()
        }
        .onChange(of: env.isSyncing) { _, _ in
            refreshSyncStatus()
        }
        .onChange(of: memoId) { _, _ in
            bodyReady = false
            titleCollapsed = false
            SharedTipTapRuntime.viewer.resetReaderScroll()
            searchQuery = ""
            searchMatchCount = 0
            searchMatchIndex = 0
            showNotebookPicker = false
            load()
            refreshSyncStatus()
        }
        .preferredColorScheme(env.preferences.colorScheme)
    }

    // MARK: - Header

    private var detailHeader: some View {
        HStack(spacing: 0) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.slate)
                    .frame(width: 32, height: 32)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(env.preferences.t("Back to list", zh: "返回列表", pl: "Wróć do listy"))
            .accessibilityIdentifier(DetailMemoChrome.back)

            if titleCollapsed && !searchOpen, let memo {
                collapsedHeaderTitle(memo)
                    .padding(.leading, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Spacer(minLength: 8)
            }

            HStack(spacing: 2) {
                Button {
                    handleSyncStatusPress()
                } label: {
                    Text(syncLabel)
                        .font(.system(size: 11, weight: syncStatus == .conflict || syncStatus == .error ? .bold : .medium))
                        .foregroundStyle(syncStatus.foreground)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(syncStatus.background)
                        .clipShape(Capsule())
                        .lineLimit(1)
                        .frame(maxWidth: 88)
                }
                .buttonStyle(.plain)
                .disabled(!syncStatus.isInteractive || memo == nil)
                .accessibilityLabel(syncLabel)
                .accessibilityIdentifier(DetailMemoChrome.syncStatus)

                if let memo, !memo.isDeleted {
                    headerIconButton(
                        systemImage: "square.and.arrow.up",
                        label: env.preferences.t("Share note", zh: "分享笔记", pl: "Udostępnij notatkę"),
                        id: DetailMemoChrome.share
                    ) {
                        Task { await shareMemo(memo) }
                    }
                    headerIconButton(
                        systemImage: "clock.arrow.circlepath",
                        label: env.preferences.t("Version history", zh: "版本历史", pl: "Historia wersji"),
                        id: DetailMemoChrome.history
                    ) {
                        showRevisions = true
                    }
                    headerIconButton(
                        systemImage: "magnifyingglass",
                        label: env.preferences.t("Search in note", zh: "搜索当前笔记", pl: "Szukaj w notatce"),
                        id: DetailMemoChrome.search
                    ) {
                        withAnimation(Motion.chip) {
                            if searchOpen {
                                closeSearch()
                            } else {
                                searchOpen = true
                            }
                        }
                    }
                    headerIconButton(
                        systemImage: "ellipsis",
                        label: env.preferences.t("Note actions", zh: "笔记操作", pl: "Działania na notatce"),
                        id: DetailMemoChrome.more
                    ) {
                        showMoreMenu = true
                    }
                }
            }
            .accessibilityIdentifier(DetailMemoChrome.header)
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 48)
        .background(AppTheme.card)
        .overlay(alignment: .bottom) {
            Rectangle().fill(AppTheme.cardBorder).frame(height: 1)
        }
        .accessibilityIdentifier(DetailMemoChrome.header)
    }

    private func headerIconButton(
        systemImage: String,
        label: String,
        id: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(AppTheme.slate)
                .frame(width: 32, height: 32)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(id)
    }

    @ViewBuilder
    private func collapsedHeaderTitle(_ memo: MemoDetail) -> some View {
        if memo.isDeleted || blocksRichTextEdit(memo) {
            Text(localizedTitle(for: memo))
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(AppTheme.title)
                .lineLimit(1)
        } else {
            Button {
                onEdit(memo.id, .title)
            } label: {
                Text(localizedTitle(for: memo))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.title)
                    .lineLimit(1)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(env.preferences.t("Edit note title", zh: "编辑笔记标题", pl: "Edytuj tytuł notatki"))
            .accessibilityHint(env.preferences.t("Opens editing with the title focused", zh: "进入编辑并聚焦标题", pl: "Otwiera edycję z kursorem w tytule"))
            .accessibilityIdentifier(DetailMemoChrome.title)
        }
    }

    // MARK: - Banners

    private var conflictBanner: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(env.preferences.t(
                "This note changed on another device or while offline. Copy the local draft, then adopt the cloud version to continue.",
                zh: "云端笔记已在其他标签页、设备，或离线期间被更新。可先复制本地草稿，再采用云端版本后继续编辑。",
                pl: "Ta notatka zmieniła się na innym urządzeniu lub w trybie offline. Skopiuj lokalny szkic, a następnie przyjmij wersję z chmury, aby kontynuować."
            ))
            .font(.system(size: 12))
            .foregroundStyle(AppTheme.dangerStrong)
            .fixedSize(horizontal: false, vertical: true)

            if let lastOutboxError, !lastOutboxError.isEmpty {
                Text(lastOutboxError)
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.dangerStrong)
            }

            HStack(spacing: 8) {
                Button {
                    if let item = conflictItem {
                        // Open full conflict resolution (Android "More")
                        conflictItem = item
                    } else {
                        detectConflict()
                    }
                } label: {
                    Text(env.preferences.t("Resolve", zh: "处理冲突", pl: "Rozwiąż"))
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(AppTheme.dangerAction)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                Button {
                    Task { await copyLocalDraft() }
                } label: {
                    Text(env.preferences.t("Copy local draft", zh: "复制本地草稿", pl: "Kopiuj lokalny szkic"))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(AppTheme.dangerStrong)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(AppTheme.card)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(AppTheme.dangerBorder, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.dangerSurface)
        .overlay(alignment: .bottom) {
            Rectangle().fill(AppTheme.dangerBorder).frame(height: 0.5)
        }
    }

    private var syncBanner: some View {
        let isError = syncStatus == .error
        return VStack(alignment: .leading, spacing: 10) {
            Text(
                lastOutboxError?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
                    ?? (isError
                        ? env.preferences.t("Local changes could not upload. Content is still on device; retry anytime.", zh: "本地改动未能上传到云端。内容仍保存在本机，可立即重试。", pl: "Nie udało się przesłać lokalnych zmian. Treść nadal jest na urządzeniu – możesz spróbować ponownie w dowolnym momencie.")
                        : env.preferences.t("Local changes pending upload. Pull to refresh or tap to sync now.", zh: "本地改动待上传。下拉刷新或点此可立即同步。", pl: "Lokalne zmiany czekają na przesłanie. Przeciągnij w dół, aby odświeżyć, lub dotknij, aby zsynchronizować teraz."))
            )
            .font(.system(size: 12))
            .foregroundStyle(isError ? AppTheme.dangerStrong : AppTheme.infoText)
            .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 8) {
                Button {
                    Task {
                        // Force: ignore outbox backoff so "Memo not found" retries immediately
                        // and can recover via recreate-on-404 in OutboxFlusher.
                        await env.runSyncCycle(force: true)
                        refreshSyncStatus()
                        load()
                    }
                } label: {
                    Text(env.preferences.t("Sync now", zh: "立即同步", pl: "Synchronizuj teraz"))
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(isError ? AppTheme.dangerAction : AppTheme.infoAction)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                if isError {
                    Button {
                        Task { await copyLocalDraft() }
                    } label: {
                        Text(env.preferences.t("Copy local draft", zh: "复制本地草稿", pl: "Kopiuj lokalny szkic"))
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(AppTheme.dangerStrong)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(AppTheme.card)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(AppTheme.dangerBorder, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isError ? AppTheme.dangerSurface : AppTheme.infoSurface)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(isError ? AppTheme.dangerBorder : AppTheme.infoText.opacity(0.55))
                .frame(height: 0.5)
        }
    }

    // MARK: - Body

    private func detailBody(_ memo: MemoDetail) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                if !titleCollapsed || searchOpen {
                    detailTitleRow(memo)
                        .padding(.top, 8)
                        .edgeEverSuccessShine(trigger: pinPulse)

                    HStack(spacing: 8) {
                        notebookAffiliationControl(memo)

                        HStack(spacing: 8) {
                            Image(systemName: "tag")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(AppTheme.secondary)
                            Text(
                                memo.tags.isEmpty
                                    ? env.preferences.t("Add tags, comma separated", zh: "添加标签，用逗号分隔", pl: "Dodaj tagi, oddzielone przecinkami")
                                    : memo.tags.joined(separator: ", ")
                            )
                            .font(.system(size: 12))
                            .foregroundStyle(memo.tags.isEmpty ? AppTheme.muted : AppTheme.secondary)
                            .lineLimit(1)
                            .textSelection(.enabled)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityIdentifier(DetailMemoChrome.tags)
                    }
                    .frame(minHeight: 32)
                    .padding(.top, 6)
                    .accessibilityIdentifier(DetailMemoChrome.metaRow)

                    Text(
                        "\(env.preferences.t("Created", zh: "创建于", pl: "Utworzono")) \(MemoDetailDate.format(memo.createdAt, locale: env.preferences.resolvedLocale))"
                        + " · "
                        + "\(env.preferences.t("Updated", zh: "更新于", pl: "Zaktualizowano")) \(MemoDetailDate.format(memo.updatedAt, locale: env.preferences.resolvedLocale))"
                    )
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.muted)
                    .padding(.top, 4)
                    .textSelection(.enabled)
                }

                if searchOpen {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(AppTheme.secondary)
                        TextField(
                            env.preferences.t("Search in this note", zh: "在当前笔记内搜索", pl: "Szukaj w tej notatce"),
                            text: $searchQuery
                        )
                        .font(.system(size: 14))
                        .textFieldStyle(.plain)
                        .onChange(of: searchQuery) { _, query in
                            searchMatchIndex = 0
                            SharedTipTapRuntime.viewer.search(query, index: 0)
                        }
                        Text(searchMatchCount == 0 ? "0/0" : "\(searchMatchIndex + 1)/\(searchMatchCount)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(AppTheme.secondary)
                            .monospacedDigit()
                        Button {
                            guard searchMatchCount > 0 else { return }
                            let next = (searchMatchIndex - 1 + searchMatchCount) % searchMatchCount
                            SharedTipTapRuntime.viewer.search(searchQuery, index: next)
                        } label: {
                            Image(systemName: "chevron.up")
                                .font(.system(size: 12, weight: .bold))
                                .frame(width: 28, height: 28)
                        }
                        .buttonStyle(.plain)
                        .disabled(searchMatchCount == 0)
                        .accessibilityLabel(env.preferences.t("Previous match", zh: "上一个匹配项", pl: "Poprzednie dopasowanie"))
                        Button {
                            guard searchMatchCount > 0 else { return }
                            let next = (searchMatchIndex + 1) % searchMatchCount
                            SharedTipTapRuntime.viewer.search(searchQuery, index: next)
                        } label: {
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12, weight: .bold))
                                .frame(width: 28, height: 28)
                        }
                        .buttonStyle(.plain)
                        .disabled(searchMatchCount == 0)
                        .accessibilityLabel(env.preferences.t("Next match", zh: "下一个匹配项", pl: "Następne dopasowanie"))
                        Button {
                            closeSearch()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(AppTheme.title)
                                .frame(width: 28, height: 28)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(10)
                    .background(AppTheme.background)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(AppTheme.border, lineWidth: 1)
                    )
                    .padding(.top, 14)
                }

                Rectangle()
                    .fill(AppTheme.border)
                    .frame(height: 1)
                    .padding(.top, titleCollapsed && !searchOpen ? 0 : 16)
                    .padding(.bottom, 8)
            }
            .padding(.horizontal, 16)

            // Always show TipTap at full opacity. A plain contentText overlay looked like a
            // "broken layout" (one wall of text) when bodyReady failed to flip.
            ZStack {
                TipTapWebView(
                    mode: .viewer,
                    documentJSON: (try? memo.contentJson.jsonString())
                        ?? "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}",
                    markdown: memo.contentMarkdown,
                    baseURL: env.session.session.flatMap { URL(string: $0.baseUrl) },
                    token: env.session.session?.token,
                    locale: env.preferences.apiLocale,
                    theme: colorScheme == .dark ? "dark" : "light",
                    placeholder: env.preferences.t("Start writing…", zh: "开始输入…", pl: "Zacznij pisać…"),
                    onChange: nil,
                    onResourcePress: { target in
                        resourceTarget = target
                    },
                    onImagePreview: { source, alt in
                        imagePreview = (source, alt)
                    },
                    onDoubleTap: blocksRichTextEdit(memo) ? nil : {
                        onEdit(memo.id, .body)
                    },
                    onPickImage: nil,
                    onSearchResult: { count, index in
                        searchMatchCount = count
                        searchMatchIndex = index
                    },
                    onReaderScroll: { collapsed in
                        titleCollapsed = collapsed
                    },
                    onImageExportEvent: { event in
                        handleImageExportEvent(event)
                    },
                    onBodyReady: {
                        bodyReady = true
                    },
                    schemaVersion: memo.schemaVersion
                )

                if !bodyReady {
                    ProgressView()
                        .tint(AppTheme.title)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(AppTheme.card.opacity(0.92))
                        .allowsHitTesting(false)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityIdentifier(DetailMemoChrome.body)
            .task(id: memo.id) {
                // Safety net: never leave the spinner forever if a ready callback is missed.
                try? await Task.sleep(nanoseconds: 1_200_000_000)
                if !bodyReady {
                    bodyReady = true
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    // MARK: - Sync helpers

    private var syncStatus: DetailSyncStatus {
        DetailSyncStatus.derive(outboxStatus: outboxStatus, isGlobalSyncing: env.isSyncing)
    }

    private var syncLabel: String {
        syncStatus.label(in: env.preferences.uiLanguage)
    }

    private var availableNotebooks: [Notebook] {
        (try? env.mirror.listNotebooks(scope: env.session.dataScope ?? "")) ?? []
    }

    private func notebookName(for memo: MemoDetail) -> String {
        availableNotebooks.first(where: { $0.id == memo.notebookId })?.name
            ?? env.preferences.t("Notebook", zh: "笔记本", pl: "Notatnik")
    }

    private func notebookAffiliationLabel(_ memo: MemoDetail) -> some View {
        HStack(spacing: 4) {
            Text(notebookName(for: memo))
                .font(.system(size: 12))
                .foregroundStyle(AppTheme.secondary)
                .lineLimit(1)
            Image(systemName: "chevron.down")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(AppTheme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .layoutPriority(0)
    }

    @ViewBuilder
    private func notebookAffiliationControl(_ memo: MemoDetail) -> some View {
        if memo.isDeleted {
            notebookAffiliationLabel(memo)
                .accessibilityIdentifier(DetailMemoChrome.notebook)
        } else {
            Button {
                showNotebookPicker = true
            } label: {
                notebookAffiliationLabel(memo)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(env.preferences.t("Notebook", zh: "所在笔记本", pl: "Notatnik"))
            .accessibilityHint(env.preferences.t("Change the notebook for this note", zh: "更改笔记所属笔记本", pl: "Zmień notatnik tej notatki"))
            .accessibilityIdentifier(DetailMemoChrome.notebook)
        }
    }

    private func handleSyncStatusPress() {
        switch syncStatus {
        case .conflict:
            detectConflict()
        case .error, .pending:
            Task {
                await env.runSyncCycle(force: true)
                refreshSyncStatus()
                load()
            }
        case .synced, .syncing:
            break
        }
    }

    private func detailTitleRow(_ memo: MemoDetail) -> some View {
        HStack(spacing: 6) {
            if memo.isPinned {
                Text("★")
                    .font(.system(size: 16))
                    .foregroundStyle(AppTheme.secondary)
            }
            Button {
                onEdit(memo.id, .title)
            } label: {
                Text(localizedTitle(for: memo))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(AppTheme.title)
                    .lineLimit(4)
                    .multilineTextAlignment(.leading)
            }
            .buttonStyle(.plain)
            .disabled(memo.isDeleted || blocksRichTextEdit(memo))
            .accessibilityLabel(isInfographic(memo)
                ? env.preferences.t("Infographic title", zh: "信息图标题", pl: "Tytuł infografiki")
                : isStructuredTable(memo)
                ? env.preferences.t("Database title", zh: "表格标题", pl: "Tytuł bazy danych")
                : isVisualDiagram(memo)
                ? env.preferences.t("Diagram title", zh: "图表标题", pl: "Tytuł diagramu")
                : env.preferences.t("Edit note title", zh: "编辑笔记标题", pl: "Edytuj tytuł notatki"))
            .accessibilityHint(memo.contentMarkdown.contains("<!-- edgeever-poster-v1:")
                ? env.preferences.t("Edit posters on Web or desktop", zh: "海报请在 Web 或桌面端编辑", pl: "Plakaty edytuj w wersji webowej lub desktopowej")
                : isInfographic(memo)
                ? env.preferences.t("Edit infographics on Web or desktop", zh: "信息图请在 Web 或桌面端编辑", pl: "Infografiki edytuj w wersji webowej lub desktopowej")
                : isStructuredTable(memo)
                ? env.preferences.t("Edit databases on Web or desktop", zh: "多维表格请在 Web 或桌面端编辑", pl: "Bazy danych edytuj w wersji webowej lub desktopowej")
                : isVisualDiagram(memo)
                ? env.preferences.t("Edit visual diagrams on Web or desktop", zh: "可视化图表请在 Web 或桌面端编辑", pl: "Diagramy wizualne edytuj w wersji webowej lub desktopowej")
                : env.preferences.t("Opens editing with the title focused", zh: "进入编辑并聚焦标题", pl: "Otwiera edycję z kursorem w tytule"))
            .accessibilityIdentifier(DetailMemoChrome.title)
        }
    }

    private func load() {
        guard let scope = env.session.dataScope else { return }
        do {
            memo = try env.mirror.resolveMemo(scope: scope, id: memoId)
            if memo == nil {
                error = env.preferences.t("Note not in local cache. Sync first.", zh: "本地未找到该笔记，请先同步。", pl: "Notatki nie ma w lokalnej pamięci podręcznej. Najpierw zsynchronizuj.")
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func isVisualDiagram(_ memo: MemoDetail) -> Bool {
        memo.contentMarkdown.contains("<!-- edgeever-diagram-v1:")
    }

    private func isStructuredTable(_ memo: MemoDetail) -> Bool {
        memo.contentMarkdown.contains("<!-- edgeever-table-v1:")
    }

    private func isInfographic(_ memo: MemoDetail) -> Bool {
        memo.contentMarkdown.contains("<!-- edgeever-infographic-v1:")
    }

    private func blocksRichTextEdit(_ memo: MemoDetail) -> Bool {
        isVisualDiagram(memo) || isStructuredTable(memo) || isInfographic(memo) || memo.contentMarkdown.contains("<!-- edgeever-poster-v1:")
    }

    private func refreshSyncStatus() {
        guard let scope = env.session.dataScope else {
            outboxStatus = nil
            lastOutboxError = nil
            return
        }
        let items = (try? env.outbox.listItems(scope: scope)) ?? []
        if let item = items.first(where: { $0.memoId == memoId }) {
            outboxStatus = item.status
            lastOutboxError = item.lastError
            if item.status == .conflict {
                conflictItem = item
            }
        } else {
            outboxStatus = nil
            lastOutboxError = nil
        }
    }

    private func detectConflict() {
        guard let scope = env.session.dataScope else { return }
        let items = (try? env.outbox.listItems(scope: scope)) ?? []
        conflictItem = items.first { $0.memoId == memoId && $0.status == .conflict }
        refreshSyncStatus()
    }

    private func copyLocalDraft() async {
        guard let memo else { return }
        let text = [localizedTitle(for: memo), memo.contentMarkdown].filter { !$0.isEmpty }.joined(separator: "\n\n")
        UIPasteboard.general.string = text
    }

    private func isTemporaryMemoId(_ id: String) -> Bool {
        id.hasPrefix("local:") || id.hasPrefix("local_")
    }

    private func closeSearch() {
        searchOpen = false
        searchQuery = ""
        searchMatchCount = 0
        searchMatchIndex = 0
        SharedTipTapRuntime.viewer.search("", index: 0)
    }

    private func localizedTitle(for memo: MemoDetail) -> String {
        MemoTitle.displayTitle(memo.title, untitledLabel: env.preferences.t("Untitled note", zh: "无标题笔记", pl: "Notatka bez tytułu"))
    }

    private func moveMemoToNotebook(_ memo: MemoDetail, notebookId: String) async {
        guard !memo.isDeleted else { return }
        guard !notebookId.isEmpty, notebookId != memo.notebookId else { return }
        guard let scope = env.session.dataScope else { return }
        let revision = memo.revision
        let contentHash = memo.contentHash
        var updated = memo
        updated.notebookId = notebookId
        updated.updatedAt = EdgeEverDate.nowString()
        do {
            try env.mirror.upsertMemo(scope: scope, memo: updated)
            self.memo = updated
            try env.outbox.enqueueUpdate(
                scope: scope,
                payload: MemoUpdatePayload(
                    memoId: updated.id,
                    expectedRevision: revision,
                    expectedContentHash: contentHash,
                    title: updated.title ?? "",
                    contentMarkdown: updated.contentMarkdown,
                    contentJson: try? updated.contentJson.jsonString(),
                    notebookId: notebookId,
                    tags: updated.tags
                )
            )
            await env.runSyncCycle()
            load()
            refreshSyncStatus()
        } catch {
            self.error = error.localizedDescription
            load()
        }
    }

    private func togglePin(_ memo: MemoDetail) async {
        guard let scope = env.session.dataScope else { return }
        do {
            let updated = try await env.session.client.updateMemo(
                id: memo.id,
                expectedRevision: nil,
                expectedContentHash: nil,
                editSessionId: nil,
                notebookId: nil,
                title: nil,
                isPinned: !memo.isPinned,
                contentMarkdown: nil,
                tags: nil
            )
            try env.mirror.upsertMemo(scope: scope, memo: updated)
            self.memo = updated
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func openInitialShareImageIfReady() {
        guard initialShareImage, bodyReady, memo?.isDeleted == false, !initialShareImageHandled else { return }
        initialShareImageHandled = true
        imageShareOptionsOpen = true
    }

    private func shareMemo(_ memo: MemoDetail) async {
        do {
            let share = try await env.session.client.createMemoShare(memoId: memo.id)
            let base = env.session.session?.baseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/")) ?? ""
            guard let url = URL(string: "\(base)/share/\(share.token)") else { return }
            let displayTitle = MemoTitle.displayTitle(memo.title, untitledLabel: env.preferences.t("Untitled note", zh: "无标题笔记", pl: "Notatka bez tytułu"))
            memoSharePayload = MemoSharePayload(message: "\(displayTitle)\n\(url.absoluteString)", url: url)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func deleteMemo(_ memo: MemoDetail) async {
        guard let scope = env.session.dataScope else { return }
        do {
            if memo.id.hasPrefix("local:") {
                try env.outbox.cancelMemo(scope: scope, memoId: memo.id)
                try env.mirror.deleteMemo(scope: scope, id: memo.id)
            } else {
                _ = try env.mirror.softDeleteMemo(scope: scope, id: memo.id)
                try await env.session.client.deleteMemo(id: memo.id, permanent: false)
            }
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func exportMemoImage(
        _ memo: MemoDetail,
        format: String,
        theme: String = "mint",
        fontStyle: String = "auto",
        fontSize: String = "lg",
        cardWidth: String = "wide",
        showTitle: Bool = false,
        showNotebook: Bool = false,
        showTags: Bool = false,
        showUpdatedAt: Bool = true,
        showBranding: Bool = true,
        intent: MemoImageExportIntent = .share
    ) {
        guard !imageExporting, bodyReady else { return }
        let requestId = UUID().uuidString
        imageExportBuffer.start(requestId: requestId)
        imageExportRequestId = requestId
        imageFontRecoveryId = requestId
        imageFontsRecovered = false
        imageFontStatus = "loading"
        retryImageFonts = {
            exportMemoImage(memo, format: format, theme: theme, fontStyle: fontStyle, fontSize: fontSize,
                cardWidth: cardWidth, showTitle: showTitle, showNotebook: showNotebook, showTags: showTags,
                showUpdatedAt: showUpdatedAt, showBranding: showBranding, intent: .preview)
        }
        imageExportIntent = intent
        imageExporting = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 60) {
            guard imageExportRequestId == requestId else { return }
            imageExportBuffer.cancel(requestId: requestId)
            imageExportRequestId = nil
            imageExporting = false
            imageExportMessage = MemoImageExportMessage(
                title: env.preferences.t("Export failed", zh: "导出失败", pl: "Eksport nie powiódł się"),
                message: env.preferences.t(
                    "Image generation timed out. Try a smaller font size or a shorter note.",
                    zh: "生成图片超时。请调小导出字号，或尝试较短的笔记。",
                    ja: "画像の生成がタイムアウトしました。文字を小さくするか、短いノートでお試しください。",
                    pl: "Generowanie obrazu przekroczyło limit czasu. Spróbuj mniejszej czcionki lub krótszej notatki."
                )
            )
        }
        SharedTipTapRuntime.viewer.exportNoteImage(request: [
            "requestId": requestId,
            "format": format,
            "title": MemoTitle.displayTitle(memo.title, untitledLabel: env.preferences.t("Untitled note", zh: "无标题笔记", pl: "Notatka bez tytułu")),
            "fallbackTitle": env.preferences.t("Untitled note", zh: "无标题笔记", pl: "Notatka bez tytułu"),
            "notebook": showNotebook ? notebookName(for: memo) : "",
            "tags": showTags ? memo.tags : [],
            "updatedAt": showUpdatedAt ? formattedImageExportDate(memo.updatedAt) : "",
            "theme": theme,
            "fontStyle": fontStyle,
            "fontSize": fontSize,
            "cardWidth": cardWidth,
            "showTitle": showTitle,
            "showNotebook": showNotebook,
            "showTags": showTags,
            "showUpdatedAt": showUpdatedAt,
            "branding": showBranding,
        ])
    }

    private func formattedImageExportDate(_ rawValue: String) -> String {
        let parsers = [ISO8601DateFormatter.edgeEver, ISO8601DateFormatter.edgeEverFallback]
        guard let date = parsers.lazy.compactMap({ $0.date(from: rawValue) }).first else { return rawValue }
        let formatter = DateFormatter()
        formatter.locale = env.preferences.uiLanguage == .polish
            ? Locale(identifier: "pl_PL")
            : (env.preferences.isEnglish ? Locale(identifier: "en_US") : Locale(identifier: "zh_CN"))
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    private func handleImageExportEvent(_ event: [String: Any]) {
        if event["type"] as? String == "imageExportFontsReady" {
            guard event["requestId"] as? String == imageFontRecoveryId else { return }
            imageFontsRecovered = true
            if !imageExporting, imageExportPreviewPayload?.fontFallback == true { retryImageFonts?() }
            return
        }
        if event["type"] as? String == "imageExportFontStatus" {
            guard event["requestId"] as? String == imageExportRequestId else { return }
            imageFontStatus = event["status"] as? String ?? "ready"
            return
        }
        switch imageExportBuffer.accept(event) {
        case .none:
            break
        case let .failure(message):
            imageExportRequestId = nil
            imageExporting = false
            let explanation: String
            switch message {
            case "NOTE_IMAGE_TOO_LONG":
                explanation = env.preferences.t(
                    "This note is too long to export clearly as one image.",
                    zh: "笔记太长，无法清晰地导出为单张图片。",
                    ja: "ノートが長すぎるため、1枚の画像として鮮明に書き出せません。",
                    pl: "Notatka jest zbyt długa, aby wyeksportować ją czytelnie jako jeden obraz."
                )
            case "NOTE_IMAGE_RENDER_FAILED":
                explanation = env.preferences.t(
                    "The image could not be generated. Please try again.",
                    zh: "图片生成失败，请稍后重试。",
                    ja: "画像を生成できませんでした。もう一度お試しください。",
                    pl: "Nie udało się wygenerować obrazu. Spróbuj ponownie."
                )
            default:
                explanation = message
            }
            imageExportMessage = MemoImageExportMessage(
                title: env.preferences.t("Export failed", zh: "导出失败", pl: "Eksport nie powiódł się"),
                message: explanation
            )
        case let .complete(data, filename, metadata):
            imageExportRequestId = nil
            imageExporting = false
            do {
                let directory = FileManager.default.temporaryDirectory.appendingPathComponent("EdgeEverNoteExports", isDirectory: true)
                    .appendingPathComponent(UUID().uuidString, isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let safeFilename = (filename as NSString).lastPathComponent
                let url = directory.appendingPathComponent(safeFilename)
                try data.write(to: url, options: .atomic)
                if imageExportIntent == .preview || metadata.fontFallback {
                    imageExportPreviewPayload = MemoImageExportPreviewPayload(
                        id: imageExportPreviewPayload?.id ?? UUID(),
                        fontFallback: metadata.fontFallback,
                        url: url,
                        width: metadata.width,
                        height: metadata.height,
                        totalImages: metadata.totalImages,
                        failedImages: metadata.failedImages
                    )
                    if metadata.fontFallback, imageFontsRecovered {
                        let recoveryId = imageFontRecoveryId
                        DispatchQueue.main.async {
                            if imageFontRecoveryId == recoveryId, imageExportPreviewPayload != nil { retryImageFonts?() }
                        }
                    }
                } else {
                    imageExportSharePayload = MemoImageExportSharePayload(url: url)
                }
            } catch {
                imageExportMessage = MemoImageExportMessage(
                    title: env.preferences.t("Export failed", zh: "导出失败", pl: "Eksport nie powiódł się"),
                    message: error.localizedDescription
                )
            }
        }
    }
}

private struct MemoSharePayload: Identifiable {
    let id = UUID()
    let message: String
    let url: URL
}

private struct MemoImageExportSharePayload: Identifiable {
    let id = UUID()
    let url: URL
}

private struct MemoImageExportPreviewPayload: Identifiable {
    let id: UUID
    let fontFallback: Bool
    let url: URL
    let width: Int
    let height: Int
    let totalImages: Int
    let failedImages: Int
}

private struct MemoImageExportDocumentPayload: Identifiable {
    let id = UUID()
    let url: URL
}

private enum MemoImageExportIntent {
    case preview
    case share
}

private struct MemoImageExportMessage: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}

private struct MemoImageExportPreviewView: View {
    @Environment(\.dismiss) private var dismiss
    let payload: MemoImageExportPreviewPayload
    let isLoadingFonts: Bool
    let onRetryFonts: () -> Void
    let isEnglish: Bool
    var isPolish: Bool = false
    let onCopy: () -> Void
    let onSave: () -> Void
    let onShare: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 12) {
                        if let image = UIImage(contentsOfFile: payload.url.path) {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFit()
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                .shadow(color: .black.opacity(0.16), radius: 12, y: 5)
                        } else {
                            ContentUnavailableView(
                                localized("Preview unavailable", zh: "无法预览", pl: "Podgląd niedostępny"),
                                systemImage: "photo.badge.exclamationmark"
                            )
                        }
                        if payload.fontFallback || isLoadingFonts {
                            if isLoadingFonts {
                                ProgressView(localized("Loading font…", zh: "字体加载中…", pl: "Ładowanie czcionki…"))
                            } else {
                                warning(localized(
                                    "Temporarily using substitute fonts. The original fonts will be restored automatically when loaded.",
                                    zh: "暂时使用替代字体，加载成功后将自动恢复",
                                    pl: "Tymczasowo używane są czcionki zastępcze. Po załadowaniu oryginalne czcionki zostaną przywrócone automatycznie."
                                ))
                                Button(localized("Retry", zh: "重试", pl: "Ponów próbę"), action: onRetryFonts)
                            }
                        }
                        if payload.failedImages > 0 {
                            warning(localized(
                                "\(payload.failedImages) of \(payload.totalImages) note image(s) could not be included.",
                                zh: "笔记中的 \(payload.totalImages) 张图片有 \(payload.failedImages) 张未能包含。",
                                pl: "Nie udało się dołączyć obrazów z notatki: \(payload.failedImages) z \(payload.totalImages)."
                            ))
                        }
                        if payload.height > 12_000 {
                            warning(localized(
                                "This is a long image. Some social apps may reduce its quality; keep the saved original.",
                                zh: "图片较长，部分社交平台可能会压缩画质；建议保留保存的原图。",
                                pl: "To długi obraz. Niektóre aplikacje społecznościowe mogą obniżyć jego jakość – zachowaj zapisany oryginał."
                            ))
                        }
                    }
                    .padding(16)
                }
                Divider()
                HStack(spacing: 8) {
                    previewButton(localized("Copy", zh: "复制图片", pl: "Kopiuj"), systemImage: "doc.on.doc", action: onCopy)
                    previewButton(localized("Save", zh: "保存图片", pl: "Zapisz"), systemImage: "square.and.arrow.down", action: onSave)
                    Button(action: onShare) {
                        Label(localized("Share", zh: "系统分享", pl: "Udostępnij"), systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 22 / 255, green: 160 / 255, blue: 110 / 255))
                }
                .font(.system(size: 13, weight: .semibold))
                .padding(12)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle(localized("Image Preview", zh: "图片预览", pl: "Podgląd obrazu"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localized("Close", zh: "关闭", pl: "Zamknij")) { dismiss() }
                }
            }
        }
    }

    /// English unless the UI is Chinese or Polish (matches the caller's `isEnglish` / `isPolish`).
    private func localized(_ en: String, zh: String, pl: String) -> String {
        isPolish ? pl : (isEnglish ? en : zh)
    }

    private func warning(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 13))
            .foregroundStyle(Color.orange)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
            .background(Color.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 8))
    }

    private func previewButton(_ title: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.bordered)
    }
}

private struct MemoImageDocumentExportView: UIViewControllerRepresentable {
    let fileURL: URL
    let onFinish: (Result<Bool, Error>) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onFinish: onFinish) }

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forExporting: [fileURL], asCopy: true)
        picker.delegate = context.coordinator
        picker.shouldShowFileExtensions = true
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    final class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onFinish: (Result<Bool, Error>) -> Void
        init(onFinish: @escaping (Result<Bool, Error>) -> Void) { self.onFinish = onFinish }
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            onFinish(.success(!urls.isEmpty))
        }
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            onFinish(.success(false))
        }
    }
}

private final class MemoImageExportBuffer {
    struct Metadata {
        let fontFallback: Bool
        let width: Int
        let height: Int
        let totalImages: Int
        let failedImages: Int
    }

    enum Result {
        case none
        case complete(Data, filename: String, metadata: Metadata)
        case failure(String)
    }

    private var requestId: String?
    private var chunks: [String] = []

    func start(requestId: String) {
        self.requestId = requestId
        chunks.removeAll(keepingCapacity: true)
    }

    func cancel(requestId: String) {
        guard self.requestId == requestId else { return }
        self.requestId = nil
        chunks.removeAll(keepingCapacity: false)
    }

    func accept(_ event: [String: Any]) -> Result {
        guard let currentRequestId = requestId,
              event["requestId"] as? String == currentRequestId,
              let type = event["type"] as? String
        else { return .none }

        if type == "imageExportChunk" {
            if let chunk = event["chunk"] as? String { chunks.append(chunk) }
            return .none
        }

        defer {
            requestId = nil
            chunks.removeAll(keepingCapacity: false)
        }
        if type == "imageExportError" {
            return .failure(event["message"] as? String ?? "Image export failed")
        }
        guard type == "imageExportComplete",
              let filename = event["filename"] as? String,
              let data = Data(base64Encoded: chunks.joined())
        else { return .failure("Image export returned invalid data") }
        let metadata = Metadata(
            fontFallback: event["fontFallback"] as? Bool ?? false,
            width: (event["width"] as? NSNumber)?.intValue ?? 0,
            height: (event["height"] as? NSNumber)?.intValue ?? 0,
            totalImages: (event["totalImages"] as? NSNumber)?.intValue ?? 0,
            failedImages: (event["failedImages"] as? NSNumber)?.intValue ?? 0
        )
        return .complete(data, filename: filename, metadata: metadata)
    }
}

// MARK: - String helper

private extension String {
    var nilIfEmpty: String? {
        let t = trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }
}

// MARK: - Version history (Android RevisionHistoryModal parity)

/// Android `RevisionHistoryModal`: header + selected summary/restore + timeline pills + markdown preview.
