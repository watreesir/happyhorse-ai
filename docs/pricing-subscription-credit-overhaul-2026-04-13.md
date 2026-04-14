# Pricing / Subscription / Credit 改动报告

更新时间：2026-04-13

## 一、这轮完成了什么

本轮已完成定价页、订阅积分、一次性积分包、视频扣点规则、免费用户每日积分、年付月发、支付成功到账、以及引导购买的前后端联动改造。

核心结果如下：

1. 价格页已重构为新的双层结构：
   - 大 Tab：`Monthly` / `Yearly`
   - 每个周期下 4 个套餐：`Free` / `Standard` / `Premium` / `Unlimited`
   - `Yearly` 带 `-20%` 视觉标记
   - 默认高亮 `Yearly Premium`
   - 如果用户已有有效订阅，则优先高亮用户当前实际套餐
   - 如果没有有效订阅，则统一显示 `Free Current`

2. 原有旧结构已收口：
   - 移除了旧 `Starter`
   - 移除了旧 `Pay as you go`
   - 移除了旧套餐简介文案

3. 新增 `Credit Pack` 区块：
   - Starter / Standard / Premium 三档
   - 仅付费订阅用户可购买
   - 免费用户点击时不会下单，而是绿色 toast 提示并自动滚动到订阅区域

4. 订阅与积分发放规则已接通后端：
   - 月付：支付成功后立即到账当前周期的订阅积分
   - 年付：支付成功后立即到账首月积分，后续每月通过定时任务补发下一批月度积分
   - 年付每月发放的积分只活到下一次月发时间点
   - 一次性积分包支付成功后立即到账
   - 一次性积分包有效期当前按 `365` 天处理

5. 免费用户积分规则已落地：
   - 免费用户每日可领 `65` credits
   - 免费用户是否还能继续生成，改为只看当日剩余可用积分，不再额外叠加“每日次数上限”判定
   - 该规则不是纯前端展示，后端已有真实校验
   - 但如果用户仍持有未过期的已购永久积分，则不再吃这套 Free Daily 规则

6. 视频扣点规则已统一：
   - 不再按旧固定值扣点
   - 改为只区分两套环境变量：
     - `720p` 每秒消耗多少积分
     - `1080p` 每秒消耗多少积分
   - 首页 Hero 与 AI Video Studio 的按钮上，已改为展示按时长和分辨率动态估算的消耗值

7. 购买引导已打通：
   - 未登录用户点击订阅或 Credit Pack CTA，会直接触发 Google 登录
   - 积分不足时，会自动跳到 `/pricing`，滚动到订阅区域，并显示绿色提示
   - 免费用户点击 Credit Pack 时，也会滚动到订阅区域，并显示绿色提示

8. Unlimited CTA 当前按需求处理：
   - 不走 Stripe
   - 点击后复制 `support@happyhorse-ai.app`
   - 复制成功显示中英文 toast

## 二、已落地的业务规则

### 1. 套餐展示层

当前价格页展示逻辑：

- Monthly
  - Free
  - Standard
  - Premium
  - Unlimited
- Yearly
  - Free
  - Standard
  - Premium
  - Unlimited

### 2. 当前套餐识别规则

- 若用户存在有效订阅：
  - 取“最近一次成功购买且仍有效”的订阅作为 `Current`
- 若用户不存在有效订阅：
  - 前端统一显示 `Free Current`
- 注意：
  - 即使用户仍有未过期的 Credit Pack 积分，也不会改变前端套餐身份，仍然显示 `Free Current`

### 3. Credit Pack 购买资格

- 只有“当前有有效付费订阅”的用户才能购买 Credit Pack
- 后端已做校验
- 前端也已做拦截提示

### 4. 积分消费顺序

当前规则：

1. 优先扣订阅积分
2. 订阅积分不足时，再扣一次性 Credit Pack 积分

### 5. 免费用户日常规则

- 每日 credits：`65`
- 是否还能继续生成：只由当天剩余可用积分决定
- 游客 / 纯 Free 用户可用
- 持有未过期已购永久积分的用户，不再享受该 free daily 规则

### 6. 年付月发规则

- Stripe 年付只负责收全年费用
- 实际积分按“月”为单位发放
- 首次支付成功时先发第一批月度 credits
- 后续由 Vercel Cron 按月补发
- 每批年付月发 credits 的到期时间，为“下一次应发时间点”

## 三、支付与发放链路

### 1. 订阅购买

链路：

1. 前端点击套餐 CTA
2. 调用 `/api/payment/checkout`
3. 进入 Stripe Checkout
4. 支付成功后回到 `/api/payment/callback`
5. 服务端调用支付成功处理逻辑
6. 写入订单 / 订阅 / credits

