# AI Video Studio 联动改动报告（2026-04-09）

## 1. 目标与约束

本轮按“最小改动、不可破坏、SEO 不受影响”的原则，完成了首页 Hero 与 `/ai-video-studio` 的业务串联，不替换现有 `/ai-video-generator`，并保持 `/ai-video-studio` 继续 `noindex`。

## 2. 本轮完成内容

### 2.1 首页 Hero 真实任务链路

- Hero 的 `Generate` 已接入真实提交：
  - 调用 `/api/ai/generate`
  - 根据返回状态写入任务交接信息
  - 无论成功或失败都跳转到 `/ai-video-studio`
- 跳转默认落在 `Create`（`studioTab=create`）。
- 实现了 `query params + sessionStorage` 回填：
  - query 用于轻量字段（mode/prompt/ratio/duration/resolution 等）
  - sessionStorage 用于复杂字段（上传素材 URL、提交结果、错误信息）

### 2.2 Studio Workspace 升级为四类真实提交

- Workspace 现在支持四类工作流的真实提交：
  - text-to-video
  - image-to-video
  - reference-to-video
  - video-edit
- provider/model 保持隐藏，按 mode 自动映射默认值。
- 任务提交前做最小校验（如 prompt、必需素材），并给出可读错误提示。
- 提交后继续沿用真实轮询 `/api/ai/query`，并刷新 History / My Creations。

### 2.3 真上传能力

- 新增通用上传接口：`/api/storage/upload-media`
  - 支持 image / video / audio
  - 保留去重上传策略（按 md5 + key）
- Hero 与 Studio Workspace 已改用真实上传（非 mock 上传位）。

### 2.4 KIE 参数透传增强（最小兼容）

- 在 `src/extensions/ai/kie.ts` 的视频生成参数映射里，补充了常见字段映射并允许未知字段透传到 `input`，以兼容本轮新增工作流参数，不重构旧 provider 结构。

## 3. 主要改动文件

- `src/themes/default/blocks/hero.tsx`
- `src/app/[locale]/(landing)/(ai)/ai-video-studio/_components/workspace-panel.tsx`
- `src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/video-task-client.ts`
- `src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/types.ts`
- `src/app/[locale]/(landing)/(ai)/ai-video-studio/_data/mock-data.ts`
- `src/config/locale/messages/en/ai/video-studio.json`
- `src/config/locale/messages/zh/ai/video-studio.json`
- `src/extensions/ai/kie.ts`
- `src/app/api/storage/upload-media/route.ts`（新增）
- `src/shared/lib/media-upload.ts`（新增）
- `src/shared/lib/video-studio-workflow.ts`（新增）

## 4. SEO 与兼容性说明

- 未新增营销页结构（hero/faq/pricing 长内容）到 `/ai-video-studio`。
- 未改动 `/ai-video-generator` 路由和原有能力。
- `/ai-video-studio` 的 `noindex` 仍保留（`page.tsx` 未移除该配置）。

## 5. 验证结果

- `pnpm exec tsc --noEmit`：通过
- `pnpm build`：通过

## 6. 当前仍保留的限制

- Inspiration 仍为 mock 数据（按计划未接真实库）。
- 删除 / 下载 / 重做 / 模板回填等高级能力本轮未扩展。
- 参考工作流在业务层按既定策略映射到当前可用 scene（`image-to-video` / `video-to-video`），未引入旧项目整套接口体系。

## 7. 补充修复（积分显示与提示，2026-04-09）

### 7.1 问题定位

- 新用户看到 `25` 积分并同时收到“今日 +5”提示，原因是：
  - 开启了 `INITIAL_CREDITS_ENABLED=true`
  - `INITIAL_CREDITS_AMOUNT=20`
  - 首次登录又叠加了每日登录奖励 `+5`
- 首页 Hero 触发生成后，顶部积分偶发不立即变化，原因是：
  - Hero 提交完成后没有主动刷新用户积分上下文
  - Studio 接收 Hero 跳转后的首屏也未强制刷新积分

### 7.2 本次代码修复

- `src/themes/default/blocks/hero.tsx`
  - 提交成功/失败跳转前，增加 `fetchUserCredits()`，确保右上角余额及时同步。
- `src/app/[locale]/(landing)/(ai)/ai-video-studio/_components/workspace-panel.tsx`
  - 接收 Hero handoff 时主动刷新积分。
  - 轮询到终态（completed/failed）或终态错误时，主动刷新积分。
- `src/config/locale/messages/en/common.json`
- `src/config/locale/messages/zh/common.json`
  - 将每日奖励提示改为“今日奖励 +X”语义，避免与总余额混淆。

### 7.3 说明

- 本次未改动 `/ai-video-generator`。
- `/ai-video-studio` 的 `noindex` 未移除。
- 积分是否为“5 起步”取决于线上配置：
  - 若要新用户仅 5 积分起步，请将 `INITIAL_CREDITS_ENABLED=false`（或将 `INITIAL_CREDITS_AMOUNT=0`）。

## 8. 任务完成邮件通知 + 存储保留检查（2026-04-09）

### 8.1 任务完成邮件通知（全任务类型）

- 目标：任务进入终态后（`success / failed / canceled`），给任务所属用户发通知邮件。
- 覆盖范围：
  - `generate` 同步返回终态时触发（少数同步模型）
  - `query` 轮询进入终态时触发
  - `activity` 页面手动刷新任务进入终态时触发
  - 新增 `notify` webhook 回调路由后，服务端回调进入终态也可触发
- 通知文案：
  - 按用户 `locale` 自动使用中/英文
  - 主题与正文为 Happy Horse AI 自有表述，不使用旧项目品牌词
  - 成功与失败分别发送不同文案
- 去重策略：
  - 仅在“非终态 -> 终态”状态跃迁时发送，避免常规重复轮询重复发信

### 8.2 新增/修改文件

- 新增：
  - `src/shared/blocks/email/ai-task-finished.tsx`
  - `src/shared/services/ai-task-notify.tsx`
  - `src/app/api/ai/notify/[provider]/route.ts`
- 修改：
  - `src/shared/models/ai_task.ts`（新增按 provider taskId 查任务）
  - `src/app/api/ai/generate/route.ts`
  - `src/app/api/ai/query/route.ts`
  - `src/app/[locale]/(landing)/activity/ai-tasks/[id]/refresh/page.tsx`

### 8.3 Cloudflare/R2 保留时长检查结论

- 当前代码侧没有“30 天自动删除”的内建逻辑，也没有 R2 生命周期参数配置项。
- 当前逻辑是把生成结果上传到你自己的 R2（`KIE_CUSTOM_STORAGE=true`），对象会一直保留，直到你在 R2 生命周期规则里配置删除。
- 结论：
  - **“能保留 30 天”可以做到**（在 Cloudflare R2 配置生命周期规则）。
  - **当前仓库默认并未强制 30 天删除**（不是代码自动执行）。
