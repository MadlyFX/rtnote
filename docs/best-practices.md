# RTNote Showcase & Workflows

A practical guide to core workflows, key features, and real-world usage scenarios with RTNote.

## Table of Contents

### Core Workspace & Focused Writing
- [1. Classic Three-Pane Workspace & Distraction-Free Editing](#1-classic-three-pane-workspace--distraction-free-editing)

### Omnichannel Capture & Ingestion
- [2. WeChat Chat History Archiving](#2-wechat-chat-history-archiving)
- [3. WeChat Article Clipping on Mobile](#3-wechat-article-clipping-on-mobile)
- [4. Mobile Image Sharing to Notes](#4-mobile-image-sharing-to-notes)
- [5. Xiaohongshu (RED) Note Clipping](#5-xiaohongshu-red-note-clipping)
- [6. X (Twitter) Post & Quote Clipping](#6-x-twitter-post--quote-clipping)
- [7. Zhihu Answer & Column Article Clipping](#7-zhihu-answer--column-article-clipping)
- [8. Reddit Discussion Post Clipping](#8-reddit-discussion-post-clipping)
- [9. Instagram Post & Carousel Clipping](#9-instagram-post--carousel-clipping)
- [10. GitHub Repository Metadata Clipping](#10-github-repository-metadata-clipping)

### Structured Notes & Multi-Dimensional Data
- [11. Mind Maps, Flowcharts & Architecture Diagrams](#11-mind-maps-flowcharts--architecture-diagrams)
- [12. Structured Infographics (Timelines, Matrices & Quadrants)](#12-structured-infographics-timelines-matrices--quadrants)
- [13. Database Tables](#13-database-tables)
- [14. Public Online Form Collection from Database Tables](#14-public-online-form-collection-from-database-tables)

### Visual Styling & Omnichannel Publishing
- [15. Note Export to Long Image & Code Cards](#15-note-export-to-long-image--code-cards)
- [16. Social Media Poster & Cover Design from Notes](#16-social-media-poster--cover-design-from-notes)
- [17. Copying Notes to WeChat Official Account & Blogs](#17-copying-notes-to-wechat-official-account--blogs)

### Open Ecosystem & Extensibility
- [18. Open Plugin API & Custom Plugin Development](#18-open-plugin-api--custom-plugin-development)

---

## Core Workspace & Focused Writing

### 1. Classic Three-Pane Workspace & Distraction-Free Editing

RTNote features a classic three-pane structure (Notebook Tree · Note Stream · Editor Canvas):

- **Focus Mode**: Resizable and collapsible sidebars allow instant toggling into full-screen writing mode.
- **Hybrid Editing**: The main editor supports both WYSIWYG rich text and Markdown syntax.

| Three-Pane Workspace Layout |
:---:
| ![RTNote classic three-pane workspace with rich editor](assets/best-practices/original-image/class-three-pane/image.png) |

---

## Omnichannel Capture & Ingestion

### 2. WeChat Chat History Archiving

Select messages in WeChat, tap "Combine and Forward" (合并转发), and choose **RTNote** under "Forward to Other Apps" to convert conversations into structured notes.

- **Format Parsing**: Parses senders, timestamps, emojis, and links into clean layouts.
- **Media Preservation**: Images are embedded inline; documents and media files (`.xlsx`, `.pdf`, `.mp4`) are saved as attachments with full-text search support.

| 1. Forward to RTNote | 2. Structured Note Preview |
| :---: | :---: |
| ![WeChat share to RTNote](assets/best-practices/original-image/wechat-chat-message-import/select-export.png) | ![WeChat chat history imported into RTNote note](assets/best-practices/original-image/wechat-chat-message-import/import-as-note.png) |

---

### 3. WeChat Article Clipping on Mobile

When reading WeChat Official Account articles on mobile, select **"Open in RTNote"** (用 RTNote 打开) from the top-right menu.

- Automatically extracts the title, body structure, and embedded images into clean Markdown.

| 1. Select "Open in RTNote" | 2. Extracting Content | 3. Generated Markdown Note |
| :---: | :---: | :---: |
| ![WeChat article share menu select open in RTNote](assets/best-practices/original-image/app-share/wechat-article/share-enter.jpg) | ![RTNote clipping modal extracting article](assets/best-practices/original-image/app-share/wechat-article/sharing.jpg) | ![WeChat article clipped into neat note](assets/best-practices/original-image/app-share/wechat-article/in-note.jpg) |

---

### 4. Mobile Image Sharing to Notes

Select **RTNote** in the mobile system share sheet from any app to upload images and create notes titled "Shared Image" in the background.

| 1. Share Image | 2. Choose RTNote | 3. Generated Image Note |
| :---: | :---: | :---: |
| ![Mobile app tap image share](assets/best-practices/original-image/app-share/socia-image/share-enter.jpg) | ![System share sheet choose RTNote](assets/best-practices/original-image/app-share/socia-image/sharing.jpg) | ![Auto-created note with uploaded image](assets/best-practices/original-image/app-share/socia-image/share-in-note.jpg) |

---

### 5. Xiaohongshu (RED) Note Clipping

Right-click any note page and select **"Save Note to RTNote"** using the RTNote Web Clipper extension.

- Captures title, topic tags, body text, publish timestamp, and source URL.
- Automatically formats multi-image sets into multi-column gallery layouts.

| 1. Right-Click Clipper Menu |
| :---: |
| ![Right-click save Xiaohongshu note to RTNote](assets/best-practices/original-image/web-clipper/xiaohongshu/xiaohongshu.png) |

| 2. Multi-Column Gallery Note |
| :---: |
| ![Xiaohongshu note clipped into multi-column gallery](assets/best-practices/original-image/web-clipper/xiaohongshu/xiaohongshu-in-note.png) |

---

### 6. X (Twitter) Post & Quote Clipping

Right-click any post and select **"Save Tweet to RTNote"** with the RTNote Web Clipper extension.

- Extracts author info, tweet content, external links, quote tweets, and multi-image attachments.
- Formats content into a multi-column gallery layout.

| 1. Right-Click Save Tweet |
| :---: |
| ![Right-click save tweet to RTNote](assets/best-practices/original-image/web-clipper/twitter/twitter.png) |

| 2. Note with Quotes & Gallery |
| :---: |
| ![X tweet clipped into RTNote note with quote](assets/best-practices/original-image/web-clipper/twitter/twitter-in-note.png) |

---

### 7. Zhihu Answer & Column Article Clipping

Right-click any specific answer or article and select **"Save Answer/Article to RTNote"**.

- Parses question title, author, body, timestamp, and permalink into a structured Q&A note.

| 1. Right-Click Save Answer/Article |
| :---: |
| ![Right-click save Zhihu answer to RTNote](assets/best-practices/original-image/web-clipper/zhihu/zhihu.png) |

| 2. Structured Q&A Note Preview |
| :---: |
| ![Zhihu answer clipped into RTNote note](assets/best-practices/original-image/web-clipper/zhihu/zhihu-in-note.png) |

---

### 8. Reddit Discussion Post Clipping

Right-click on the post title or body and select **"Save Selection to RTNote"**.

- Captures thread title, subreddit (e.g. `r/AskReddit`), author handle, timestamp, and permalink to preserve community metadata.

| 1. Right-Click Save Post |
| :---: |
| ![Right-click save Reddit post to RTNote](assets/best-practices/original-image/web-clipper/reddit/reddit.png) |

| 2. Note with Community Metadata |
| :---: |
| ![Reddit post clipped into RTNote note](assets/best-practices/original-image/web-clipper/reddit/reddit-in-note.png) |

---

### 9. Instagram Post & Carousel Clipping

Right-click any Instagram post or carousel and select **"Save Post to RTNote"** using the RTNote Web Clipper extension.

- Extracts author handle, full caption text, publish timestamp, topic tags, and source URL.
- Fully extracts multi-image carousel sets and video covers, automatically formatted into a multi-column gallery layout.

| 1. Right-Click Save Instagram Post |
| :---: |
| ![Right-click save Instagram post to RTNote](assets/best-practices/original-image/web-clipper/instgram/ins.png) |

| 2. Note with Metadata & Multi-Image Gallery |
| :---: |
| ![RTNote clipped Instagram post note effect](assets/best-practices/original-image/web-clipper/instgram/ins-in-note.png) |

---

### 10. GitHub Repository Metadata Clipping

Right-click anywhere on the GitHub repository page and select **"Save Repository Info to RTNote"** using RTNote Web Clipper.

- Extracts repository name (`Owner/Repo`), description, homepage URL, primary language, license, and topic tags into a structured technical card.

| 1. Right-Click Save Repository Info |
| :---: |
| ![Right-click save GitHub repo info to RTNote](assets/best-practices/original-image/web-clipper/github/github.png) |

| 2. Structured Repository Card Note |
| :---: |
| ![RTNote clipped GitHub repository card note effect](assets/best-practices/original-image/web-clipper/github/github-in-note.png) |

---

## Structured Notes & Multi-Dimensional Data

### 11. Mind Maps, Flowcharts & Architecture Diagrams

Choose **Mind map**, **Flowchart**, or **Architecture diagram** as the note type to create an editable diagram note.

- Supports drag-and-drop node editing, auto-layout, conditional branches, and system topologies.
- Mind maps can switch between the canvas and a Markdown outline.
- External agents connected through MCP can create and update diagrams with `create_diagram_memo` and `update_diagram`.

---

### 12. Structured Infographics (Timelines, Matrices & Quadrants)

Create an infographic note and pick one of the built-in templates (timelines, comparison matrices, quadrants, and hierarchy charts).

- Organizes key facts and milestones into structured visual infographic notes.
- Refine text on the canvas or export directly to vector graphics.

---

### 13. Database Tables

Create a database table note (e.g., a social media content plan or an employee onboarding tracker) to keep structured records.

- Columns support types such as tags, text, dates, and links.
- Supports views, filtering, sorting, and CSV export.

| 1. Content Planning Table |
| :---: |
| ![Media topic tracker database table](assets/best-practices/original-image/database-note/database-hot-select.png) |

| 2. Employee Directory Table |
| :---: |
| ![Employee directory database table](assets/best-practices/original-image/database-note/database-employee-register.png) |

---

### 14. Public Online Form Collection from Database Tables

Click **"Form Collection"** at the top of any database table to generate a public online data entry form.

- External respondents can submit information via browser without logging in.
- Submissions sync directly to the database table in real time.

| 1. Open "Form Collection" | 2. Public Form Page |
| :---: | :---: |
| ![Click form collection button in database](assets/best-practices/original-image/database-note/database-form-create.png) | ![Public online form submission interface](assets/best-practices/original-image/database-note/database-form-online.png) |

---

## Visual Styling & Omnichannel Publishing

### 15. Note Export to Long Image & Code Cards

Use the "Share as Image" feature to render notes into high-resolution long images or cards.

- **Multiple Card Themes**: Choose from 8 curated card themes (Transparent, Quote, Book Excerpt, Memo, Dark, and more) with customizable typography and layout. Export high-res long images or copy directly to the clipboard.
- **Technical Code Cards**: A dedicated "Code" theme features macOS-style window controls, line numbers, and monospace syntax highlighting.

| 1. Card Theme Previews (e.g. Transparent) | 2. Font & Layout Customization |
| :---: | :---: |
| ![RTNote share as image transparent theme preview](assets/best-practices/original-image/note-export-image/clear-theme.png) | ![RTNote share as image font and typography settings](assets/best-practices/original-image/note-export-image/code-theme.png) |

---

### 16. Social Media Poster & Cover Design from Notes

Click **"Create Poster"** in any note's action menu (or via "New → Poster") to load key takeaways and titles into the Poster Design Studio.

- Offers 40+ design templates supporting Xiaohongshu 3:4, Moments 1:1, and landscape aspect ratios.
- Customize layout, colors, and design elements on the canvas, then export high-resolution PNGs.

---

### 17. Copying Notes to WeChat Official Account & Blogs

Select **"Copy to Official Account / Blog"** (复制到公众号 / 博客) from the note menu to convert notes into rich text with inline CSS.

- Paste directly into the WeChat Official Account editor while preserving tables, callouts, code blocks, lists, and typography styles.

| 1. Copy to Official Account / Blog |
| :---: |
| ![RTNote note menu copy to WeChat MP](assets/best-practices/original-image/wechat-article-copy-to/right-menu.png) |

| 2. WeChat Official Account Editor Layout |
| :---: |
| ![Note pasted into WeChat MP editor layout](assets/best-practices/original-image/wechat-article-copy-to/show-in-wechat-editor.png) |

---

## Open Ecosystem & Extensibility

### 18. Open Plugin API & Custom Plugin Development

RTNote features an extension manager supporting one-click installation via GitHub repository URLs or Manifest links, with cross-device workspace synchronization between Web and Desktop.

- **Core API Capabilities**: Bidirectional note read/write, custom DOM panels/embed blocks, unified settings, isolated storage, and speech transcription through the user's configured speech service.
- **Official Open-Source Reference Implementations**:
  - **Task Aggregation ([RTNote Tasks](https://github.com/tianma-if/edgeever-tasks))**: Aggregates Markdown todo items across all notes with status filtering and two-way navigation.
- For complete API documentation and development workflows, refer to the [RTNote Plugin Development Guide](plugin-development.md).

| 1. Extension & Plugin Management Center |
| :---: |
| ![RTNote plugin marketplace and official extension management](assets/best-practices/original-image/plugin/official-in.png) |

| 2. Plugin API Namespaces & Documentation |
| :---: |
| ![RTNote plugin development API reference and documentation](assets/best-practices/original-image/plugin/plugin-api.png) |
