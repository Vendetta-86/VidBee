# Vendetta v2.2.3 Sync / 同步记录

Date / 日期: 2026-10-17

Source / 来源: upstream tag `v2.2.3`; fork baseline `dc4178d`.

## Preserved / 保留内容

- Single-video metadata isolation and stale-request protection.
  保留单视频信息隔离及过期请求保护。
- Playlist URL parsing, entry previews, quality selection, and download arguments.
  保留播放列表链接识别、预览、画质选择及下载参数传递。
- Cookie fallback, original authenticated error reporting, and complete YouTube login checks.
  保留 Cookies 回退、原始登录请求报错及完整 YouTube 登录检查。
- The automatic update preference remains functional and defaults to off.
  自动更新开关保持可用，默认关闭。

## Preferred Upstream Changes / 采用的上游改进

- Shared format selectors and format presentation retain HLS formats across Desktop and Web.
  使用桌面和网页共享的格式选择与展示逻辑，保留 HLS 格式。
- Worker result files, pipe handling, and model probes use upstream's improved implementation.
  转录结果文件、进程管道处理和模型探测采用上游改进实现。
- Account, Agent, subscription, and release packaging improvements are integrated where compatible.
  整合兼容的账号、Agent、订阅和发行打包改进。

## Fork Adjustments / 分支调整

- Default filenames contain only the title and extension. Legacy branding and sharing flags cannot add `via VidBee`; saved templates also lose a trailing brand suffix.
  默认文件名仅含标题和扩展名，旧品牌设置及分享选项不再添加后缀，已保存模板中的品牌后缀也会清除。
- Filename branding controls are removed from Desktop and Web settings.
  桌面与网页设置同步移除文件名品牌后缀开关。
- Releases use `v2.2.3-vendetta.1`, the fork's GitHub update feed, and Vendetta update manifests.
  使用独立发行标签、分支仓库的更新地址及 Vendetta 更新清单。

The original conflict scan found 17 files. Conflicting blocks were initially kept from the fork; clearly better upstream implementations were then adopted as authorized. Integration fixes reconcile their interfaces without removing the preserved behaviors above.

初次对照发现 17 个冲突文件。先保留分支冲突块，再按授权采用明显更完善的上游实现；通过接口整合保留上述定制行为。
