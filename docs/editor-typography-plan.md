# Note body: native theme only

The editor no longer offers multiple typography themes. Writing and reading both use the native theme. Column width is stored only on this device and arranges the author's own editing area. Font size, line height, body colour scheme and custom CSS are stored on the account and shared by the editor and public share pages.

## Removed themes

The "Editor theme" menu in the toolbar is removed entirely. The skins and layouts below no longer appear and are no longer applied when a note opens:

- Colour skins: Minimal Jade, Line-art Emerald, WeChat Green, Fresh Mint
- Layouts: Warm Letter, Teal Handout, Night-blue Draft, Letterpress Journal, Terracotta Column, Amber Field Notes, Jade Editorial, Violet Index, Misty Page, Forest Journal

Decorations that came with the layouts go too, including section numbers (such as "NO. 01"), heading rules, masthead text and special quote styles. The note content itself is unchanged.

If this device stored one of these themes (`edgeever.editor-theme`), its layout decorations are no longer applied. Colours migrate to the matching scheme using the table under "Fonts and colours". A saved custom colour scheme is treated as native.

## Reading settings

The "Reading" group is ordered as below. Column width takes effect in this device's editor as soon as it is chosen. Font size and line height are saved to the account and change the editor and public shares together.

| Setting | Options | Default |
|---|---|---|
| Body width | Standard, Wide | Standard |
| Note body font | Keep the current list: System, LXGW WenKai, LXGW WenKai Screen, Zhuque Fangsong, Source Han Serif, LXGW Neo ZhiSong, Source Han Sans, Western serif, Custom | System |
| Body font size | 14, 16, 18, 20 | 16 |
| Line height | Compact 1.5, Standard 1.65, Relaxed 2.0 | Standard |
| Body colour scheme | Native, plus the 9 below | Native |

Font size, line height and column width use fixed steps, not sliders. Body font size, line height and colour scheme carry no description. Custom CSS has a one-line description: **Syncs across devices.** It can be edited only in desktop Settings. Body width has a one-line description: **Only changes the editing area on this device.**

### Body width

Replaces the current "Note body layout". Both steps are centred. Body width appears only in desktop Settings; narrower windows are already full width.

| Step | Outline open | Outline closed | Focus mode |
|---|---|---|---|
| Standard | 880px | 1200px | 960px |
| Wide | 1040px | 1280px | 1120px |

Wide fits about ten more characters per line. Left-aligned full width is no longer offered.

The existing `edgeever.editorContentAlignment` is migrated as follows and then no longer used:

- Never stored, or stored as centred: Standard
- Explicitly stored as left-aligned: Wide

People who never touched this setting see left-aligned full width today. After the change, new users and people who never touched it get Standard width.

### Body font size

Font size is stored on the account. Web, the desktop editor and public shares use the same step. Headings keep their current ratio to body text: H1 is 1.5x body, H2 is 1.25x, and the other levels follow body text at their existing ratios. Line height is a multiplier, so spacing grows with the text.

Code and formulas stay monospaced, one step smaller than body text. Markdown source mode follows the body font size.

The title bar, sidebar, toolbar, document outline, mind maps and infographics do not follow it.

### Line height

Line height is stored on the account and applies, together with font size, to the editor and public shares. It only changes the spacing between lines within a paragraph. Paragraph spacing stays at 8px; to change it, use custom CSS. Column width does not reach share pages.

### Fonts and colours

The note body font stays as it is: chosen per device; built-in fonts can still be published to public share pages; custom font names are not published.

