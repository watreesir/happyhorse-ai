# Creem Moderation API 接入综合手册

> 适用范围：
> - 需要接入 Creem Moderation API 的 AI 视频、图片、音频、音乐等生成式项目
> - 可以配合 Creem 支付一起使用
> - 也可以在**完全不接入 Creem 支付**的前提下，单独接入 Creem 风控 API
>
> 本文目标：
> 1. 沉淀本次需求从产品、前端、后端、测试、上线到排障的完整经验
> 2. 让后续其他 AI 内容项目尽量一次性接入到位
> 3. 明确哪些做法是 Creem 官方要求，哪些做法是本项目的工程决策

---

## 1. 背景与结论

Creem 要求所有运行 AI 图片或视频生成业务的商户，在真正调用上游生成模型之前，先用 Creem Moderation API 对**用户输入的文本提示词**做一次审核。

官方核心要求可以概括为五句话：

1. 所有会送进生成模型的用户文本，都必须先走 `POST /v1/moderation/prompt`
2. 审核必须发生在**排队、扣费、上游模型调用之前**
3. `deny` 不能放行
4. `flag` 官方建议也按拦截处理
5. 如果 Moderation API 超时、5xx、网络失败，必须 **fail-closed**，不能“审核失败了也照样生成”

虽然 Creem 官方页面重点写的是 `image / video`，但本项目第一阶段把 `Image / Video / Audio / Music` 四大生成链路全部统一纳入了审核，避免后续二次工程留尾巴。

---

## 2. 官方协议与能力边界

### 2.1 接口

- 方法：`POST /v1/moderation/prompt`
- 请求字段：
  - `prompt: string`，必填
  - `external_id: string`，选填，建议传
- 响应关键字段：
  - `id`
  - `decision`
  - `usage.units`

### 2.2 决策值

- `allow`
  - 允许继续生成
- `flag`
  - 官方说明：未被显式 deny，但会被 Creem 重点关注
  - 官方建议：按 block 处理
- `deny`
  - 明确禁止放行

### 2.3 环境区分

Creem Moderation API **区分测试环境和生产环境**：

| 环境 | Base URL | API Key 前缀 |
| --- | --- | --- |
| Sandbox / Test | `https://test-api.creem.io` | `creem_test_...` |
| Production | `https://api.creem.io` | `creem_...` |

必须成对使用：

- `test-api` 只能配 `creem_test_...`
- `api.creem.io` 只能配 `creem_...`

### 2.4 能力边界

Creem 当前这版 Moderation API 的审核对象是**文本 prompt**，不是图片、视频、音频文件本身。

所以：

- 它可以拦截“用户写了什么”
- 不能替代你对上传素材本身的审核

如果业务允许纯素材驱动、无文本 prompt 的生成，就必须在产品和后端层面额外定义策略，而不能指望 Creem 直接审核二进制素材。

---

## 3. 本项目的目标与产品决策

本项目这次接入 Creem Moderation API，采用了下面这些产品和技术决策。

### 3.1 覆盖范围

本次统一覆盖：

- `AI Image`
- `AI Video`
- `AI Audio`
- `AI Music`

同时覆盖：

- 当前主生成路由
- 老的公开路由
- 登录态和游客态的旧 Sora2 视频创建入口

明确不纳入本次范围的能力：

- `chat/*` 旧文本聊天接口
- `AI Assistant / suggestions` 提示词建议接口

原因：

- 这两者都不是最终媒体生成入口
- 最终生成时仍然会在生成路由统一审核

### 3.2 审核策略

本项目的审核策略如下：

- `allow`：放行
- `deny`：拦截
- `flag`：默认拦截，但提供开关允许未来放行
- 审核失败（超时、5xx、网络错误、缺 key）：统一 `503`，fail-closed

### 3.3 用户提示文案

本项目最终选定：

- 拦截文案：
  - `Sorry, prompt not processed. Please revise and resubmit.`