### 2. Credit Pack 购买

链路：

1. 前端点击 Credit Pack CTA
2. 服务端先校验是否存在有效付费订阅
3. 通过后进入 Stripe Checkout
4. 支付成功后立即发放对应 credits

### 3. 年付后续月发

链路：

1. `vercel.json` 已配置 Cron
2. 命中 `/api/internal/cron/subscription-monthly-credits`
3. 服务端扫描应补发的年付订阅
4. 按锚点月份补发
5. 通过 grant key 做幂等，避免重复发放

## 四、幂等与防盗刷处理

这轮已经特别处理以下风险点：

1. 支付成功回调幂等
   - 已支付订单不会重复处理

2. 年付月发幂等
   - 使用月度 grant key 控制同一时间窗只发一次

3. Credit Pack 重复购买资格校验
   - 免费用户无法直接购买

4. 同套餐重复购买保护
   - 用户已有同一有效订阅时，不会再次进入相同套餐购买

## 五、与 SEO 相关的处理

这轮没有改动页面 metadata、canonical、JSON-LD、长 SEO 文案，也没有把价格区做成新的营销页模板。

当前处理原则：

- 不新增额外 SEO 内容区块
- 不改现有页面索引策略
- 不动现有价格页 metadata 配置结构
- 主要变更集中在页面内部组件、支付链路、积分逻辑

## 六、主要代码位置

### 价格与配置

- `src/shared/services/pricing.ts`
- `src/shared/types/pricing-display.ts`
- `src/app/[locale]/(landing)/pricing/page.tsx`
- `src/themes/default/blocks/pricing.tsx`
- `src/config/locale/messages/en/pages/pricing.json`
- `src/config/locale/messages/zh/pages/pricing.json`

### 支付与发放

- `src/app/api/payment/checkout/route.ts`
- `src/app/api/payment/callback/route.ts`
- `src/shared/services/payment.ts`
- `src/shared/services/subscription-grants.ts`
- `src/app/api/internal/cron/subscription-monthly-credits/route.ts`
- `vercel.json`

### 积分与订阅状态

- `src/shared/models/credit.ts`
- `src/shared/models/subscription.ts`
- `src/shared/blocks/sign/sign-user.tsx`

### 生成扣点与购买引导

- `src/app/api/ai/generate/route.ts`
- `src/themes/default/blocks/hero.tsx`
- `src/app/[locale]/(landing)/(ai)/ai-video-studio/_components/workspace-panel.tsx`
- `src/shared/lib/client-video-credits.ts`

## 七、当前依赖的关键环境变量

### 1. 扣点规则

- `AI_VIDEO_720P_CREDITS_PER_SECOND`
- `AI_VIDEO_1080P_CREDITS_PER_SECOND`
- `NEXT_PUBLIC_AI_VIDEO_720P_CREDITS_PER_SECOND`
- `NEXT_PUBLIC_AI_VIDEO_1080P_CREDITS_PER_SECOND`

说明：

- 服务端真实扣点读取 `AI_VIDEO_*`
- 前端展示估算读取 `NEXT_PUBLIC_AI_VIDEO_*`
- 建议这两组值保持一致

### 2. Free Daily

- `FREE_DAILY_CREDITS`
- `FREE_DAILY_VIDEO_LIMIT`

说明：

- `FREE_DAILY_CREDITS` 仍然生效，用于控制免费用户每日可领积分
- `FREE_DAILY_VIDEO_LIMIT` 已不再参与运行时生成拦截，当前仅保留为兼容旧配置

### 3. 套餐价格与积分

- `PRICING_MONTHLY_STANDARD_PRICE_USD`
- `PRICING_MONTHLY_PREMIUM_PRICE_USD`
- `PRICING_MONTHLY_STANDARD_CREDITS`
- `PRICING_MONTHLY_PREMIUM_CREDITS`
- `PRICING_YEARLY_STANDARD_PRICE_USD`
- `PRICING_YEARLY_PREMIUM_PRICE_USD`
- `PRICING_YEARLY_STANDARD_BILLED_PRICE_USD`
- `PRICING_YEARLY_PREMIUM_BILLED_PRICE_USD`
- `PRICING_YEARLY_STANDARD_MONTHLY_CREDITS`
- `PRICING_YEARLY_PREMIUM_MONTHLY_CREDITS`
- `PRICING_CREDIT_PACK_STARTER_PRICE_USD`
- `PRICING_CREDIT_PACK_STANDARD_PRICE_USD`
- `PRICING_CREDIT_PACK_PREMIUM_PRICE_USD`
- `PRICING_CREDIT_PACK_STARTER_CREDITS`
- `PRICING_CREDIT_PACK_STANDARD_CREDITS`
- `PRICING_CREDIT_PACK_PREMIUM_CREDITS`
- `PRICING_CREDIT_PACK_VALID_DAYS`
- `PRICING_SUPPORT_EMAIL`

