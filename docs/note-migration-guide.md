# Third-Party Notes Import Guide


RTNote supports importing notes from other products directly. Two methods are available: **Native One-Click Import** and **AI Agent (MCP) Migration**.

---

## 1. Native One-Click Import (Evernote / Obsidian / Joplin / Word)

Operate directly in RTNote Web or Desktop without CLI commands or MCP setup.

### Step 1: Open the Import Entrance

Go to **Settings → Backup & Import → Import from Other Apps**, then click **Start Import**.

![Import from other apps entrance](assets/best-practices/original-image/import-from-other-note/import-in-setting.png)

### Step 2: Select Source and Load Files

Select your source platform in the dialog, then drag and drop or browse files:

![Import dialog and source selection](assets/best-practices/original-image/import-from-other-note/import-dialog.png)

- **Evernote**:
  - Right-click a notebook in the desktop client and choose **Export Notebook...** to export as `.enex` (ensure tags and timestamps are checked).
  - Supports single/multiple `.enex` files, folders containing ENEX files, or bundled `.zip` archives.
- **Obsidian**:
  - Drag and drop your local Vault folder directly, or compress the Vault into a `.zip`.
  - Automatically parses Front Matter, tags, and Wiki-link images (`![[image.png]]`), while ignoring `.obsidian` and `.git`.
- **Joplin**:
  - In the desktop client, go to **File → Export all** and export as a **.jex** file (or RAW / Markdown directory).
  - Drag and drop the `.jex` file or a directory zipped as `.zip`. Embedded resource attachments are resolved automatically.
- **Word**:
  - Select one or more `.docx` files, a folder of them, or a `.zip`. Each document becomes a note named after the file; folders become notebooks.
  - Formatting is kept as rich text: headings, bold/italic/underline/strike, fonts and sizes, text colour and highlight, alignment and line spacing, lists, links, tables with merged cells, cell shading and borders, and images with their captions. Images are uploaded as note attachments.
  - The document's own default font, size and spacing become RTNote's defaults, so only formatting that differs from them is kept. Exact line spacing, lettered or roman numbering (imported as numbers) and floating image positions are simplified.
  - Text boxes, footnotes, endnotes, equations, charts, embedded objects, linked images and EMF/WMF/TIFF images are not imported; the preflight lists them per document. Save `.doc` files as `.docx` in Word first, and remove passwords from protected documents.

### Step 3: Confirm Import and Verify

1. RTNote runs a client-side preflight check and displays note, notebook, and attachment counts.
2. Choose to import as top-level notebooks or mount under an existing notebook, then click **Confirm Import**.
3. Once completed, click **Open Note** next to any item in the result list to verify formatting and attachments.

---

## 2. AI Agent Import (Notion / Memos, etc.)

For platforms without a built-in GUI parser, use RTNote's Remote MCP with your AI assistant (Claude Code, Cursor, Codex, etc.) via a single prompt.

### Step 1: Configure RTNote MCP

In RTNote, go to **Settings → API / MCP**, generate a Token, and click **Copy Full MCP Config** to add it to your AI assistant.

### Step 2: Send a Prompt to Start Migration

#### Scenario 1: Notion Migration (Cloud-to-Cloud Dual MCP)

Enable both **Notion MCP** and **RTNote MCP** in your AI assistant, then send:

```text
You are my migration assistant. You now have access to both my Notion MCP and RTNote MCP services.
Please migrate all specified pages and databases from Notion to RTNote:
1. Call Notion MCP tools to read page contents (including titles, content blocks, creation times, tags, and properties);
2. Convert them into standard Markdown and nested structures, then call RTNote MCP tools to import them into a "Notion Migration" notebook;
3. When finished, summarize total notes imported, attachment status, and any formatting anomalies.
```

#### Scenario 2: Memos Migration (Cloud-to-Cloud Dual MCP)

Enable both **Memos MCP** and **RTNote MCP** in your AI assistant, then send:

```text
You are my knowledge base migration assistant. You are connected to both my old Memos MCP and RTNote MCP.
Please migrate all historical memos to RTNote:
1. Call Memos MCP tools to fetch all memos (including text, tags, visibility, and timestamps) in batches;
2. Call RTNote MCP tools to create notes under a "Memos" notebook;
3. Upon full migration, report the total imported notes and verification summary.
```