- 审核服务不可用文案：
  - `Safety check is temporarily unavailable. Please try again later.`

说明：

- `deny` 和 `flag` 对用户共用同一套文案，不暴露具体原因
- 这样可以减少被反复试探策略边界的风险

### 3.4 无文本 Prompt 的策略

本项目最终做法：

- 如果某条生成链路本质上需要文本语义参与生成，就强制填写 prompt
- 以前可空的 `Grok I2V / Upscale`，这次改成了前后端都必须有 prompt

原因：

- 纯无文本请求会绕过文本审核
- 这和 Creem “所有用户 prompt 先审再生成”的思路冲突

---

## 4. 当前项目的落地实现

### 4.1 统一 Moderation Helper

本项目没有把 Creem 逻辑散落到每个 provider SDK，而是统一收口到一个 helper：

- [src/shared/services/creem-moderation.ts](/Users/zhangdeyuan/my-shipany-project/src/shared/services/creem-moderation.ts:1)

这个 helper 负责：

1. 构造请求并调用 `POST /v1/moderation/prompt`
2. 解析 `allow / flag / deny`
3. 统一生成用户可见错误响应
4. 处理超时、5xx、网络失败
5. 处理总开关与调试开关
6. 生成审计友好的 `external_id`

### 4.2 环境变量

本项目目前使用这些变量：

```env
CREEM_MODERATION_ENABLED=true
CREEM_MODERATION_API_BASE=https://api.creem.io
CREEM_MODERATION_API_KEY=creem_xxxxx
CREEM_MODERATION_BLOCK_FLAG=true
CREEM_MODERATION_TIMEOUT_MS=5000
```

调试变量：

```env
CREEM_MODERATION_FORCE_DECISION=deny
```

注意：

- `CREEM_MODERATION_FORCE_DECISION` 只在**非生产环境**生效
- 生产环境会自动忽略它

### 4.3 总开关

本项目增加了一个总开关：

- `CREEM_MODERATION_ENABLED=true|false`

行为定义：

- `true`
  - 正常调用 Creem Moderation API
- `false`
  - 完全跳过 Creem Moderation 调用
  - 恢复到当前既有生成后端链路

它只控制：

- 是否调用 Creem 风控 API

它**不控制**：

- 前端文案是否恢复旧版
- 某些原本已收紧的必填校验是否恢复旧版

### 4.4 Flag 开关

本项目没有把 `flag` 策略写死，而是做成了可切换：

- `CREEM_MODERATION_BLOCK_FLAG=true|false`

行为定义：

- `true`
  - `flag` 视同拦截
- `false`
  - `flag` 放行，但仍保留日志

默认建议：

- 生产默认 `true`

### 4.5 调试开关

本项目为了快速验证“前置拦截链路”是否正确，增加了开发测试环境专用调试开关：

- `CREEM_MODERATION_FORCE_DECISION=allow|flag|deny`

用途：

- 不依赖 Creem 真实策略，也不依赖猜测 prompt
- 直接模拟 Creem 返回 `allow / flag / deny`

用途边界：

- 它验证的是**我方接入逻辑和业务处理逻辑**
- 它**不能验证** Creem 真实模型会不会把某条 prompt 判成 `deny`

---

## 5. 当前项目具体接入点

### 5.1 统一生成路由

- [src/app/api/ai/generate/route.ts](/Users/zhangdeyuan/my-shipany-project/src/app/api/ai/generate/route.ts:1)

本项目第一阶段把图片、视频、音乐三类现有生成请求统一收口在这个路由前置审核。

顺序是：

1. 请求限流
2. 解析请求和基础参数校验
3. 收集可审核文本；没有文本直接返回 `400`
4. 读取配置并校验 provider / mediaType / scene
5. 鉴权；非视频游客不允许继续
6. Creem Moderation
7. 游客额度预占 / 每日积分领取
8. 创建 `ai_task` / 扣积分
9. 调第三方 provider createTask