### 4. Stripe Price ID 映射

- `STRIPE_PRICE_PLAN_STANDARD_MONTHLY`
- `STRIPE_PRICE_PLAN_PREMIUM_MONTHLY`
- `STRIPE_PRICE_PLAN_STANDARD_YEARLY`
- `STRIPE_PRICE_PLAN_PREMIUM_YEARLY`
- `STRIPE_PRICE_CREDIT_PACK_STARTER`
- `STRIPE_PRICE_CREDIT_PACK_STANDARD`
- `STRIPE_PRICE_CREDIT_PACK_PREMIUM`

说明：

- checkout 现在已支持直接使用 Stripe 的 `price_...`
- 这些变量优先级高于代码内默认映射
- 后续如果你在 Stripe 里重建价格，只要更新这 7 个环境变量，不需要再改业务代码

### 5. 定时任务

- `CRON_SECRET`

### 6. 邮件

- `POSTMARK_SERVER_TOKEN`
- `POSTMARK_FROM_EMAIL`
- `POSTMARK_MESSAGE_STREAM`

## 八、验证结果

本轮本地已验证：

- `pnpm exec tsc --noEmit`：通过
- `pnpm build`：通过

## 九、当前仍待补充 / 后续建议

以下内容当前建议作为下一轮处理项：

1. 价格页文案与权益继续细修
   - 当前已按确定规则落地主结构
   - 若还要精修某一行的展示顺序或术语，可以直接在 `pricing/page.tsx` 的 catalog builder 调整

2. 免费权限“Only Text to video accessible / Portrait upload feature unaccessible”
   - 本轮仍按你的要求，只做前端展示
   - 如果后续要做真实能力拦截，需要再在生成入口与上传能力上加服务端校验

3. Unlimited 线索收集
   - 当前仅复制邮箱
   - 若后续需要企业留资、联系表单、CRM 归档，再单独补

## 十、这轮一个关键修复说明

本轮还额外修复了一个构建阻塞问题：

- 原因：`pricing.ts` 运行时引用 `SubscriptionStatus`，导致订阅模型与定价服务之间出现循环依赖
- 影响：`pnpm build` 在 `/api/payment/callback` 页面数据收集阶段报错
- 处理：改为在 `pricing.ts` 内部直接使用稳定的订阅状态字符串常量，移除运行时 enum 依赖

这个修复已验证有效，当前构建已恢复正常。

## 十一、免费日常积分领取链路稳定性修正

本段保留的是“每日积分领取”相关修正；原先叠加在其上的免费视频次数限制，已在 2026-04-14 被取消。

1. 登录后自动领取增加轻量重试
   - 登录态组件现在会对每日积分领取接口做最多 3 次轻量重试
   - 目标是尽量避免因为偶发网络 / 接口波动导致免费积分“漏发”
   - 服务端本身按天幂等，因此这类重试不会造成同一天重复到账

2. 退出登录后会重置每日领取检查标记
   - 避免同一浏览器会话内再次登录时因为前一次状态残留而跳过领取检查

## 十二、2026-04-14 补充：取消双重限次逻辑

本次补充调整的目标，是让免费 / 游客链路只保留一套真实约束：积分。

具体变更如下：

1. 移除 `GUEST_TRIAL_MAX_TASKS` 运行时拦截
   - 游客是否还能发起任务，不再按任务次数单独阻断
   - 只要剩余 guest credits 足够，就允许继续生成

2. 移除 `FREE_DAILY_VIDEO_LIMIT` 运行时拦截
   - 登录 Free 用户是否还能生成，也不再额外看“今日已生成多少次”
   - 只要当天剩余可用积分足够，就允许继续生成

3. 保留原有积分账本与扣减顺序
   - 没有改动积分发放表结构
   - 没有改动订阅积分 / 一次性积分 / 免费积分的消费顺序
   - 只是去掉了叠加在积分系统之外的旧限次闸门

4. 前端错误分支同步收口
   - 首页 Hero 与 AI Video Studio 不再处理 `free daily video limit reached`
   - 后续当免费 / 游客用户受限时，只会落在“积分不足”或 guest risk block 这一套语义上

5. SEO 与页面结构不受影响
   - 没有改 metadata
   - 没有改 canonical / JSON-LD
   - 没有新增营销页结构
