import XCTest
@testable import RTNote

@MainActor
final class VoiceMemoTests: XCTestCase {
    func testByteRangeParsing() {
        XCTAssertNil(RTNoteResourceSchemeHandler.byteRange(header: nil, total: 100))
        XCTAssertEqual(RTNoteResourceSchemeHandler.byteRange(header: "bytes=0-1", total: 100), 0..<2)
        XCTAssertEqual(RTNoteResourceSchemeHandler.byteRange(header: "bytes=10-", total: 100), 10..<100)
        XCTAssertEqual(RTNoteResourceSchemeHandler.byteRange(header: "bytes=90-500", total: 100), 90..<100)
        XCTAssertEqual(RTNoteResourceSchemeHandler.byteRange(header: "bytes=-20", total: 100), 80..<100)
        XCTAssertNil(RTNoteResourceSchemeHandler.byteRange(header: "bytes=100-", total: 100))
        XCTAssertNil(RTNoteResourceSchemeHandler.byteRange(header: "bytes=5-2", total: 100))
        XCTAssertNil(RTNoteResourceSchemeHandler.byteRange(header: "bytes=0-1,4-5", total: 100))
        XCTAssertNil(RTNoteResourceSchemeHandler.byteRange(header: "items=0-1", total: 100))
    }

    func testFilenamesAndDurationsMatchTheSharedFormat() throws {
        var components = DateComponents()
        components.calendar = Calendar(identifier: .gregorian)
        components.year = 2026
        components.month = 11
        components.day = 5
        components.hour = 9
        components.minute = 3
        components.second = 7
        let date = try XCTUnwrap(components.date)
        XCTAssertEqual(VoiceMemoFiles.displayFilename(date: date, prefix: "Voice memo"), "Voice memo 2026-11-05 09.03.07.m4a")
        XCTAssertEqual(VoiceMemoFiles.displayFilename(date: date, prefix: "Nota: voz"), "Nota voz 2026-11-05 09.03.07.m4a")
        XCTAssertEqual(VoiceMemoFiles.formatDuration(0), "0:00")
        XCTAssertEqual(VoiceMemoFiles.formatDuration(42.9), "0:42")
        XCTAssertEqual(VoiceMemoFiles.formatDuration(3725), "1:02:05")
        XCTAssertTrue(VoiceMemoFiles.newClientId().hasPrefix("vm_"))
    }

    func testPendingStorePersistsUntilRemoved() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("voice-memo-tests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }

        let store = PendingVoiceMemoStore(directory: directory)
        let entry = PendingVoiceMemo(
            clientId: "vm_test",
            filename: "Voice memo 2026-11-05 09.03.07.m4a",
            mimeType: "audio/mp4",
            byteSize: 1200,
            durationMs: 4200,
            createdAt: Date(timeIntervalSince1970: 0)
        )
        store.add(entry)
        store.markUploaded(clientId: "vm_test", url: "/api/v1/resources/res_1/blob", byteSize: 1250)

        let reloaded = PendingVoiceMemoStore(directory: directory)
        XCTAssertEqual(reloaded.entry(clientId: "vm_test")?.uploadedURL, "/api/v1/resources/res_1/blob")
        XCTAssertEqual(reloaded.entry(clientId: "vm_test")?.uploadedByteSize, 1250)
        XCTAssertEqual(reloaded.entries(referencedBy: "{\"clientId\":\"vm_test\"}").count, 1)
        XCTAssertTrue(reloaded.entries(referencedBy: "{\"clientId\":\"vm_other\"}").isEmpty)

        reloaded.remove(clientId: "vm_test")
        XCTAssertNil(PendingVoiceMemoStore(directory: directory).entry(clientId: "vm_test"))
    }

    func testCodecKeepsVoiceMemoTextAndLink() {
        let json = """
        {"type":"doc","content":[{"type":"rtnoteVoiceMemo","attrs":{"url":"/api/v1/resources/res_1/blob","filename":"a.m4a","title":"Standup","transcript":"First point."}}]}
        """
        XCTAssertEqual(EditorContentCodec.markdownFromTipTapJSON(json), "[Standup](/api/v1/resources/res_1/blob)\n\nFirst point.\n")
        XCTAssertEqual(EditorContentCodec.plainTextFromJSON(json), "Standup First point.")
    }

    func testAudioMimeDetection() {
        XCTAssertEqual(TipTapResourceLoader.audioMime(header: "audio/webm;codecs=opus", data: Data()), "audio/webm")
        XCTAssertEqual(TipTapResourceLoader.audioMime(header: "video/webm", data: Data()), "audio/webm")
        XCTAssertEqual(TipTapResourceLoader.audioMime(header: "application/octet-stream", data: Data([0x1A, 0x45, 0xDF, 0xA3])), "audio/webm")
        XCTAssertEqual(TipTapResourceLoader.audioMime(header: nil, data: Data([0x00, 0x00, 0x00, 0x20])), "audio/mp4")
    }

    func testMaxLengthPreferenceFallsBackToDefault() {
        XCTAssertEqual(PreferencesStore.normalizedVoiceMemoMaxMinutes(60), 60)
        XCTAssertEqual(PreferencesStore.normalizedVoiceMemoMaxMinutes(7), 30)
        XCTAssertEqual(PreferencesStore.normalizedVoiceMemoMaxMinutes(nil), 30)
    }
}