这保证 Creem 拦截、不可用、无文本请求都不会扣积分、不会创建任务、不会调用第三方 provider。

### 5.2 审核文本收集

- 主 `prompt`
- `options` 中会参与生成语义的文本字段，例如：
  - `caption`
  - `content`
  - `description`
  - `lyrics`
  - `multi_prompt` / `multiPrompt`
  - `name`
  - `negative_prompt` / `negativePrompt`
  - `negativeTags`
  - `style`
  - `text`
  - `title`

原因：

- 避免只审主 prompt，漏掉 custom mode 或附加选项里的高风险文本。

### 5.3 当前未纳入范围

- `/api/chat` 相关文本聊天接口
- AI Assistant / suggestions 类提示词建议接口

原因：

- 它们不是最终媒体生成入口。
- 最终进入媒体生成时仍会在 `/api/ai/generate` 统一审核。

---

## 6. 当前项目的前端变化

### 6.1 已适配入口

- 首页 Hero：[src/themes/default/blocks/hero.tsx](/Users/zhangdeyuan/my-shipany-project/src/themes/default/blocks/hero.tsx:1)
- AI Video Studio：[src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/video-task-client.ts](/Users/zhangdeyuan/my-shipany-project/src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/video-task-client.ts:1)
- 旧视频生成器：[src/shared/blocks/generator/video.tsx](/Users/zhangdeyuan/my-shipany-project/src/shared/blocks/generator/video.tsx:1)
- 图片生成器：[src/shared/blocks/generator/image.tsx](/Users/zhangdeyuan/my-shipany-project/src/shared/blocks/generator/image.tsx:1)
- 音乐生成器：[src/shared/blocks/generator/music.tsx](/Users/zhangdeyuan/my-shipany-project/src/shared/blocks/generator/music.tsx:1)

### 6.2 通用错误读取

- [src/shared/lib/api-client.ts](/Users/zhangdeyuan/my-shipany-project/src/shared/lib/api-client.ts:1)

当前前端在 HTTP `400` / `503` 时会优先读取后端 `{ code, message, data }` 中的 `message`，避免只展示 `request failed with status: 400`。

### 6.3 无文本请求必填 Prompt

旧视频生成器的三种模式都已收紧为必须填写 prompt：

- `text-to-video`
- `image-to-video`
- `video-to-video`

这不是官方文档要求的固定实现方式，而是本项目为了避免文本审核被绕过做出的工程决策。

### 6.4 失败文案与用户认知

要区分两类失败：

1. **Creem 前置拦截**
   - 文案：
     - `Sorry, prompt not processed. Please revise and resubmit.`
   - 特征：
     - 请求直接在创建接口返回 `400`
     - 不创建第三方任务

2. **第三方 provider 后置失败**
   - 例如卡片文案：
     - `Generation failed due to a prompt issue. Please revise and retry.`
   - 特征：
     - 任务已经创建
     - 之后才在 provider 轮询阶段失败

这个区分很重要，避免误把 provider 拦截当成 Creem 生效。

---

## 7. 其他项目接入时的推荐设计

这一部分是本文最重要的可复用结论。

### 7.1 如果项目同时接 Creem 支付

最简单的方式就是复用现有 Creem 支付配置：

```env
CREEM_API_BASE=...
CREEM_API_KEY=...
```

优点：

- 变量少
- 环境切换简单

注意：

- `CREEM_API_BASE` / `CREEM_API_KEY` 会同时影响支付和 Moderation
- 如果你把某个环境切到 `test-api`，支付和 Moderation 都会一起走测试环境

### 7.2 如果项目**不接 Creem 支付**

仍然可以单独接入 Creem Moderation。

推荐做法是把 Moderation 配置独立出来，而不是复用支付变量名。

推荐命名：

```env
CREEM_MODERATION_API_BASE=https://api.creem.io
CREEM_MODERATION_API_KEY=creem_xxxxx
CREEM_MODERATION_ENABLED=true
CREEM_MODERATION_BLOCK_FLAG=true
CREEM_MODERATION_TIMEOUT_MS=5000
```

