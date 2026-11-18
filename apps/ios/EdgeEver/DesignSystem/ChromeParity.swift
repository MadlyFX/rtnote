import SwiftUI

// MARK: - Create / edit chrome (Android createMemo* tokens)

/// Accessibility / role ids matching Android create memo shell.
enum CreateMemoChrome {
    static let root = "createMemoSafeArea"
    static let header = "createMemoHeader"
    static let back = "createMemoBackButton"
    static let status = "createMemoStatus"
    static let template = "createMemoTemplateButton"
    static let done = "createMemoDoneButton"
    static let title = "createMemoTitleInput"
    static let metaRow = "createMemoMetaRow"
    static let notebook = "createMemoNotebookButton"
    static let tags = "createMemoTagsInput"
    static let editorFrame = "createMemoEditorFrame"
    static let imageTool = "createMemoImageTool"
}

/// Save-status chip labels (Android create / rich-edit header status).
enum CreateSaveStatus: Equatable, Sendable {
    case starting
    case saved
    case saving
    case creating
    case uploading
    case error

    func label(in language: AppUILanguage) -> String {
        switch self {
        case .starting: return language.text("Starting", zh: "正在启动", pl: "Uruchamianie")
        case .saved: return language.text("Saved", zh: "已保存", pl: "Zapisano")
        case .saving: return language.text("Saving", zh: "保存中", pl: "Zapisywanie")
        case .creating: return language.text("Creating", zh: "正在创建", pl: "Tworzenie")
        case .uploading: return language.text("Uploading", zh: "正在上传", pl: "Przesyłanie")
        case .error: return language.text("Save failed", zh: "保存失败", pl: "Nie udało się zapisać")
        }
    }

    var isActive: Bool {
        switch self {
        case .saving, .creating, .uploading: return true
        case .starting, .saved, .error: return false
        }
    }

    /// Derive chip state from editor lifecycle flags (same priority as Android).
    static func derive(
        editorReady: Bool,
        isDirty: Bool,
        isSaving: Bool,
        isCreating: Bool,
        isUploading: Bool,
        hasError: Bool
    ) -> CreateSaveStatus {
        if isUploading { return .uploading }
        if isCreating { return .creating }
        if hasError { return .error }
        if isSaving || isDirty { return .saving }
        if editorReady { return .saved }
        return .starting
    }
}

// MARK: - Detail chrome (Android detailHeader* / detailEditFab)

enum DetailMemoChrome {
    static let root = "detailSafeArea"
    static let header = "detailHeader"
    static let back = "detailHeaderBack"
    static let syncStatus = "detailSyncStatus"
    static let share = "detailHeaderShare"
    static let history = "detailHeaderHistory"
    static let search = "detailHeaderSearch"
    static let more = "detailHeaderMore"
    static let title = "detailTitle"
    static let metaRow = "detailMetaRow"
    static let notebook = "detailNotebook"
    static let tags = "detailTags"
    static let editFab = "detailEditFab"
    static let body = "detailBody"
}

/// Detail sync chip (Android `detailSyncStatus*` + label mapping).
enum DetailSyncStatus: Equatable, Sendable {
    case synced
    case pending
    case syncing
    case conflict
    case error

    func label(in language: AppUILanguage) -> String {
        switch self {
        case .synced: return language.text("Synced", zh: "已同步", pl: "Zsynchronizowano")
        case .pending: return language.text("Pending", zh: "待同步", pl: "Oczekuje")
        case .syncing: return language.text("Saving", zh: "保存中", pl: "Zapisywanie")
        case .conflict: return language.text("Conflict", zh: "同步冲突", pl: "Konflikt")
        case .error: return language.text("Sync failed", zh: "同步失败", pl: "Błąd synchronizacji")
        }
    }

    var isInteractive: Bool {
        switch self {
        case .conflict, .error, .pending: return true
        case .synced, .syncing: return false
        }
    }

    /// Map outbox row + global sync flag to chip status (Android parity).
    static func derive(outboxStatus: OutboxStatus?, isGlobalSyncing: Bool) -> DetailSyncStatus {
        if isGlobalSyncing { return .syncing }
        guard let outboxStatus else { return .synced }
        switch outboxStatus {
        case .pending: return .pending
        case .syncing: return .syncing
        case .conflict: return .conflict
        case .error: return .error
        }
    }

    var background: Color {
        switch self {
        case .synced: return AppTheme.searchFill
        case .pending: return AppTheme.infoSurface
        case .syncing: return AppTheme.searchFill
        case .conflict: return AppTheme.warningSurface
        case .error: return AppTheme.dangerSurface
        }
    }

    var foreground: Color {
        switch self {
        case .synced: return AppTheme.secondary
        case .pending: return AppTheme.infoText
        case .syncing: return AppTheme.secondary
        case .conflict: return AppTheme.warningText
        case .error: return AppTheme.danger
        }
    }
}
