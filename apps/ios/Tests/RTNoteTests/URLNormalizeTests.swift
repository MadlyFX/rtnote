import XCTest
@testable import RTNote

final class URLNormalizeTests: XCTestCase {
    func testAddsHTTPS() throws {
        let url = try RTNoteURLNormalizer.normalizeInstanceURL("demo.rtnote.example")
        XCTAssertEqual(url.absoluteString, "https://demo.rtnote.example")
    }

    func testStripsTrailingSlash() throws {
        let url = try RTNoteURLNormalizer.normalizeInstanceURL("https://demo.rtnote.example/")
        XCTAssertEqual(url.absoluteString, "https://demo.rtnote.example")
    }

    func testRejectsEmpty() {
        XCTAssertThrowsError(try RTNoteURLNormalizer.normalizeInstanceURL("  "))
    }

    func testMapsBareDemoAliasToPublicInstance() throws {
        XCTAssertEqual(
            try RTNoteURLNormalizer.normalizeInstanceURL("demo").absoluteString,
            RTNotePublicDemo.instanceURLString
        )
        XCTAssertEqual(
            try RTNoteURLNormalizer.normalizeInstanceURL("https://demo").absoluteString,
            RTNotePublicDemo.instanceURLString
        )
        XCTAssertEqual(
            try RTNoteURLNormalizer.normalizeInstanceURL("DEMO/").absoluteString,
            RTNotePublicDemo.instanceURLString
        )
    }
}