这样做的好处：

- 完全不依赖支付模块
- 更适合未来抽成 SDK / 中间件
- 语义更清晰

如果后续在其他项目里复用本文经验，我建议优先用这套“风控专属变量”。

### 7.3 推荐的统一封装方式

任何项目都建议抽一个统一 helper / service，而不是在每个生成接口里手写 fetch。

推荐职责：

1. 环境变量解析
2. timeout 控制
3. `allow / flag / deny` 路由策略
4. 统一错误码
5. 统一用户提示文案
6. `external_id` 生成
7. 调试开关支持

### 7.4 推荐错误码

建议统一这些后端错误码：

- `PROMPT_MODERATION_DENIED`
- `PROMPT_MODERATION_FLAGGED`
- `PROMPT_MODERATION_UNAVAILABLE`

这样前端能明确识别：

- 是内容被拦
- 还是审核服务暂时不可用

---

## 8. 推荐接入流程模板

这是最适合在其他项目里直接复用的通用流程。

### 8.1 生成接口的标准顺序

任何 AI 生成接口，建议统一按这个顺序：

1. 鉴权
2. 解析请求与基础校验
3. 生成/解析 `idempotencyKey`
4. 查询幂等任务并提前返回
5. 构造要审核的文本集合
6. 调用 Creem Moderation
7. 如果被拦截，立刻返回 `400` 或 `503`
8. 并发限制 / 队列决策
9. 扣费 / 余额检查
10. 调第三方模型创建任务
11. 记录任务并返回给前端

### 8.2 审核文本的构造原则

不要只审一个 `prompt` 字段，要审“实际会送给上游模型的所有用户文本”。

常见示例：

- 图片：
  - `prompt`
- 音频：
  - `text`
- 音乐：
  - `prompt`
  - `title`
  - `style`
  - `negativeTags`
- 视频：
  - `prompt`
  - 多镜头 `multiPrompt`
  - 元素描述 `name / description`
  - 任何会参与最终生成语义的补充字段

### 8.3 `external_id` 的建议

建议携带：

- 业务大类
- 用户 ID / guest ID
- 模型分支
- 请求幂等 ID
- 当前字段 key

不建议携带：

- IP
- Email
- 过于敏感的个人信息

原则：

- 能够排查问题
- 又尽量遵循数据最小化

---

## 9. 推荐的用户体验设计

### 9.1 用户可见文案

建议至少准备两套文案：

#### A. 被拦截

推荐：

```text
Sorry, prompt not processed. Please revise and resubmit.
```

特点：

- 语气中性
- 不暴露策略细节
- 适用于 `deny` 和 `flag`

#### B. 审核服务不可用

推荐：

```text
Safety check is temporarily unavailable. Please try again later.
```

特点：

- 用户知道是系统暂时不可用
- 不会误以为自己一定违规

### 9.2 前端不要出现的错误体验

如果是 Creem 前置拦截，前端不应该出现这些现象：

- 先显示“正在生成中”
- history 里先创建一条新任务
- 之后再失败

正确体验应该是：

- 点击生成后很快直接收到拦截 toast
- 不创建新的 provider 任务
- 不新建历史任务，或至少不出现“已提交到第三方”的状态

---

## 10. 测试方法与验证结论

### 10.1 不要把“猜敏感 prompt”当成唯一验证手段

本次项目实践已经证明：

- 即使 prompt 看起来非常敏感
- 也不一定会在 Creem sandbox/test 环境里稳定命中 `deny / flag`

因此：

- “某条 prompt 没被拦”不等于接入失败
- “某条 prompt 被拦”也不一定能说明是 Creem，可能是第三方 provider 自己拦的

### 10.2 正确的验证顺序

推荐按这个顺序测：

#### 第一步：验证 fail-closed

临时把 `CREEM_MODERATION_API_KEY` 改错。

预期：

