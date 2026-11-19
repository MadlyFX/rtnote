# Chrome Web Store listing

## Product details

- Name: `RTNote Web Clipper`
- Primary language: `English`
- Category: `Workflow & Planning`
- Homepage: `https://github.com/MadlyFX/rtnote`
- Support URL: `https://github.com/MadlyFX/rtnote/issues`
- Privacy policy: RTNote's own privacy policy URL (to be published before submission; do not reuse another project's policy)

## Localized listings

- `English`: Primary language
- Simplified Chinese: Localized listing, in [STORE_LISTING.zh-CN.md](STORE_LISTING.zh-CN.md)

Select the matching language in the Chrome Web Store developer dashboard and enter the corresponding copy below (English) or in the locale-suffixed sibling file (Simplified Chinese). Store listing localization is separate from the extension's packaged `_locales` messages.

Chrome Web Store rejects listings that stack many site names in one sentence or repeat them in a closing paragraph as excessive keywords. Keep each site in one feature line. The Japanese listing uses the English detailed description. The short summary comes from the packaged `_locales` `extensionDescription`.

The listing names only the sites shown in the extension's settings page. Site-specific capture code for regional platforms that RTNote does not advertise stays out of the listing, the permission justifications, and the manifest's install-time permissions.

## Upload files

- Package: `store-assets/rtnote-web-clipper-v<version>.zip` (the file name is set by `scripts/publish-web-clipper.mjs`)
- Store icon: `public/icons/icon-128.png`
- Screenshot: `store-assets/screenshot-options-1280x800.jpg`
- Small promo tile: `store-assets/promo-small-440x280.jpg` (render it from the English `store-assets/promo.html` before submission)

### English

#### Summary

Save webpages, selections, images, and Hacker News posts to your self-hosted RTNote instance.

#### Detailed description

RTNote Web Clipper saves the current page, or the part of it you choose, to your self-hosted RTNote instance.

Key features:

- Extract article content automatically and convert it to searchable, editable Markdown.
- Select text, right-click, and choose “Save selection to RTNote” to store that passage only.
- Right-click an image and choose “Save image to RTNote” to store the image file as a new note.
- On X, right-click the post and save the expanded text with the photos already shown.
- On Reddit, right-click a post to save its title, author, community, text, links, and images. Comments are left out.
- On a GitHub repository page, save the address and description, plus the homepage, language, license, and topics when the page shows them.
- On Hacker News post detail pages, save the title, author, original time, points at capture, linked page and main-post text. Comments are left out.
- On Facebook, Instagram, LinkedIn, Threads, and Bluesky, right-click a post to save its text and images.
- Save a YouTube watch page as a video note with timestamped captions.
- These commands stay on the top-level right-click menu.
- The note keeps its source and the time it was clipped.
- Select a default notebook and add the web-clip tag automatically.
- The page is sent only to the RTNote instance you configure.

Before using the extension, enter your instance URL and API token in the extension settings. The extension reads the current tab only after you use a save command. It asks for access to an image's site only when that page cannot provide the image file.

RTNote is an open-source, self-hosted modern notes workspace. Project homepage and source code: https://github.com/MadlyFX/rtnote

## Privacy practices

### Single purpose

Save the current webpage, user-selected text, a user-chosen image, one X post, one Reddit post, one social media post, one GitHub repository card, one Hacker News post, or one video note from a supported watch page to the self-hosted RTNote instance explicitly configured by the user.

### Permission justifications

- `activeTab`: Read the active page only after the user clicks the extension's save action or chooses a save command for selected text, an image, an X post, a Reddit post, a social media post, a GitHub repository, a Hacker News post, or a supported watch page.
- `contextMenus`: Add one top-level item for the thing the user right-clicked: selected text, an image, an X post, a Reddit post, a social media post, a GitHub repository page, or a Hacker News post detail page. The video-note item appears only on a supported YouTube watch page and runs only after the user clicks it.
- `scripting`: Inject the packaged capture script into the active page after the user initiates a capture.
- `storage`: Store the user's RTNote instance URL, API token, and default notebook ID locally.
- `declarativeNetRequestWithHostAccess`: Set the Referer header on the extension's own image downloads for image hosts that require it. The rules match only requests started by the extension and never change the user's browsing.
- Host permission `https://cdn.bsky.app/*`: Download the full-size images of a Bluesky post the user chooses to save, so the note keeps them.
- Optional host permissions: API calls go only to the RTNote instance the user approves. If a page cannot provide an image file, the extension asks for that image's site, or for all sites when the user chooses that option, and uses the access only to download the chosen image. Saving from an X feed may ask for site access to identify the post under the pointer. On Reddit and the supported social sites, a content script only remembers the item under the pointer. Its content is read after the user chooses the save command. If that listener is unavailable, the extension asks the user to right-click the same item again. The video-note command does not add a host permission. It runs in the page only after the user clicks it on a supported watch page.

Each permission justification field accepts at most 1,000 characters. Check the host text against that cap before submitting.

### Data disclosures

The extension handles authentication information, website content, and web browsing activity. These data are used only for the user-triggered clipping feature. Page content is processed locally and sent directly to the user's configured RTNote instance. The extension does not send the page or its audio to any other third party. The developer does not receive or retain it.

- Data is not sold or transferred to third parties outside the approved use case.
- Data is not used for purposes unrelated to the extension's single purpose.
- Data is not used for creditworthiness or lending.
- No remote code is used.

## Distribution

- Visibility: Public
- Regions: All regions supported by the Chrome Web Store
- Defer publish: Off, unless a manual launch date is desired
