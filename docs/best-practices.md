# RTNote Showcase & Workflows

A practical guide to core workflows, key features, and real-world usage scenarios with RTNote.

## Table of Contents

### Core Workspace & Focused Writing
- [1. Classic Three-Pane Workspace & Distraction-Free Editing](#1-classic-three-pane-workspace--distraction-free-editing)

### Capture & Ingestion
- [2. Mobile Image Sharing to Notes](#2-mobile-image-sharing-to-notes)
- [3. X (Twitter) Post & Quote Clipping](#3-x-twitter-post--quote-clipping)
- [4. Reddit Discussion Post Clipping](#4-reddit-discussion-post-clipping)
- [5. Instagram Post & Carousel Clipping](#5-instagram-post--carousel-clipping)
- [6. GitHub Repository Metadata Clipping](#6-github-repository-metadata-clipping)

### Structured Notes & Multi-Dimensional Data
- [7. Mind Maps, Flowcharts & Architecture Diagrams](#7-mind-maps-flowcharts--architecture-diagrams)
- [8. Structured Infographics (Timelines, Matrices & Quadrants)](#8-structured-infographics-timelines-matrices--quadrants)
- [9. Database Tables](#9-database-tables)
- [10. Public Online Form Collection from Database Tables](#10-public-online-form-collection-from-database-tables)

### Visual Styling & Publishing
- [11. Note Export to Long Image & Code Cards](#11-note-export-to-long-image--code-cards)
- [12. Social Media Poster & Cover Design from Notes](#12-social-media-poster--cover-design-from-notes)

### Open Ecosystem & Extensibility
- [13. Open Plugin API & Custom Plugin Development](#13-open-plugin-api--custom-plugin-development)

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

## Capture & Ingestion

### 2. Mobile Image Sharing to Notes

Select **RTNote** in the mobile system share sheet from any app to upload images and create notes titled "Shared Image" in the background.

| 1. Share Image | 2. Choose RTNote | 3. Generated Image Note |
| :---: | :---: | :---: |
| ![Mobile app tap image share](assets/best-practices/original-image/app-share/socia-image/share-enter.jpg) | ![System share sheet choose RTNote](assets/best-practices/original-image/app-share/socia-image/sharing.jpg) | ![Auto-created note with uploaded image](assets/best-practices/original-image/app-share/socia-image/share-in-note.jpg) |

---

### 3. X (Twitter) Post & Quote Clipping

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

### 4. Reddit Discussion Post Clipping

Right-click on the post title or body and select **"Save Selection to RTNote"**.

- Captures thread title, subreddit (e.g. `r/AskReddit`), author handle, timestamp, and permalink to preserve community metadata.

| 1. Right-Click Save Post |
| :---: |
| ![Right-click save Reddit post to RTNote](assets/best-practices/original-image/web-clipper/reddit/reddit.png) |

| 2. Note with Community Metadata |
| :---: |
| ![Reddit post clipped into RTNote note](assets/best-practices/original-image/web-clipper/reddit/reddit-in-note.png) |

---

### 5. Instagram Post & Carousel Clipping

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

### 6. GitHub Repository Metadata Clipping

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

### 7. Mind Maps, Flowcharts & Architecture Diagrams

Choose **Mind map**, **Flowchart**, or **Architecture diagram** as the note type to create an editable diagram note.

- Supports drag-and-drop node editing, auto-layout, conditional branches, and system topologies.
- Mind maps can switch between the canvas and a Markdown outline.
- External agents connected through MCP can create and update diagrams with `create_diagram_memo` and `update_diagram`.

---

### 8. Structured Infographics (Timelines, Matrices & Quadrants)

Create an infographic note and pick one of the built-in templates (timelines, comparison matrices, quadrants, and hierarchy charts).

- Organizes key facts and milestones into structured visual infographic notes.
- Refine text on the canvas or export directly to vector graphics.

---

### 9. Database Tables

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

### 10. Public Online Form Collection from Database Tables

Click **"Form Collection"** at the top of any database table to generate a public online data entry form.

- External respondents can submit information via browser without logging in.
- Submissions sync directly to the database table in real time.

| 1. Open "Form Collection" | 2. Public Form Page |
| :---: | :---: |
| ![Click form collection button in database](assets/best-practices/original-image/database-note/database-form-create.png) | ![Public online form submission interface](assets/best-practices/original-image/database-note/database-form-online.png) |

---

## Visual Styling & Publishing

### 11. Note Export to Long Image & Code Cards

Use the "Share as Image" feature to render notes into high-resolution long images or cards.

- **Multiple Card Themes**: Choose from 8 curated card themes (Transparent, Quote, Book Excerpt, Memo, Dark, and more) with customizable typography and layout. Export high-res long images or copy directly to the clipboard.
- **Technical Code Cards**: A dedicated "Code" theme features macOS-style window controls, line numbers, and monospace syntax highlighting.

| 1. Card Theme Previews (e.g. Transparent) | 2. Font & Layout Customization |
| :---: | :---: |
| ![RTNote share as image transparent theme preview](assets/best-practices/original-image/note-export-image/clear-theme.png) | ![RTNote share as image font and typography settings](assets/best-practices/original-image/note-export-image/code-theme.png) |

---

### 12. Social Media Poster & Cover Design from Notes

Click **"Create Poster"** in any note's action menu (or choose **More types → Poster (Beta)**) to load key takeaways and titles into the Poster Design Studio.

- Offers 40 design templates and 12 platform presets covering portrait, square and landscape aspect ratios.
- Customise layout, colours and design elements on the canvas, then export high-resolution PNGs.

---

## Open Ecosystem & Extensibility

### 13. Open Plugin API & Custom Plugin Development

RTNote features an extension manager supporting one-click installation via GitHub repository URLs or Manifest links, with cross-device workspace synchronization between Web and Desktop.

- **Core API Capabilities**: Bidirectional note read/write, custom DOM panels/embed blocks, unified settings, isolated storage, and speech transcription through the user's configured speech service.
- **Official Open-Source Reference Implementations**:
  - **Task Aggregation ([Tasks plugin](https://github.com/tianma-if/edgeever-tasks))**: Aggregates Markdown todo items across all notes with status filtering and two-way navigation.
- For complete API documentation and development workflows, refer to the [RTNote Plugin Development Guide](plugin-development.md).

| 1. Extension & Plugin Management Center |
| :---: |
| ![RTNote plugin marketplace and official extension management](assets/best-practices/original-image/plugin/official-in.png) |

| 2. Plugin API Namespaces & Documentation |
| :---: |
| ![RTNote plugin development API reference and documentation](assets/best-practices/original-image/plugin/plugin-api.png) |