- 生成请求直接返回 `503`
- 用户看到：
  - `Safety check is temporarily unavailable. Please try again later.`
- 不会创建第三方任务

这一步可以证明：

- 代码确实在调用 Creem
- 审核异常时不会直接放行

#### 第二步：验证前置 deny 链路

在开发/测试环境配置：

```env
CREEM_MODERATION_FORCE_DECISION=deny
```

预期：

- 终端出现：
  - `forcing moderation decision ... deny`
  - `prompt denied`
- 创建接口直接返回 `400`
- 不出现第三方 `createTask` 日志
- 用户看到：
  - `Sorry, prompt not processed. Please revise and resubmit.`

这一步可以证明：

- Creem 一旦返回 `deny`
- 业务会在前置阶段直接拦截
- 不会继续创建第三方任务

#### 第三步：恢复真实 Creem 线路

删除或注释：

```env
CREEM_MODERATION_FORCE_DECISION=deny
```

然后恢复真实 key，继续正常测试。

### 10.3 如何区分“Creem 拦截”还是“第三方后置失败”

#### Creem 前置拦截的特征

- 创建接口直接返回 `400` 或 `503`
- 终端有：
  - `[creem-moderation] prompt denied`
  - 或 `[creem-moderation] prompt flagged`
- **没有**第三方 `createTask` 日志

#### 第三方后置失败的特征

- 创建接口先返回成功响应
- 终端出现：
  - `[provider] creating job ...`
  - `createTask response ...`
- 一段时间后 history 卡片才显示失败

### 10.4 本项目已经完成的关键验证

本项目已经验证过：

1. 错误 `CREEM_MODERATION_API_KEY` 会触发 fail-closed
2. `CREEM_MODERATION_FORCE_DECISION=deny` 时，请求会前置返回 `400`
3. 被 deny 时不会继续创建第三方任务
4. 开发态调试开关不会影响生产环境

---

## 11. 生产上线建议

### 11.1 推荐生产配置

```env
CREEM_MODERATION_ENABLED=true
CREEM_MODERATION_API_BASE=https://api.creem.io
CREEM_MODERATION_API_KEY=creem_xxxxx
CREEM_MODERATION_BLOCK_FLAG=true
CREEM_MODERATION_TIMEOUT_MS=5000
```

生产环境要求：

- 不要使用 `creem_test_...`
- 不要使用 `https://test-api.creem.io`
- 不要保留 `CREEM_MODERATION_FORCE_DECISION`

### 11.2 生产上线前检查

1. 确认总开关已开启
2. 确认没有测试 key / test base URL 残留
3. 确认 `flag` 策略符合当前业务口径
4. 确认没有调试变量残留
5. 确认四大主生成链路至少各做一次正常 smoke test

### 11.3 数据库注意事项

本项目这次接入：

- 没有新增数据库表
- 没有新增 migration
- 没有新增审计落库逻辑

所以这次上线不需要数据库迁移。

如果未来其他项目想做更强的审计，可选扩展：

- 记录 moderation result id
- 记录 decision
- 记录 request external_id
- 记录 request timestamp

但这不是这次最小可行接入的必需项。

---

## 12. 常见坑与经验总结

### 12.1 不要只接主入口，忘了旧公开路由

如果老路由还存在并公开可访问，就必须一起接入。  
否则用户可能绕开主页面，直接通过旧接口绕过审核。

### 12.2 不要只审主 prompt

很多产品在视频、音乐模式下有额外文本字段。  
只审一个 `prompt` 往往不够。

### 12.3 不要把 provider 失败误当成 Creem 生效

只看卡片提示文案是不够的。  
必须结合：

- 创建接口状态码
- Creem 日志
- provider createTask 日志

一起判断。

### 12.4 不要在生产环境依赖“猜敏感词”做验收

正确做法是：

- 开发测试环境用 `FORCE_DECISION`
- 生产环境做 smoke test
- 必要时在低风险窗口验证 fail-closed

### 12.5 如果项目没有支付，不要强绑定支付变量命名

