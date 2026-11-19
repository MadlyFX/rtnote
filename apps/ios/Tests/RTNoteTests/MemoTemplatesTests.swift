import XCTest
@testable import RTNote

final class MemoTemplatesTests: XCTestCase {
    func testCreateSeedFromSelectableTemplate() {
        let template = SelectableMemoTemplate(MemoTemplate(
            id: "tpl",
            name: "My weekly report",
            description: "desc",
            title: "[Weekly report]",
            contentMarkdown: "## This week",
            tags: ["work", "weekly"],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
        ))
        XCTAssertEqual(template.createSeed.title, "[Weekly report]")
        XCTAssertEqual(template.createSeed.contentMarkdown, "## This week")
        XCTAssertEqual(template.createSeed.tagsText, "work, weekly")
        XCTAssertTrue(template.createSeed.hasContent)
        XCTAssertFalse(CreateMemoSeed(title: "", contentMarkdown: "", tagsText: "").hasContent)
        XCTAssertTrue(CreateMemoSeed(title: "a", contentMarkdown: "", tagsText: "").hasContent)
    }

    func testFromSavedMapsServerTemplate() {
        let saved = MemoTemplate(
            id: "tpl_1",
            name: "Custom",
            description: "Notes",
            title: nil,
            contentMarkdown: "# Hi",
            tags: ["x"],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
        )
        let row = SelectableMemoTemplate(saved)
        XCTAssertEqual(row.title, "Custom")
        XCTAssertEqual(row.contentMarkdown, "# Hi")
    }

    func testGalleryEntryBecomesCreateSeed() throws {
        let json = #"{"templates":[{"key":"daily-journal","name":"Dziennik dnia","description":"Opis","title":"Dziennik dnia","contentMarkdown":"- Plan","tags":["template","daily-journal"]}]}"#
        let response = try RTNoteJSON.decoder.decode(TemplateGalleryResponse.self, from: Data(json.utf8))
        let row = SelectableMemoTemplate(try XCTUnwrap(response.templates.first))
        XCTAssertEqual(row.id, "gallery:daily-journal")
        XCTAssertEqual(row.createSeed.title, "Dziennik dnia")
        XCTAssertEqual(row.createSeed.contentMarkdown, "- Plan")
        XCTAssertEqual(row.createSeed.tagsText, "template, daily-journal")
    }
}
