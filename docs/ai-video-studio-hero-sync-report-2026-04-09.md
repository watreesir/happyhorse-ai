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