建议把 Moderation 的 env 独立命名，避免后续维护时误以为必须接 Creem Checkout 才能用风控。

---

## 13. 可直接复用的最小实现模板

下面给出一个与框架弱耦合的伪代码模板。

```ts
type ModerationDecision = "allow" | "flag" | "deny";

async function moderatePrompt(params: {
  prompt: string;
  externalId?: string;
}) {
  const res = await fetch(`${process.env.CREEM_MODERATION_API_BASE}/v1/moderation/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.CREEM_MODERATION_API_KEY!,
    },
    body: JSON.stringify({
      prompt: params.prompt,
      external_id: params.externalId,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`moderation_http_${res.status}`);
  }

  return (await res.json()) as {
    id: string;
    decision: ModerationDecision;
    usage?: { units?: number };
  };
}

export async function handleGenerate(req: Request) {
  const body = await req.json();
  const prompt = String(body.prompt ?? "").trim();

  if (!prompt) {
    return Response.json({ error: "prompt_required" }, { status: 400 });
  }

  let moderation;
  try {
    moderation = await moderatePrompt({
      prompt,
      externalId: `video:user_${body.userId}:req_${body.idempotencyKey}`,
    });
  } catch {
    return Response.json(
      { code: "PROMPT_MODERATION_UNAVAILABLE", error: "Safety check is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  if (moderation.decision === "deny" || moderation.decision === "flag") {
    return Response.json(
      { code: "PROMPT_MODERATION_DENIED", error: "Sorry, prompt not processed. Please revise and resubmit." },
      { status: 400 },
    );
  }

  // 只有走到这里，才允许排队 / 扣费 / 调上游模型
  return createProviderTask(body);
}
```

---

## 14. 当前项目文件索引

这部分用于未来回看本项目时快速定位。

### 14.1 核心实现

- [src/shared/services/creem-moderation.ts](/Users/zhangdeyuan/my-shipany-project/src/shared/services/creem-moderation.ts:1)
- [src/shared/lib/api-client.ts](/Users/zhangdeyuan/my-shipany-project/src/shared/lib/api-client.ts:1)

### 14.2 主生成路由

- [src/app/api/ai/generate/route.ts](/Users/zhangdeyuan/my-shipany-project/src/app/api/ai/generate/route.ts:1)

### 14.4 前端相关

- [src/themes/default/blocks/hero.tsx](/Users/zhangdeyuan/my-shipany-project/src/themes/default/blocks/hero.tsx:1)
- [src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/video-task-client.ts](/Users/zhangdeyuan/my-shipany-project/src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/video-task-client.ts:1)
- [src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/error-messages.ts](/Users/zhangdeyuan/my-shipany-project/src/app/[locale]/(landing)/(ai)/ai-video-studio/_lib/error-messages.ts:1)
- [src/shared/blocks/generator/video.tsx](/Users/zhangdeyuan/my-shipany-project/src/shared/blocks/generator/video.tsx:1)
- [src/shared/blocks/generator/image.tsx](/Users/zhangdeyuan/my-shipany-project/src/shared/blocks/generator/image.tsx:1)
- [src/shared/blocks/generator/music.tsx](/Users/zhangdeyuan/my-shipany-project/src/shared/blocks/generator/music.tsx:1)

---

## 15. 最终建议

如果未来在其他项目复用本次经验，最重要的不是直接复制当前仓库的所有细节，而是优先复制下面这 6 条原则：

1. 所有生成入口统一在后端前置调用 Moderation
2. 审核一定发生在排队、扣费、上游模型调用之前
3. `deny` 必拦，`flag` 默认也拦
4. 审核失败必须 fail-closed
5. 不只审主 prompt，要审所有会送给上游模型的用户文本
6. 用调试开关验证业务逻辑，不要只靠猜敏感 prompt

只要这 6 条做到位，后续不管是视频、图片，还是其他生成式项目，Creem Moderation 的接入都会更加稳。
