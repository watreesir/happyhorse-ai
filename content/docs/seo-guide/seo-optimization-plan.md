# RemoveSora SEO 优化行动手册

> 目标：同步团队关于 GSC 反馈、站内结构、关键词布局与后续工作项，方便随时联动执行。

## 0. 方法论 & 适用场景

1. **先认清“权重流向”**  
   - 首页权重最高，负责把主题词和流量输送到关键内页。  
   - 内页通过正文、FAQ、CTA 回链到首页和其他关键页，形成双向传权。  
   - 任何新页面上线后，必须：① 在 sitemap & 内链中出现；② 结构/文案围绕明确的关键词意图。

2. **关键词分层与页面匹配**  
   - 把关键词拆成“主意图”（下载、去水印）和“问题型”两个层次。  
   - 每个页面只承担 1–2 个核心意图，避免重复竞争。  
   - FAQ 用长尾问句原文，既回答用户，又帮助收录。

3. **内容结构要素**  
   - 每个页面至少包含：独立 `<title>/<meta>`、H1/H2、说明段落、FAQ/CTA、内链。  
   - 段落内自然提及关键词（1–2 次），结合真实案例、数据或功能细节，避免模板式改词。  
   - 用结构化数据（FAQ/HowTo/Article）强化搜索展示。

4. **上线流程 checklist**  
   1. 写好页面内容（含关键词、内链）。  
   2. 加入 `app/sitemap.ts` 并部署。  
   3. 确认 robots 未屏蔽该路径。  
   4. 在 GSC 使用“URL 检查→请求编入索引”。  
   5. 监控 GSC 状态与流量表现，必要时迭代。

> 遵循以上逻辑，新增内页时只需：确定意图 → 设计内链 → 写差异化内容 → 按流程提交，即可复用整个方法论。

## 1. GSC 当前状况

| 问题类型 | 现状 | 处理策略 |
| --- | --- | --- |
| 备用网页（规范标记） | 5 个 URL，包含 `/about` 以及带 `?ref/utm` 的外部推广链接。验证已失败。 | **无需再次“验证修复”**。保持 canonical 指向主 URL。可选：在 `middleware.ts` 对带 `ref`/`utm` 的请求做 301，或在 GSC URL 参数中声明“不影响内容”。 |
| 网页会自动重定向 | 6 个 URL（HTTP 版、无 `www`、结尾 `/contact/` 等）自动跳转到正式地址。 | 属于正常 301 行为，无需处理。仅需确保服务器统一 301 到 `https://www.removesorawatermark.online/`。 |
| 已发现-尚未编入索引 | `/blog` 列表、三篇博文、`/refund`、`/sora-invite` 等 6 个 URL。 | 优先解决：① sitemap 已补充具体路径；② 在首页/页脚增加文本链接；③ 在 GSC 用“URL 检查→请求编入索引”；④ 确认页面性能与 200 状态。 |
| 已抓取-尚未编入索引 | `_next/static/css/...` 等静态资源。 | 在 `robots.txt` 中 `Disallow: /_next/`，减少无意义抓取。 |

## 2. Sitemap & Robots

- `app/sitemap.ts` 已新增 `/blog` 及三篇文章的静态条目，同时引入去重逻辑，避免重覆 URL。
- TODO：更新 `public/robots.txt`，至少增加：  
  ```
  User-agent: *
  Disallow: /_next/
  Disallow: /api/
  Allow: /
  Sitemap: https://www.removesorawatermark.online/sitemap.xml
  ```
- 部署后，记得在 GSC 的“站点地图”中重新提交 `sitemap.xml`。

## 3. 关键词与内链规划

### 3.1 关键词分组
1. **下载意图**：`download sora without watermark`、`download sora video without watermark` 等。
2. **去水印意图**：`how to remove sora watermark`、`remove watermark sora`、`sora watermark remover` 等。
3. **FAQ / 问题**：`how to download sora video without watermark`、`can i remove watermark in video created from sora`、`how are the watermarks in sora chatgpt` 等。

### 3.2 页面-关键词-链接表（完整）

