import AVFoundation
import Observation
import SwiftUI
import UIKit

/// A finished recording on disk, ready to be inserted and uploaded.
struct VoiceMemoRecording: Equatable, Sendable {
    let clientId: String
    let fileURL: URL
    let filename: String
    let mimeType: String
    let byteSize: Int
    let durationMs: Int
    let reachedLimit: Bool
}

/// Records M4A/AAC with AVAudioRecorder. Recording keeps running with the screen
/// locked (the app declares the `audio` background mode). The file is written
/// straight into Application Support so it survives until it is uploaded.
@MainActor
@Observable
final class VoiceMemoRecorder: NSObject {
    enum Phase: Equatable {
        case idle
        case preparing
        case recording
        case paused
        case finished
        case permissionDenied
        case unavailable
    }

    static let levelCount = 36

    private(set) var phase: Phase = .idle
    private(set) var elapsed: TimeInterval = 0
    private(set) var levels: [Float] = Array(repeating: 0, count: VoiceMemoRecorder.levelCount)
    /// Set when the maximum length was reached; recording is paused at that point.
    private(set) var reachedLimit = false
    let maxDuration: TimeInterval

    @ObservationIgnored private var recorder: AVAudioRecorder?
    @ObservationIgnored private var tickTask: Task<Void, Never>?
    private let clientId = VoiceMemoFiles.newClientId()
    private let startedAt = Date()
    private let filenamePrefix: String

    init(maxMinutes: Int, filenamePrefix: String) {
        maxDuration = TimeInterval(max(1, maxMinutes) * 60)
        self.filenamePrefix = filenamePrefix
        super.init()
    }

    var isActive: Bool { phase == .recording || phase == .paused || phase == .preparing }

    func start() async {
        guard phase == .idle else { return }
        phase = .preparing
        guard await Self.requestPermission() else {
            phase = .permissionDenied
            return
        }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .default)
            try session.setActive(true)
            let url = try VoiceMemoFiles.fileURL(clientId: clientId)
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44_100,
                AVNumberOfChannelsKey: 1,
                AVEncoderBitRateKey: 64_000,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            ]
            let recorder = try AVAudioRecorder(url: url, settings: settings)
            recorder.isMeteringEnabled = true
            guard recorder.prepareToRecord(), recorder.record() else {
                recorder.deleteRecording()
                throw CocoaError(.fileWriteUnknown)
            }
            self.recorder = recorder
            phase = .recording
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(handleInterruption(_:)),
                name: AVAudioSession.interruptionNotification,
                object: session
            )
            startTicking()
        } catch {
            NSLog("VoiceMemoRecorder: start failed %@", String(describing: error))
            deactivateSession()
            phase = .unavailable
        }
    }

    func pause() {
        guard phase == .recording, let recorder else { return }
        recorder.pause()
        elapsed = recorder.currentTime
        phase = .paused
    }

    func resume() {
        guard phase == .paused, !reachedLimit, let recorder else { return }
        try? AVAudioSession.sharedInstance().setActive(true)
        if recorder.record() {
            phase = .recording
        }
    }

    /// Stops and returns the recording, or nil when nothing was captured.
    func stop() -> VoiceMemoRecording? {
        guard let recorder, phase == .recording || phase == .paused else { return nil }
        let duration = max(recorder.currentTime, elapsed)
        let url = recorder.url
        recorder.stop()
        finish()
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        guard size > 0, duration > 0 else {
            try? FileManager.default.removeItem(at: url)
            return nil
        }
        return VoiceMemoRecording(
            clientId: clientId,
            fileURL: url,
            filename: VoiceMemoFiles.displayFilename(date: startedAt, prefix: filenamePrefix),
            mimeType: VoiceMemoFiles.mimeType,
            byteSize: size,
            durationMs: Int((duration * 1000).rounded()),
            reachedLimit: reachedLimit
        )
    }

    func discard() {
        if let recorder {
            recorder.stop()
            recorder.deleteRecording()
        }
        finish()
    }

    private func finish() {
        tickTask?.cancel()
        tickTask = nil
        NotificationCenter.default.removeObserver(self, name: AVAudioSession.interruptionNotification, object: nil)
        recorder = nil
        deactivateSession()
        phase = .finished
    }

    private func deactivateSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setActive(false, options: .notifyOthersOnDeactivation)
        // Leave the app ready for note playback in the editor.
        try? session.setCategory(.playback, mode: .default)
    }

    private func startTicking() {
        tickTask?.cancel()
        tickTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 100_000_000)
                self?.tick()
            }
        }
    }

    private func tick() {
        guard let recorder else { return }
        if phase == .recording {
            recorder.updateMeters()
            let power = recorder.averagePower(forChannel: 0)
            // -50 dB and below reads as silence; 0 dB is full scale.
            let level = max(0, min(1, (power + 50) / 50))
            levels.removeFirst()
            levels.append(level)
            elapsed = recorder.currentTime
            if elapsed >= maxDuration {
                reachedLimit = true
                pause()
            }
        }
    }

    @objc nonisolated private func handleInterruption(_ notification: Notification) {
        let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
        guard let raw, AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
        Task { @MainActor [weak self] in
            // The system pauses the recorder (a call, Siri); reflect it so the user can resume.
            guard let self, self.phase == .recording else { return }
            self.elapsed = self.recorder?.currentTime ?? self.elapsed
            self.phase = .paused
        }
    }

    private static func requestPermission() async -> Bool {
        switch AVAudioApplication.shared.recordPermission {
        case .granted:
            return true
        case .denied:
            return false
        default:
            return await AVAudioApplication.requestRecordPermission()
        }
    }
}

