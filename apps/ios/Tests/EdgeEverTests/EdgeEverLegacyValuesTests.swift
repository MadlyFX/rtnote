import XCTest
@testable import EdgeEver

/// EdgeEver stored Chinese default values in user data. RTNote writes English values but
/// must keep recognising the legacy ones in notes, caches and drafts.
final class EdgeEverLegacyValuesTests: XCTestCase {
    func testLegacyUntitledTitleStillCountsAsUntitled() {
        XCTAssertTrue(MemoTitle.isDefault("无标题笔记"))
        XCTAssertTrue(MemoTitle.isDefault("  无标题笔记\n"))
        XCTAssertEqual(MemoTitle.displayTitle("无标题笔记", untitledLabel: "Untitled note"), "Untitled note")
        XCTAssertEqual(MemoTitle.displayTitle("无标题笔记", untitledLabel: "Notatka bez tytułu"), "Notatka bez tytułu")
    }

    func testRTNoteDefaultTitle() {
        XCTAssertEqual(MemoTitle.defaultTitle, "Untitled note")
        XCTAssertTrue(MemoTitle.isDefault("Untitled note"))
        XCTAssertTrue(MemoTitle.isDefault(""))
        XCTAssertTrue(MemoTitle.isDefault("   "))
        XCTAssertTrue(MemoTitle.isDefault(nil))
        XCTAssertFalse(MemoTitle.isDefault("Groceries"))
        XCTAssertFalse(MemoTitle.isDefault("无标题笔记 2"))
        XCTAssertEqual(MemoTitle.displayTitle(" Groceries ", untitledLabel: "Untitled note"), "Groceries")
    }

    func testLegacyAttachmentPrefixIsStrippedFromResourceNames() {
        for filename in ["附件：brief.pdf", "附件: brief.pdf", "Attachment: brief.pdf", "brief.pdf"] {
            let json = #"{"kind":"attachment","href":"/api/v1/resources/res_file_1/blob","filename":"\#(filename)","resourceId":"res_file_1"}"#
            XCTAssertEqual(ResourceTarget.parse(json)?.filename, "brief.pdf", filename)
        }
    }
}