| 页面/模块 | 主关键词 | 植入方式 | 内链指向 |
| --- | --- | --- | --- |
| 首页 Hero + CTA | `download sora without watermark`、`download sora video without watermark` | Hero 副标题和 CTA 按钮写明“Download your Sora video without watermark in 3 seconds” | 回链首页工具入口（Hero 表单） |
| 首页 Features / Steps / Stats / FAQ | `remove sora watermark`、`sora watermark remover`、`how to remove sora watermark` | Features 小标题出现“Fast Sora watermark remover”；Steps 描述“Learn how to remove Sora watermark”；FAQ 用提问原句 | 链接到 `/blog/how-to-remove-sora-watermark`、FAQ 页面锚点 |
| 首页 Pricing & CTA | `sora video without watermark`、`download sora videos without watermark` | 各套餐说明如“Download Sora videos without watermark faster with Pro”；CTA 按钮文本包含关键词 | 链接到 `/sora-invite`、`/blog/free-sora-watermark-remover` |
| `/blog` 列表页 | `sora watermark guide`（衍生） / `how to remove sora watermark` | 列表页引导段写“Guides on how to remove Sora watermark and download clean videos” | 列表页 → 各篇文章；页尾回链首页 |
| `/blog/how-to-remove-sora-watermark` | `how to remove sora watermark`、`how to remove watermark from sora`、`how are the watermarks in sora chatgpt` | H1/H2 使用主关键词；在文末加入 FAQ，问题用原句；步骤中自然提到“Download Sora video without watermark” | 回链首页 Hero、Pricing、`/blog/free-sora-watermark-remover` |
| `/blog/free-sora-watermark-remover` | `sora watermark remover`、`remove watermark sora`、`sora remove watermark` | 引言用“Free Sora watermark remover”；功能对比段提这些关键词 | 链接到首页 Hero、`/blog/how-to-remove-sora-watermark` |
| `/blog/how-to-get-sora-invite-code` | `chatgpt plus sora watermark`、`sora watermark` | 解释 ChatGPT Plus 用户仍有 watermark 的段落中植入；FAQ 回答“how are the watermarks in sora chatgpt” | 链接到 `/sora-invite`、首页 Hero |
| `/sora-invite` | `download sora video without watermark`、`sora video without watermark` | Hero 文案：“Get your invite code & download Sora videos without watermark legally”；步骤中强调无水印下载 | 回链首页工具、`/blog/how-to-remove-sora-watermark` |
| `/refund` | `remove sora watermark`、`sora watermark remover`（品牌一致性） | 在退款条款中说明“Refund policy for Remove Sora Watermark service” | 链接到 `/contact`、FAQ、首页 |
| FAQ 模块（首页 & 文章内） | `how to remove sora watermark`、`how to download sora video without watermark`、`how to remove watermark from sora`、`can i remove watermark in video created from sora`、`how are the watermarks in sora chatgpt` | 以完整问句作为 FAQ 标题，回答中给简要步骤与资源链接 | 针对每个问题分别链接到 `/blog/how-to-remove-sora-watermark`、`/blog/free-sora-watermark-remover`、`/sora-invite`、首页工具 |

> 注意：每个关键词自然出现 1–2 次即可，避免堆砌。

## 4. 其他待办建议

1. **结构化数据**：  
   - 博客页面加 `Article` schema；  
   - 首页/工具页考虑 `SoftwareApplication` 或 `Product`；  
   - FAQ/HowTo 继续维护，确保与页面内容一致。
2. **内容差异化**：  
   - 在博客与 Sora Invite 页加入更新日期、用户案例、对比表、FAQ 等独特信息，提升 E-E-A-T。  
   - 功能模块可增加“批量生成”/“复制链接”按钮，改善体感。
3. **性能优化**：  
   - 用 Lighthouse 检查 LCP/CLS，重点关注 Hero 视频、Pricing 的 Suspense loading。必要时对图片/视频使用 `priority`、`preload` 或更轻的占位。  
4. **外链/推广**：  
   - 策划博客摘录、Reddit/论坛分享，带 canonical 链接，引导外部提及。  
5. **监控追踪**：  
   - 对 CTA 点击、FAQ 展开等加事件埋点（GA/Plausible），根据数据调整文案与内链。
6. **定期复查**：  
   - 每两周在 GSC 检查“已发现-未收录”列表，必要时重复“URL 检查→请求编入索引”。  
   - 如有新页面，确保及时添加到 sitemap 并在首页/页脚建立内链。

## 5. 执行顺序建议

1. **确认 sitemap & robots**（已处理 / 待部署 & GSC 提交）。  
2. **FAQ & 内链更新**：按照表格调整首页与各内页文案。  
3. **请求收录**：对 `/blog` 与关键 landing page 逐个在 GSC 请求索引。  
4. **结构化数据 & 内容优化**：补充 schema、差异化内容。  
5. **性能 & 埋点**：Lighthouse 检查、添加事件追踪。  
6. **外链推广**：在社区/合作渠道发布教程或案例。

> 本文档可作为团队执行 checklist，修改内容时同步更新，以便追踪完成度。