/// Sheet with the live timer, level meter and record controls. Recording starts when it opens.
struct VoiceMemoRecorderSheet: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss
    @State private var recorder: VoiceMemoRecorder
    @State private var confirmDiscard = false
    @State private var delivered = false
    let onFinish: (VoiceMemoRecording) -> Void

    init(maxMinutes: Int, filenamePrefix: String, onFinish: @escaping (VoiceMemoRecording) -> Void) {
        _recorder = State(initialValue: VoiceMemoRecorder(maxMinutes: maxMinutes, filenamePrefix: filenamePrefix))
        self.onFinish = onFinish
    }

    var body: some View {
        VStack(spacing: 18) {
            HStack {
                Text(env.preferences.t("语音备忘", en: "Voice memo", ja: "ボイスメモ", pl: "Notatka głosowa"))
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundStyle(AppTheme.title)
                Spacer()
                if !recorder.isActive {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(AppTheme.title)
                            .frame(width: 38, height: 38)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(env.preferences.t("关闭", en: "Close", ja: "閉じる", pl: "Zamknij"))
                }
            }

            Text(VoiceMemoFiles.formatDuration(recorder.elapsed))
                .font(.system(size: 44, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(AppTheme.title)
                .accessibilityLabel(env.preferences.t("录音时长", en: "Recording time", ja: "録音時間", pl: "Czas nagrania"))
                .accessibilityValue(VoiceMemoFiles.formatDuration(recorder.elapsed))

            levelMeter

            Text(statusText)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(statusIsError ? AppTheme.danger : AppTheme.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)

            if recorder.phase == .permissionDenied {
                Button(env.preferences.t("前往设置", en: "Open settings", ja: "設定を開く", pl: "Otwórz ustawienia")) {
                    guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                    UIApplication.shared.open(url)
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(AppTheme.accent)
            }

            if recorder.isActive {
                controls
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 14)
        .padding(.bottom, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(AppTheme.card)
        .interactiveDismissDisabled(recorder.isActive)
        .task { await recorder.start() }
        // Never drop a recording: if the sheet goes away mid-recording, keep what was captured.
        .onDisappear {
            if recorder.isActive { save() }
        }
        .onChange(of: recorder.reachedLimit) { _, reached in
            if reached { save() }
        }
        .confirmationDialog(
            env.preferences.t("要丢弃这段录音吗？", en: "Discard this recording?", ja: "この録音を破棄しますか？", pl: "Odrzucić to nagranie?"),
            isPresented: $confirmDiscard,
            titleVisibility: .visible
        ) {
            Button(env.preferences.t("丢弃", en: "Discard", ja: "破棄", pl: "Odrzuć"), role: .destructive) {
                recorder.discard()
                dismiss()
            }
            Button(env.preferences.t("取消", en: "Cancel", ja: "キャンセル", pl: "Anuluj"), role: .cancel) {}
        }
        .accessibilityIdentifier("voiceMemoRecorderSheet")
    }

    private var levelMeter: some View {
        HStack(alignment: .center, spacing: 3) {
            ForEach(Array(recorder.levels.enumerated()), id: \.offset) { _, level in
                Capsule()
                    .fill(recorder.phase == .recording ? AppTheme.accent : AppTheme.muted)
                    .frame(width: 4, height: 4 + CGFloat(level) * 40)
            }
        }
        .frame(height: 48)
        .animation(.linear(duration: 0.1), value: recorder.levels)
        .accessibilityElement()
        .accessibilityLabel(env.preferences.t("麦克风音量", en: "Microphone level", ja: "マイク音量", pl: "Poziom mikrofonu"))
        .accessibilityValue("\(Int((recorder.levels.last ?? 0) * 100))%")
    }

    private var controls: some View {
        HStack(spacing: 28) {
            controlButton(
                systemImage: "trash",
                label: env.preferences.t("丢弃", en: "Discard", ja: "破棄", pl: "Odrzuć"),
                tint: AppTheme.danger,
                prominent: false
            ) {
                confirmDiscard = true
            }
            .disabled(recorder.phase == .preparing)

            controlButton(
                systemImage: recorder.phase == .paused ? "mic.fill" : "pause.fill",
                label: recorder.phase == .paused
                    ? env.preferences.t("继续", en: "Resume", ja: "再開", pl: "Wznów")
                    : env.preferences.t("暂停", en: "Pause", ja: "一時停止", pl: "Wstrzymaj"),
                tint: AppTheme.title,
                prominent: false
            ) {
                if recorder.phase == .paused { recorder.resume() } else { recorder.pause() }
            }
            .disabled(recorder.phase == .preparing || recorder.reachedLimit)

            controlButton(
                systemImage: "stop.fill",
                label: env.preferences.t("停止并保存", en: "Stop and save", ja: "停止して保存", pl: "Zatrzymaj i zapisz"),
                tint: AppTheme.accent,
                prominent: true
            ) {
                save()
            }
            .disabled(recorder.phase == .preparing)
        }
    }

    private func controlButton(
        systemImage: String,
        label: String,
        tint: Color,
        prominent: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: systemImage)
                    .font(.system(size: prominent ? 24 : 20, weight: .semibold))
                    .foregroundStyle(prominent ? Color.white : tint)
                    .frame(width: prominent ? 64 : 52, height: prominent ? 64 : 52)
                    .background(prominent ? tint : AppTheme.searchFill)
                    .clipShape(Circle())
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(AppTheme.secondary)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private var statusIsError: Bool {
        recorder.phase == .permissionDenied || recorder.phase == .unavailable
    }

    private var statusText: String {
        let p = env.preferences
        switch recorder.phase {
        case .idle, .preparing:
            return p.t("正在启动麦克风…", en: "Starting the microphone…", ja: "マイクを起動しています…", pl: "Uruchamianie mikrofonu…")
        case .recording:
            let limit = VoiceMemoFiles.formatDuration(recorder.maxDuration)
            return p.t("正在录音 · 将在 \(limit) 停止", en: "Recording · Stops at \(limit)", ja: "録音中 · \(limit) で停止します", pl: "Nagrywanie · Zatrzyma się po \(limit)")
        case .paused:
            return p.t("已暂停", en: "Paused", ja: "一時停止中", pl: "Wstrzymano")
        case .finished:
            return p.t("正在保存录音…", en: "Saving the recording…", ja: "録音を保存しています…", pl: "Zapisywanie nagrania…")
        case .permissionDenied:
            return p.t(
                "麦克风权限被拒绝。请在系统设置中允许 RTNote 使用麦克风后重试。",
                en: "Microphone access was denied. Allow RTNote to use the microphone in Settings, then try again.",
                ja: "マイクへのアクセスが拒否されました。設定で RTNote にマイクの使用を許可してから、もう一度お試しください。",
                pl: "Odmówiono dostępu do mikrofonu. Zezwól RTNote na używanie mikrofonu w Ustawieniach i spróbuj ponownie."
            )
        case .unavailable:
            return p.t("无法开始录音。", en: "Recording could not start.", ja: "録音を開始できませんでした。", pl: "Nie można rozpocząć nagrywania.")
        }
    }

    private func save() {
        guard !delivered else { return }
        delivered = true
        if let recording = recorder.stop() {
            onFinish(recording)
        }
        dismiss()
    }
}
