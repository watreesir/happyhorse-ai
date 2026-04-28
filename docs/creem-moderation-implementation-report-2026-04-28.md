# Creem Prompt Moderation 接入实施报告

日期：2026-04-28

## 背景

本次为线上 AI 生成业务接入 Creem Moderation API。接入目标是让所有会进入上游 AI 生成模型的用户文本，在扣积分、游客额度预占、创建任务、调用第三方生成 API 之前，先完成 Creem Prompt 风控审核。

本次接入遵循 `docs/creem-moderation-integration-playbook.md` 中沉淀的原则：

1. 生成前置审核，不做生成后补救。
2. `deny` 必须拦截。
3. `flag` 做成可配置策略，默认拦截。
4. Creem API 超时、5xx、网络异常、缺 key 时 fail-closed。
5. 不只审核主 `prompt`，也审核会参与生成语义的附加文本。
6. 不允许无文本 Prompt 的媒体生成绕过审核链路。

## 本次产品决策

- 第一阶段只覆盖现有 AI 内容生成类 Prompt，统一落点为 `/api/ai/generate`。
- 暂不覆盖 `/api/chat` OpenRouter 文本聊天。
- 不复用 Creem 支付配置，新增独立的 Creem Moderation 配置。
- 不新增数据库表，不新增 migration。
- 被拦截时给用户简单文案：`Sorry, prompt not processed. Please revise and resubmit.`
- 风控服务不可用时给用户简单文案：`Safety check is temporarily unavailable. Please try again later.`
- 无文本生成请求统一返回：`Please add a prompt before generating.`

## 新增配置

后台新增到 `Settings > AI > Creem Moderation`：

- `creem_moderation_enabled`
- `creem_moderation_api_base`
- `creem_moderation_api_key`
- `creem_moderation_block_flag`
- `creem_moderation_timeout_ms`

对应环境变量示例已写入 `.env.example`：

```env
CREEM_MODERATION_ENABLED="false"
CREEM_MODERATION_API_BASE="https://api.creem.io"
CREEM_MODERATION_API_KEY=""
CREEM_MODERATION_BLOCK_FLAG="true"
CREEM_MODERATION_TIMEOUT_MS="5000"
```

开发/测试专用调试变量：

```env
CREEM_MODERATION_FORCE_DECISION=allow|flag|deny
```

该调试变量只在非生产环境生效，不放入后台设置。

## 后端实现

新增统一 helper：

- `src/shared/services/creem-moderation.ts`

职责：

- 读取独立 moderation 配置。
- 构造 `POST /v1/moderation/prompt` 请求。
- 设置 timeout。
- 解析 `allow / flag / deny`。
- 支持非生产环境 `CREEM_MODERATION_FORCE_DECISION`。
- 生成统一错误码和用户文案。
- 收集 AI 生成请求中的可审核文本。

统一生成入口已接入：

- `src/app/api/ai/generate/route.ts`

新的执行顺序：

1. 请求限流。
2. 解析请求和基础参数校验。
3. 收集可审核文本；如果没有文本，直接返回 400。
4. 读取配置并校验 provider / mediaType / scene。
5. 鉴权；非视频游客仍不允许继续。
6. 调用 Creem Prompt Moderation。
7. 审核通过后，才进入游客额度预占 / 每日积分领取 / 创建 `ai_task` / 扣积分 / 调第三方 provider。

这保证 Creem 拦截、不可用、无文本请求都不会扣积分、不会创建任务、不会调用 KIE / Replicate / Fal / Gemini。

## 前端实现

新增通用 API 错误读取工具：

- `src/shared/lib/api-client.ts`

用途：

- 当后端返回 HTTP 400/503 且 body 是 `{ code, message, data }` 时，前端读取 `message` 展示给用户。
- 避免只显示 `request failed with status: 400` 这种不可读文案。

已适配入口：

- 首页 Hero：`src/themes/default/blocks/hero.tsx`
- 新视频工作台：`src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/video-task-client.ts`
- 旧视频生成器：`src/shared/blocks/generator/video.tsx`
- 图片生成器：`src/shared/blocks/generator/image.tsx`
- 音乐生成器：`src/shared/blocks/generator/music.tsx`

旧视频生成器已同步收紧：

- `text-to-video`
- `image-to-video`
- `video-to-video`

三种模式都必须填写 prompt，避免纯素材请求绕过文本风控。

## SEO 影响

本次没有改动：

- 页面路由结构
- metadata
- canonical
- robots / noindex
- sitemap
- 落地页内容结构

因此不应影响现有 SEO。

## 上线配置建议

生产环境建议：

```env
CREEM_MODERATION_ENABLED="true"
CREEM_MODERATION_API_BASE="https://api.creem.io"
CREEM_MODERATION_API_KEY="creem_xxxxx"
CREEM_MODERATION_BLOCK_FLAG="true"
CREEM_MODERATION_TIMEOUT_MS="5000"
```

上线前确认：

1. 生产环境不要使用 `https://test-api.creem.io`。
2. 生产环境不要使用 `creem_test_...` key。
3. 不要保留 `CREEM_MODERATION_FORCE_DECISION`。
4. 至少 smoke test：首页 Hero、AI Video Studio、旧视频页、图片页、音乐页。

## 建议验证顺序

1. 本地或测试环境设置 `CREEM_MODERATION_FORCE_DECISION=deny`，确认生成直接返回拦截文案，不扣积分、不创建任务、不调 provider。
2. 设置 `CREEM_MODERATION_FORCE_DECISION=flag` 且 `CREEM_MODERATION_BLOCK_FLAG=true`，确认行为同 deny。
3. 设置 `CREEM_MODERATION_FORCE_DECISION=allow`，确认原生成链路正常。
4. 临时配置错误 key，确认返回风控不可用文案，并且不会继续生成。
5. 清除 force 变量，使用真实 Creem key 做正常 smoke test。

## 主要改动文件

- `src/shared/services/creem-moderation.ts`
- `src/shared/lib/api-client.ts`
- `src/shared/lib/resp.ts`
- `src/app/api/ai/generate/route.ts`
- `src/shared/services/settings.ts`
- `src/config/locale/messages/en/admin/settings.json`
- `src/config/locale/messages/zh/admin/settings.json`
- `.env.example`
- `src/themes/default/blocks/hero.tsx`
- `src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/video-task-client.ts`
- `src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/error-messages.ts`
- `src/shared/blocks/generator/video.tsx`
- `src/shared/blocks/generator/image.tsx`
- `src/shared/blocks/generator/music.tsx`
