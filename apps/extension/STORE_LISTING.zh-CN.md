# Chrome Web Store listing: Simplified Chinese

Translation of the English listing in [STORE_LISTING.md](STORE_LISTING.md). Product details, upload files and privacy answers are maintained there.

## Summary

将网页、选中文字、图片及 Hacker News 主帖保存到你自托管的 RTNote 实例。

## Detailed description

RTNote Web Clipper 可以把当前网页，或你选中的那一部分，保存到自托管的 RTNote 实例。

主要功能：

- 自动提取文章正文，并转换为便于搜索和编辑的 Markdown。
- 选中一段文字后右键，选择“保存所选内容到 RTNote”，只保存这段文字。
- 在图片上右键，选择“保存图片到 RTNote”，把图片文件存成一条新笔记。
- 在 X 上右键推文，保存展开后的全文和已经显示的图片。
- 在 Reddit 上右键帖子，保存标题、作者、社区、正文、链接和图片，不写入评论。
- 在 GitHub 仓库页上保存地址和简介；页面上有主页、语言、许可证和话题时一并写入。
- 在 Hacker News 主帖详情页保存标题、作者、原始时间、剪藏时的分数、外部链接和主帖正文，不写入评论。
- 在 Facebook、Instagram、LinkedIn、Threads 和 Bluesky 上右键帖子，保存正文和图片。
- 可以把 YouTube 播放页保存为带时间戳字幕的视频笔记。
- 这些命令直接出现在右键菜单的第一级。
- 笔记会保留来源和剪藏时间。
- 可选择默认笔记本，并自动添加 web-clip 标签。
- 内容只发送到你配置的 RTNote 实例。

使用前，请在插件设置中填写实例地址和 API Token。插件只会在你使用保存命令后读取当前标签页。图片若无法由页面直接交出，才会再请求该图片所在网站的访问权限。

RTNote 是开源、自托管的现代笔记工作区。项目主页与源代码：https://github.com/MadlyFX/rtnote
