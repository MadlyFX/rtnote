# Using RTNote with MCP clients and AI agents


## 1. Connect a client

Open **Profile** → **API / MCP**, create a separate token for each client, then select **Copy MCP config**. Choose **Read-only** for search and summaries or **Full access** if the client needs to create or edit notes. If a token leaks, delete it here and create a replacement.

Remote clients connect over Streamable HTTP. Use your instance URL followed by `/mcp`, such as `https://notes.example.com/mcp`, and send `Authorization: Bearer <token>`. Check that the copied URL points to your RTNote instance.

### Cursor and other clients that use `mcpServers`

Paste the JSON from **Copy MCP config** into your client's MCP settings. The example below shows the `mcpServers` format. Keep the actual token in local settings outside version control.

```json
{
  "mcpServers": {
    "rtnote": {
      "url": "https://notes.example.com/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

### Claude Code

```bash
claude mcp add --scope user --transport http rtnote https://notes.example.com/mcp \
  --header "Authorization: Bearer <token>"
claude mcp get rtnote   # should report "Connected"
```

Omit `--scope user` to register the server for the current project only.

### VS Code

Use `servers` and `type: "http"` in `.vscode/mcp.json` or your user-level `mcp.json`. This example prompts for the token. You can also use `${env:EDGEEVER_TOKEN}` to read it from the environment.

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "rtnote-token",
      "description": "RTNote API token",
      "password": true
    }
  ],
  "servers": {
    "rtnote": {
      "type": "http",
      "url": "https://notes.example.com/mcp",
      "headers": { "Authorization": "Bearer ${input:rtnote-token}" }
    }
  }
}
```

### Clients that only support stdio

Install Bun, save a connection profile from the repository root, then configure the client to launch the bridge. Replace the example path with the script's absolute path.

```bash
# Once: save a profile in ~/.edgeever/config.json
bun run cli -- profile set personal --url https://notes.example.com --token "<token>"

# In the client, run:
bun /path/to/edgeever/scripts/edgeever-mcp-stdio.mjs --profile personal
```

You can use the `EDGEEVER_URL` and `EDGEEVER_TOKEN` environment variables instead of `--profile`. OAuth-only connectors cannot connect directly. Use the bridge if your client can launch a local command.

## 2. Verify the connection

Ask the agent to call `get_current_user` and check the account, workspace and token scopes. Then ask it to call `list_notebooks` to confirm read access.

Add a rule in your client's custom instructions, `AGENTS.md` or `CLAUDE.md`. For example, “Put new notes in Agent notes and search for an existing note on the topic first. Ask me before deleting or merging notes.”

Notes are rich text: `contentJson` (a TipTap document) is the source of truth and `contentMarkdown` is a copy the server generates from it. To write formatting such as colours, fonts, alignment, image sizes and captions, pass `contentJson` to `create_memo` or `update_memo` (read the current document with `get_memo` and `format: "all"`). `contentMarkdown` still works: in `update_memo` it is merged into the rich text block by block, so paragraphs you did not change keep their formatting.

Markdown has no syntax for some formatting, so the generated `contentMarkdown` uses HTML that RTNote reads back and other Markdown renderers still display:

| Formatting | In `contentMarkdown` |
| --- | --- |
| Text colour, highlight, font, size | `<span style="color: #c94343; font-family: Georgia, serif; font-size: 18px">text</span>` |
| Paragraph or heading alignment, line spacing | `<div align="center" style="line-height: 1.5">`, a blank line, the block, a blank line, `</div>` |
| Image caption | `<figure>`, the `<img>`, then `<figcaption>Caption</figcaption>`, then `</figure>` |
| Voice memo | `<!-- rtnote-voice-memo {"durationMs":42000,"title":"…"} -->`, a link to the recording, a blank line, the transcript, then `<!-- /rtnote-voice-memo -->`. The JSON holds the file name, type, size, length and title; the transcript is plain text |
| Merged cells, cell colours and borders, block content in cells, a header column | An HTML `<table>` whose cells hold Markdown between blank lines; other tables stay GFM tables |

Keep these forms intact when you edit Markdown, or send `contentJson` instead.

When reading a prose memo with `get_memo` or listing full bodies with `list_memos` and `includeContent: true`, the response includes `contentMarkdown` as the only full body, alongside memo metadata. If an existing integration reads `contentJson` or `contentText`, pass `format: "all"` to retain the previous response.

Keyword searches with `search_memos` also return a `snippet` of up to 200 characters when the query or its terms can be located in the body. The original `excerpt` is retained. Results without a located body match, including title-only or tag-only matches, use the existing summary. Read the memo when the answer depends on context outside the snippet.

## 3. Troubleshoot

| Symptom | Cause and fix |
|---|---|
| `401` with "Authentication required" | The client sent no credentials. Check that the `Authorization` header is set, including the header name and the `Bearer ` prefix. |
| `401` with `error="invalid_token"` in the `WWW-Authenticate` header | The token was sent but rejected. Check that it belongs to this instance; if it was deleted or replaced, create a new token and update the client. |
| `403` "Origin is not allowed" | A browser-based client sent a foreign `Origin`. Run the client outside the browser or through the stdio bridge. |
| The client reports invalid JSON or an HTML page | The URL does not point at `/mcp` on the server (for example a typo, `//mcp`, or the desktop app address). |
| Tools that change data are refused | The token is read-only. Use **Full access** only if the client needs to write. |

Older instances may return the same generic `401` for missing and rejected credentials. Check the instance URL, header and token first.
