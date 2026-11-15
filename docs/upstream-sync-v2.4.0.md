# Vendetta v2.4.0 Sync / 同步记录

Date / 日期: 2026-11-15

Source / 来源: upstream tag `v2.4.0`; fork baseline `fd7502c`.

## Preserved / 保留内容

- YouTube cookie-free recovery, single-video metadata isolation, playlist parsing and quality selection.
  保留 YouTube 无 Cookie 回退、单视频信息隔离、播放列表解析及画质选择。
- Embedded subtitles do not leave a separate VTT sidecar; standalone subtitle downloads remain available when embedding is disabled.
  字幕嵌入视频时不额外保留 VTT 文件；关闭嵌入后仍可单独下载字幕。
- Title-only filenames, Vendetta update manifests, the fork GitHub update feed, and the lowercase GHCR namespace.
  保留仅用标题命名、Vendetta 更新清单、fork 更新地址及全小写 GHCR 镜像命名空间。

## Integrated Upstream Changes / 整合的上游更新

- Agent conversations, durable tasks and tools, skills, permissions, and shared Agent UI.
  整合 Agent 对话、持久任务与工具、技能、权限和共享界面。
- Subtitle translation, bilingual captions, video localization, and local dubbing workflows.
  整合字幕翻译、双语字幕、视频本地化和本地配音流程。
- Improved Electron packaging, dependency pruning, and runtime payload validation.
  整合 Electron 打包、依赖裁剪和运行时文件校验改进。

## Skipped Vendor-Specific Publishing / 跳过的厂商专属发布

- Microsoft Store packaging and submission are excluded because upstream's package identity and publisher certificate belong to Nexmoe, not this fork.
  跳过 Microsoft Store 打包与提交，因为上游商店应用身份和发布证书属于 Nexmoe，并非此 fork。
- GitHub Releases continue using Vendetta's repository, tag channel, and macOS update manifest.
  GitHub Release 继续使用 Vendetta 仓库、更新通道和 macOS 更新清单。