The body colour scheme lives under "Reading" as fixed options, not sliders. Each option shows a rounded swatch of its colour on the right, including the current option when collapsed. Native uses the interface foreground colour and is the default. The other 9 are spread across the hue wheel, each a clear hue apart. Choosing one changes only links, inline code, bold text, task checkboxes and table tints (the header uses the scheme's light tint, even rows a light tint, selected cells a translucent accent highlight; table borders stay native neutral grey). Empty checkboxes and struck-through text stay native. Body text, headings, quotes, dividers, code background and code borders stay native. Dark mode changes the same items: links and inline code use the accent colour, and the table header uses a faint dark blend of the accent. The interface, sidebar, toolbar, diagrams and infographics do not change.

Of the original 10 schemes, Amber and Warm were both golden, Night-blue and Teal Handout both blue, Misty and Jade both cyan, and Forest close to the brand green. These four were dropped. Their places go to wine red, plus orange and pink, which the hue wheel lacked. Green was once included and later removed. Settings name each scheme by its colour.

| Name | Palette | Accent |
|---|---|---|
| Red | clay | `#E02D32` |
| Orange | new | `#E07A2D` |
| Gold | dawn | `#D9A521` |
| Teal | teal | `#22B8A7` |
| Blue | azure | `#2F80ED` |
| Purple | violet | `#7567F8` |
| Wine | plum | `#7A4E6E` |
| Pink | new | `#D4537E` |
| Grey | slate | `#89798B` |

Orange and pink have no existing palette, so they follow the pattern of the neighbouring palettes: white background, the accent as link and code colour, and light tints of the same hue for backgrounds and dividers.

| Name | Accent | Light tint | Body | Link |
|---|---|---|---|---|
| Orange | `#E07A2D` | `#FFF4EA` | `#3A2E28` | `#B45309` |
| Pink | `#D4537E` | `#FDF2F6` | `#3A2E34` | `#BE185D` |

The colour scheme is stored on the account, like custom CSS. The editor and the account's public shares both use it.

Devices that had chosen a layout land on the closest hue:

| Former theme | Scheme |
|---|---|
| Terracotta Column | Red |
| Amber Field Notes, Warm Letter | Gold |
| Forest Journal, Minimal Jade, Line-art Emerald, WeChat Green, Fresh Mint | Native |
| Jade Editorial, Misty Page | Teal |
| Teal Handout, Night-blue Draft | Blue |
| Violet Index | Purple |
| Letterpress Journal | Grey |
| Native | Native |
| Saved custom colour scheme | Native |

## Custom CSS

Custom CSS exists for public shares. A stylesheet that only affects the author's own editor has no reason to exist.

Like the published body font, it is stored on the account, and every public share from that account uses the same stylesheet. When empty, share pages use native typography. The editor previews it at the same time, so authors see the result before sharing. The interface, sidebar and toolbar ignore it.

Only typographic properties are allowed: fonts, letter spacing, colours, borders, margins and padding, alignment, indentation and similar. `url()` and rules that escape the note body are dropped. `font-size` and `line-height` are no longer accepted; they come only from the font size and line height steps, so the stylesheet and the steps never both change them. Share pages scope the stylesheet to the article body, not the share page's title bar or footer.

The length limit becomes 8 KB. Today's 2,000 characters is only the input limit for this field in the local theme file, enforced by the input and by import validation; the theme file as a whole has a separate 64 KB limit. 2,000 characters cannot hold separate rules for headings, paragraphs, quotes, lists and tables. 8 KB is enough for all of them and is still small when sent to share pages from the account.

Today this CSS lives only on this device and has no effect when the native theme is selected. This round stores font size, line height, colour scheme id and CSS together as account fields and applies them in the editor and on share pages. They go into one new migration; migrations that already ran are not changed. When unset, font size is 16 and line height 1.65.

Switching computers keeps the stylesheet because it is account data; there is no import or export. Web and desktop signed in to the same instance read and write the same stylesheet: save on one machine and the other sees the latest version. If the account has no stylesheet yet but this device still holds old local CSS, the local copy fills the account so the first sync does not wipe styles the author already wrote. After that the account copy wins.

Authors who want to change paragraph spacing, letter spacing, first-line indent or heading styles for readers write them in this CSS. Font size and line height do not belong here. When empty, the editor shows a preset: one declaration per line, grouped by body, headings, links, emphasis, code, quotes, lists and tables. Each group sets light-mode colours and spacing, immediately followed by its `:root.dark` counterpart, which overrides colours only. The sample in the dialog previews the draft through the same filter; light and dark only switch the sample, not the app theme, and nothing is saved to the account. Restore preset puts the draft back to this initial value; it is saved to the account only when the author saves.

## Scope

Column width applies to the web and desktop editing area and is seen only by the author. Share pages keep their own article card width.

Font size and line height apply to web, the desktop editor and public shares.

The iOS and Android editors keep their current 16px and matching line height; this round does not change them. Mobile browsers opening a public share see the account's font size and line height.

## Unchanged

- Interface font, interface language and interface theme
- Code highlighting theme for Markdown source
- Diagram themes
- Text, headings and styles already written into note content

## Rollback

Column width is per device; deleting its record returns to Standard width. Setting the account's font size back to 16, line height to 1.65, colour scheme to native and clearing custom CSS returns the editor and public shares to native typography. After the theme menu is removed, old theme ids are used only to migrate to the schemes above; note data is not changed.
