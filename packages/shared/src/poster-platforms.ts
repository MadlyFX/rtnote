// Adapted from Qiaomu Design (MIT), same platform catalog used by the editor.
import { PLATFORM_HINTS_ZH_CN } from './poster-platforms.zh-CN';
/** Platform presets: sizes, feed overlays that cover parts of a cover, and file-size limits. */
export interface Zone { x: number; y: number; w: number; h: number; zh: string; en: string }
export interface Platform {
  id: string; zh: string; en: string; icon: string; group: 'social' | 'video' | 'general';
  width: number; height: number; zhHint: string; enHint: string;
  /** Inner text-safe margin as a fraction of the shorter side. */
  margin: number;
  /** Areas the platform usually draws over the cover (timestamps, counters, buttons). */
  avoid: Zone[];
  /** Upload limit in bytes when the platform has a documented one. */
  maxBytes?: number;
  /**
   * Regional preset kept so existing posters still resolve their size label.
   * Hidden from pickers and from agent capabilities.
   */
  hidden?: boolean;
}

export const PLATFORMS: Platform[] = [
  { id: 'xhs', zh: '小红书 · 3:4', en: 'Portrait post · 3:4', icon: 'book-heart', group: 'social', width: 1080, height: 1440, margin: 0.06, avoid: [],
    zhHint: PLATFORM_HINTS_ZH_CN['xhs'], enHint: 'Portrait feed post or cover' },
  { id: 'instagram', zh: 'Instagram · 4:5', en: 'Instagram post · 4:5', icon: 'image', group: 'social', width: 1080, height: 1350, margin: 0.06, avoid: [],
    zhHint: PLATFORM_HINTS_ZH_CN['instagram'], enHint: 'Tallest portrait post the feed shows uncropped' },
  { id: 'link', zh: '链接预览 · 1.91:1', en: 'Link preview · 1.91:1', icon: 'link', group: 'social', width: 1200, height: 630, margin: 0.05, avoid: [],
    zhHint: PLATFORM_HINTS_ZH_CN['link'], enHint: 'Open Graph image for links shared on LinkedIn, Facebook, Slack and blogs' },
  { id: 'xhs-square', zh: '小红书 · 1:1', en: 'Square post · 1:1', icon: 'square', group: 'social', width: 1080, height: 1080, margin: 0.07, avoid: [], hidden: true,
    zhHint: PLATFORM_HINTS_ZH_CN['xhs-square'], enHint: 'Square cover, more compact in the feed' },
  { id: 'youtube', zh: 'YouTube 缩略图', en: 'YouTube thumbnail', icon: 'play', group: 'video', width: 1280, height: 720, margin: 0.04, maxBytes: 2 * 1024 * 1024,
    avoid: [{ x: 0.82, y: 0.86, w: 0.18, h: 0.14, zh: '时长标签', en: 'Duration' }],
    zhHint: PLATFORM_HINTS_ZH_CN['youtube'], enHint: '1280×720, under 2MB; the duration badge covers the bottom-right corner' },
  { id: 'bilibili', zh: 'B 站封面 · 16:10', en: 'Bilibili cover · 16:10', icon: 'tv', hidden: true, group: 'video', width: 1146, height: 717, margin: 0.04,
    avoid: [{ x: 0, y: 0.84, w: 1, h: 0.16, zh: '播放数据条', en: 'Stats bar' }],
    zhHint: PLATFORM_HINTS_ZH_CN['bilibili'], enHint: '1146×717; the feed overlays play counts along the bottom' },
  { id: 'bilibili-43', zh: 'B 站投稿 · 4:3', en: 'Bilibili upload · 4:3', icon: 'tv', hidden: true, group: 'video', width: 1200, height: 900, margin: 0.05,
    avoid: [{ x: 0, y: 0, w: 1, h: 0.08, zh: '信息流裁切', en: 'Cropped in feed' }, { x: 0, y: 0.78, w: 1, h: 0.22, zh: '裁切 + 播放数据条', en: 'Crop + stats bar' }],
    zhHint: PLATFORM_HINTS_ZH_CN['bilibili-43'], enHint: '1200×900 upload cover; the feed crops it to 16:10, keep type in the middle band' },
  { id: 'bilibili-hd', zh: 'B 站 · 16:9 高清', en: 'Bilibili · 16:9 HD', icon: 'tv', hidden: true, group: 'video', width: 1920, height: 1080, margin: 0.04,
    avoid: [{ x: 0, y: 0.86, w: 1, h: 0.14, zh: '播放数据条', en: 'Stats bar' }],
    zhHint: PLATFORM_HINTS_ZH_CN['bilibili-hd'], enHint: '1920×1080 widescreen cover' },
  { id: 'vertical', zh: '抖音 / 视频号 · 9:16', en: 'Shorts / Reels / TikTok · 9:16', icon: 'smartphone', group: 'video', width: 1080, height: 1920, margin: 0.06,
    avoid: [{ x: 0, y: 0.78, w: 0.8, h: 0.22, zh: '标题与账号', en: 'Caption' }, { x: 0.84, y: 0.5, w: 0.16, h: 0.4, zh: '互动按钮', en: 'Buttons' }],
    zhHint: PLATFORM_HINTS_ZH_CN['vertical'], enHint: 'Vertical video; captions and buttons cover the bottom and right' },
  { id: 'wechat', zh: '公众号头图 · 2.35:1', en: 'WeChat banner · 2.35:1', icon: 'message-circle', hidden: true, group: 'social', width: 1410, height: 600, margin: 0.05, avoid: [],
    zhHint: PLATFORM_HINTS_ZH_CN['wechat'], enHint: 'Article banner; the feed crops a square from the centre' },
  { id: 'x', zh: 'X 封面 · 5:2', en: 'X header · 5:2', icon: 'at-sign', group: 'social', width: 1500, height: 600, margin: 0.05, avoid: [{ x: 0, y: 0.55, w: 0.3, h: 0.45, zh: '头像', en: 'Avatar' }],
    zhHint: PLATFORM_HINTS_ZH_CN['x'], enHint: 'Profile header; the avatar covers the lower-left' },
  { id: 'square', zh: '方形 · 1:1', en: 'Square · 1:1', icon: 'square', group: 'general', width: 1080, height: 1080, margin: 0.06, avoid: [], zhHint: PLATFORM_HINTS_ZH_CN['square'], enHint: 'General square' },
  { id: 'wide', zh: '横版 · 16:9', en: 'Landscape · 16:9', icon: 'rectangle-horizontal', group: 'general', width: 1920, height: 1080, margin: 0.05, avoid: [], zhHint: PLATFORM_HINTS_ZH_CN['wide'], enHint: 'General landscape' },
  { id: 'portrait', zh: '竖版 · 3:4', en: 'Portrait · 3:4', icon: 'rectangle-vertical', group: 'general', width: 1200, height: 1600, margin: 0.06, avoid: [], zhHint: PLATFORM_HINTS_ZH_CN['portrait'], enHint: 'General portrait' },
];

export const DEFAULT_PLATFORM = 'xhs';
/** Presets offered in pickers and to agents. */
export const PICKER_PLATFORMS: Platform[] = PLATFORMS.filter(p => !p.hidden);
export function platformById(id: string | undefined): Platform | undefined { return PLATFORMS.find(p => p.id === id); }
export function platformFor(width: number, height: number, id?: string): Platform | undefined {
  const exact = platformById(id);
  if (exact && exact.width === width && exact.height === height) return exact;
  return PICKER_PLATFORMS.find(p => p.width === width && p.height === height)
    ?? PLATFORMS.find(p => p.width === width && p.height === height);
}
export function platformName(p: Platform, zh: boolean): string { return zh ? p.zh : p.en; }
export const GROUPS: { id: Platform['group']; zh: string; en: string }[] = [
  { id: 'social', zh: '图文平台', en: 'Social' },
  { id: 'video', zh: '视频平台', en: 'Video' },
  { id: 'general', zh: '通用比例', en: 'General' },
];
