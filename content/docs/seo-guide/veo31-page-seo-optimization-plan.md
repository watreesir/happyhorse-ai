# Veo3.1 页面 SEO 优化实施方案

> 本文档基于 SEO 审计结果，提供 `/veo3-1` 页面的具体优化步骤。执行者可按优先级顺序逐项完成。

**审计日期**: 2026-01-23
**更新日期**: 2026-01-23
**目标页面**: `/veo3-1` (Veo3.1 AI Video Generator)

**关键词策略**:
- Meta Title / Description / H1 / H2 标题：使用 `Veo3.1`（无空格）
- 正文描述、FAQ 回答：可混用 `Veo3.1` 和 `Veo 3.1` 增加语义覆盖

---

## 目录

1. [优化任务总览](#优化任务总览)
2. [高优先级修改](#高优先级修改)
3. [中优先级修改](#中优先级修改)
4. [低优先级修改](#低优先级修改)
5. [可选优化](#可选优化)
6. [验证清单](#验证清单)
7. [附录：当前 SEO 状态](#附录当前-seo-状态)

---

## 优化任务总览

| 优先级 | 任务 | 文件 | 状态 |
|--------|------|------|------|
| 🔴 高 | 添加 OG/Twitter 社交分享图片 | `page.tsx` | ⬜ 待完成 |
| 🔴 高 | H1 标题添加完整主关键词 | `messages/en.json` | ⬜ 待完成 |
| 🔴 高 | FAQ 标题添加主关键词 | `messages/en.json` | ⬜ 待完成 |
| 🔴 高 | 统一其他 H2 标题关键词拼写 | `messages/en.json` | ⬜ 待完成 |
| 🟡 中 | FAQ 添加 subtitle | `messages/en.json` + 组件 | ⬜ 待完成 |
| 🟡 中 | 追加 3 条长尾 FAQ | `messages/en.json` + 组件 + `page.tsx` | ⬜ 待完成 |
| 🟡 中 | 对比表格添加 Sora 2 内链 | 组件文件 | ⬜ 待完成 |
| 🟡 中 | 添加 SoftwareApplication 结构化数据 | `page.tsx` | ⬜ 待完成 |
| 🟢 低 | 评估 OpenGraph siteName | `page.tsx` | ⬜ 待完成 |
| ⚪ 可选 | Meta Description 微调 | `messages/en.json` | ⬜ 可选 |

---

## 高优先级修改

### 任务 1: 添加 OG/Twitter 社交分享图片

**问题**: 当前页面缺少 OpenGraph 和 Twitter Card 图片，社交分享时无法显示预览图。

**文件位置**: `app/[locale]/(marketing)/veo3-1/page.tsx`

**图片资源**: `/public/Veo_OG.jpg`

**当前内容** (约 50-65 行):
```typescript
return {
  title,
  description,
  keywords,
  alternates: { canonical: "/veo3-1" },
  openGraph: {
    title,
    description,
    type: "website",
    url: `${siteUrl}/veo3-1`,
    siteName: "Remove Sora Watermark",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};
```

**修改为**:
```typescript
return {
  title,
  description,
  keywords,
  alternates: { canonical: "/veo3-1" },
  openGraph: {
    title,
    description,
    type: "website",
    url: `${siteUrl}/veo3-1`,
    siteName: "Remove Sora Watermark",
    images: [
      {
        url: `${siteUrl}/Veo_OG.jpg`,
        width: 1200,
        height: 630,
        alt: "Veo3.1 AI Video Generator - Create Cinematic Videos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${siteUrl}/Veo_OG.jpg`],
  },
};
```

**修改理由**:
- 社交分享时图片是最吸引眼球的元素
- 缺失图片会导致分享效果大打折扣
- Twitter Card 需要 images 才能正确显示大图预览

> ⚠️ **路径注意**: 图片文件名为 `Veo_OG.jpg`（大写 V），代码中引用路径区分大小写。部署前请确认 `/public/Veo_OG.jpg` 文件存在且路径一致，避免 404 错误。

---

### 任务 2: H1 标题添加完整主关键词

**问题**: 当前 H1 为 "Create Cinematic Videos with Veo.3.1"，未包含完整的目标关键词组合 "Veo3.1 AI Video Generator"。

**文件位置**: `messages/en.json`

**当前内容** (veo31Page.hero 部分):
```json
"hero": {
  ...
  "title": "Create Cinematic Videos with <gradient>Veo<dot>.</dot>3.1</gradient>",
  "titleLine1": "Create Cinematic Videos",
  "titleLine2": "with <gradient>Veo<dot>.</dot>3.1</gradient>",
  ...
}
```

**修改为**:
```json
"hero": {
  ...
  "title": "Veo3.1 AI Video Generator - Create Cinematic Videos",
  "titleLine1": "Veo3.1 AI Video Generator",
  "titleLine2": "Create Cinematic Videos",
  ...
}
```

**注意**:
- `titleLine1` 使用纯文本（不带 `<gradient>` 标签），因为组件只对 `titleLine2` 支持富文本渲染
- 如果需要保留渐变效果，需额外修改 Hero 组件支持 `titleLine1` 的富文本

**修改理由**:
- H1 是页面最重要的 SEO 元素之一
- 包含完整关键词 "Veo3.1 AI Video Generator" 有助于搜索排名
- 保持用户价值表达 "Create Cinematic Videos"

---

### 任务 3: FAQ 标题添加主关键词

**问题**: FAQ section 的 H2 标题未包含主关键词，错失重要 SEO 位置。

**文件位置**: `messages/en.json`

**当前内容** (veo31Page.faq 部分):
```json
"faq": {
  "sectionTitle": "Frequently Asked Questions",
  ...
}
```

**修改为**:
```json
"faq": {
  "sectionTitle": "Veo3.1 AI Video Generator - Frequently Asked Questions",
  ...
}
```

**修改理由**:
- H2 级别标题是搜索引擎重点关注的位置
- 与 Sora 2 页面保持一致的 SEO 策略
- 增加页面主关键词密度

---

### 任务 4: 统一其他 H2 标题关键词拼写

**问题**: 关键词策略要求 H2 使用 `Veo3.1`（无空格），但部分 H2 标题仍使用 `Veo 3.1`（有空格）。

**文件位置**: `messages/en.json`

**需要检查和统一的位置**:

#### 4.1 Features Section 标题

**检查路径**: `veo31Page.features.sectionTitle`

如果当前为 `"Veo 3.1 Fast ingredients to video"`，修改为：
```json
"sectionTitle": "Veo3.1 Fast ingredients to video"
```

#### 4.2 Model Selector Section 标题

**检查路径**: `veo31Page.chooseModel.sectionTitle`

如果当前为 `"Pick Your Veo 3.1 Model"`，修改为：
```json
"sectionTitle": "Pick Your Veo3.1 Model"
```

#### 4.3 Comparison Section 标题

**检查路径**: `veo31Page.features.comparison.title`

如果当前为 `"Veo 3.1 fast VS Veo 3.1 quality VS Sora 2"`，修改为：
```json
"title": "Veo3.1 Fast VS Veo3.1 Quality VS Sora 2"
```

**检查方法**:
```bash
# 在项目根目录执行，查找所有 H2 级别中的 "Veo 3.1"（有空格）
grep -n "Veo 3.1" messages/en.json | grep -i "title\|Title"
```

**修改理由**:
- 统一关键词拼写，避免权重分散
- 与 Meta Title 和 H1 保持一致

---

## 中优先级修改

### 任务 5: FAQ 添加 subtitle

**问题**: FAQ section 缺少 subtitle，对比 Sora 2 页面有 subtitle 说明。

#### 步骤 5.1: 添加翻译文本

**文件位置**: `messages/en.json`

**修改为**:
```json
"faq": {
  "sectionTitle": "Veo3.1 AI Video Generator - Frequently Asked Questions",
  "sectionSubtitle": "Common questions about using Veo3.1 for AI video generation on our platform.",
  "items": { ... }
}
```

#### 步骤 5.2: 更新组件以显示 subtitle

**文件位置**: `features/video-generation/components/veo31/Veo31FAQ.tsx`

**当前内容** (约 27-31 行):
```tsx
return (
  <section id="veo31-faq" className={styles.section}>
    <div className={styles.header}>
      <h2 className={styles.title}>{t("sectionTitle")}</h2>
    </div>
    ...
```

**修改为**:
```tsx
return (
  <section id="veo31-faq" className={styles.section}>
    <div className={styles.header}>
      <h2 className={styles.title}>{t("sectionTitle")}</h2>
      <p className={styles.subtitle}>{t("sectionSubtitle")}</p>
    </div>
    ...
```

#### 步骤 5.3: 添加 CSS 样式 (如需要)

**文件位置**: `features/video-generation/components/veo31/Veo31FAQ.module.css`

检查是否已有 `.subtitle` 样式，如无则添加:
```css
.subtitle {
  color: var(--color-text-secondary);
  font-size: 1rem;
  margin-top: 0.5rem;
  text-align: center;
}
```

---

### 任务 6: 追加 3 条长尾 FAQ

**目的**: 增加长尾关键词覆盖，提升页面在更多搜索场景下的可见性。

#### 步骤 6.1: 更新 FAQ_KEYS 常量

**文件位置**: `features/video-generation/components/veo31/Veo31FAQ.tsx`

**当前内容**:
```tsx
const FAQ_KEYS = ["one", "two", "three", "four", "five"] as const;
```

**修改为**:
```tsx
const FAQ_KEYS = ["one", "two", "three", "four", "five", "six", "seven", "eight"] as const;
```

#### 步骤 6.2: 添加新的 FAQ 条目

**文件位置**: `messages/en.json` (veo31Page.faq.items 部分)

在现有 5 条 FAQ 后追加:

```json
"six": {
  "question": "How to create vertical videos for TikTok with Veo3.1?",
  "answer": "Veo3.1 natively supports 9:16 vertical format, perfect for TikTok, Instagram Reels, and YouTube Shorts. Simply select 'Portrait' or '9:16' in the aspect ratio settings before generating. The AI optimizes framing and composition specifically for vertical viewing."
},
"seven": {
  "question": "Can Veo3.1 generate videos with synchronized dialogue and sound effects?",
  "answer": "Yes, Veo3.1 features advanced audio integration that generates synchronized dialogue, sound effects, and ambient audio alongside the video. Unlike other AI video generators that require separate audio editing, Veo3.1 creates perfectly timed audio as an integral part of the generation process."
},
"eight": {
  "question": "What's the best choice between Veo3.1 Fast and Veo3.1 Quality for my project?",
  "answer": "Veo3.1 Fast uses lower credits and is ideal for rapid prototyping, draft iterations, and social content where speed matters. Veo3.1 Quality uses higher credits but delivers maximum visual fidelity, cleaner lighting, and stronger subject continuity for final productions. Many creators start with Fast mode to test concepts, then switch to Quality for the final render."
}
```

**注意**: FAQ 答案中使用模糊表述 "lower credits" 和 "higher credits"，避免硬编码具体数值，便于后续价格调整时无需同步更新文案。

#### 步骤 6.3: 更新 JSON-LD 结构化数据

**文件位置**: `app/[locale]/(marketing)/veo3-1/page.tsx`

在 `faqJsonLd` 的 `mainEntity` 数组中追加新的 3 条 FAQ 条目，格式与现有条目一致：

> ⚠️ **同步注意**: 当前采用手动同步方案，即 `messages/en.json` 中的 FAQ 内容与 `page.tsx` 中的 JSON-LD 数据需分别维护。修改 FAQ 时请务必同步更新两处。
>
> **未来优化建议**: 可考虑将 FAQ 数据抽取为单一数据源（如 `constants/veo31-faq.ts`），由组件和 JSON-LD 共同引用，避免重复维护。

```tsx
// 在 mainEntity 数组末尾追加
{
  "@type": "Question",
  "name": "How to create vertical videos for TikTok with Veo3.1?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Veo3.1 natively supports 9:16 vertical format, perfect for TikTok, Instagram Reels, and YouTube Shorts. Simply select 'Portrait' or '9:16' in the aspect ratio settings before generating. The AI optimizes framing and composition specifically for vertical viewing."
  }
},
{
  "@type": "Question",
  "name": "Can Veo3.1 generate videos with synchronized dialogue and sound effects?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Yes, Veo3.1 features advanced audio integration that generates synchronized dialogue, sound effects, and ambient audio alongside the video. Unlike other AI video generators that require separate audio editing, Veo3.1 creates perfectly timed audio as an integral part of the generation process."
  }
},
{
  "@type": "Question",
  "name": "What's the best choice between Veo3.1 Fast and Veo3.1 Quality for my project?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Veo3.1 Fast uses lower credits and is ideal for rapid prototyping, draft iterations, and social content where speed matters. Veo3.1 Quality uses higher credits but delivers maximum visual fidelity, cleaner lighting, and stronger subject continuity for final productions. Many creators start with Fast mode to test concepts, then switch to Quality for the final render."
  }
}
```

---

### 任务 7: 对比表格添加 Sora 2 内链

**目的**: 增强页面间关联，帮助搜索引擎理解网站结构，提升用户导航体验。

**文件位置**: 对比表格组件（需确认具体文件，可能在 `features/video-generation/components/veo31/` 目录下）

**修改内容**: 将表头 "SORA 2" 文字改为链接到 `/sora2-video`

```tsx
// 1. 在文件顶部引入 Link（如果尚未引入）
import Link from "next/link";

// 2. 在表头渲染处修改
<th>
  <Link href="/sora2-video" className={styles.headerLink}>
    SORA 2
  </Link>
</th>
```

**查找对比表格组件**:
```bash
# 在项目根目录执行
grep -rn "SORA 2\|Sora 2" features/video-generation/components/veo31/
```

**实施注意事项**:
- 确保组件顶部已 `import Link from "next/link"`，否则会报错
- 表头可能有默认样式（颜色、字体等），Link 可能需要添加 `className` 覆盖样式
- 如需保持表头原有样式，可添加 CSS：
  ```css
  .headerLink {
    color: inherit;
    text-decoration: none;
  }
  .headerLink:hover {
    text-decoration: underline;
  }
  ```

**修改理由**:
- 建立 Veo3.1 页面与 Sora 2 页面的语义关联
- 方便用户在两个产品间导航对比
- 有助于搜索引擎理解网站内部结构

**暂不实施的内链**:
- FAQ 答案内链：当前 FAQ 组件只支持纯文本渲染，不支持 Markdown 链接，暂时跳过

---

### 任务 8: 添加 SoftwareApplication 结构化数据

**目的**: 帮助搜索引擎更好地理解页面内容类型，可能获得富文本搜索结果展示。

**文件位置**: `app/[locale]/(marketing)/veo3-1/page.tsx`

**添加内容**: 在现有 `faqJsonLd` 之后添加 `softwareAppJsonLd`

```tsx
const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Veo3.1 AI Video Generator",
  "description": "Professional AI video generation with native audio, 4K upscaling, vertical formats, and frame-perfect control powered by Google DeepMind.",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Web Browser",
  "url": `${siteUrl}/veo3-1`,
  "image": `${siteUrl}/Veo_OG.jpg`,
  "author": {
    "@type": "Organization",
    "name": "RSW Studio"
  }
};
```

**在页面中渲染**:
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
/>
```

**注意事项**:
- 不添加 `aggregateRating` 字段（无真实评分数据）
- 不添加 `offers/price` 字段（已确认决策）
- 未来如有真实用户评分，可补充 `aggregateRating`

---

## 低优先级修改

### 任务 9: OpenGraph siteName 评估

**文件位置**: `app/[locale]/(marketing)/veo3-1/page.tsx`

**当前内容**:
```typescript
openGraph: {
  ...
  siteName: "Remove Sora Watermark",
},
```

**评估选项**:

| 选项 | 内容 | 优缺点 |
|------|------|--------|
| A (保持) | `"Remove Sora Watermark"` | 品牌一致性，但与 Veo3.1 关联弱 |
| B (修改) | `"RSW Studio"` | 简短，涵盖多产品线 |
| C (修改) | `"RSW AI Video Studio"` | 明确产品定位 |

**建议**: 暂保持现状，待品牌策略统一后再调整。

---

## 可选优化

### 任务 10: Meta Description 微调 (可选)

**当前状态**: 147 字符，略低于 150-160 字符参考范围，但已包含核心价值点。

**当前内容**:
```
Generate cinematic AI videos with Veo3.1. Native audio, 4K upscaling, vertical formats, and precise frame control. Professional quality in seconds.
```

**评估**:
- 147 字符已足够好，Google 实际显示长度会根据搜索上下文动态调整
- 不建议为凑字数添加无意义内容
- **建议保持现状**，除非有更好的文案表达

---

## 验证清单

完成所有修改后，执行以下验证步骤:

### 1. 本地预览
```bash
pnpm dev
# 访问 http://localhost:3000/veo3-1
```

### 2. 检查项

**基础检查**:
- [ ] Meta Title 在浏览器标签页正确显示
- [ ] 查看页面源代码，确认 `<meta name="description">` 内容正确
- [ ] 无 JavaScript 控制台错误

**H1/H2 检查**:
- [ ] H1 显示 "Veo3.1 AI Video Generator - Create Cinematic Videos"
- [ ] FAQ H2 显示 "Veo3.1 AI Video Generator - Frequently Asked Questions"
- [ ] FAQ subtitle 正确显示

**FAQ 检查**:
- [ ] 8 条 FAQ 全部正确显示
- [ ] 新增的 3 条长尾 FAQ 内容正确

**社交分享检查**:
- [ ] 查看源代码确认 `og:image` 和 `twitter:image` 存在
- [ ] 图片 URL 可访问: `{siteUrl}/Veo_OG.jpg`

**结构化数据检查**:
- [ ] 查看源代码确认 FAQPage JSON-LD 包含 8 条 FAQ
- [ ] 查看源代码确认 SoftwareApplication JSON-LD 存在

**内链检查**:
- [ ] 对比表格 "Sora 2" 点击后跳转到 `/sora2-video`

### 3. SEO 验证工具

**Google Rich Results Test**: https://search.google.com/test/rich-results
- 输入页面 URL 检查结构化数据是否被正确识别

**社交分享预览工具**:
- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/

### 4. 字符数验证
```
Meta Title: "Veo3.1 AI Video Generator - 4K Quality with Native Audio" = 55 字符 ✅
Meta Description: 147 字符 ✅ (无需修改)
```

---

## 附录：当前 SEO 状态

### A. Meta 信息现状

| 项目 | 当前值 | 字符数 | 状态 |
|------|--------|--------|------|
| Title | Veo3.1 AI Video Generator - 4K Quality with Native Audio | 55 | ✅ |
| Description | Generate cinematic AI videos with Veo3.1... | 147 | ✅ |
| Keywords | Veo3.1, Veo3.1 video generator, Veo3.1 Fast... | 8个 | ✅ |
| OG Image | 缺失 | - | ❌ 需添加 |
| Twitter Image | 缺失 | - | ❌ 需添加 |

### B. 页面结构现状

```
页面 /veo3-1
├── metadata
│   ├── title ✅
│   ├── description ✅
│   ├── keywords ✅
│   ├── og:image ❌ (需添加)
│   └── twitter:image ❌ (需添加)
│
├── JSON-LD
│   ├── FAQPage ✅ (需扩展到 8 条)
│   └── SoftwareApplication ❌ (需添加)
│
├── Hero Section
│   ├── H1 ⚠️ (需修改为包含完整关键词)
│   └── subtitle ✅
│
├── Features Section ✅
│
├── Comparison Table
│   └── Sora 2 列 ⚠️ (需添加内链)
│
├── FAQ Section
│   ├── sectionTitle ❌ (需添加关键词)
│   ├── sectionSubtitle ❌ (需添加)
│   └── items: 5个 → 8个 (需扩展)
│
└── Footer ✅
```

### C. 关键词布局 (修改后目标)

| 位置 | 关键词拼写 | 状态 |
|------|-----------|------|
| Meta Title | ✅ Veo3.1 AI Video Generator | ✅ |
| H1 | ⬜ → ✅ Veo3.1 AI Video Generator (待修改) | ⚠️ |
| FAQ H2 | ⬜ → ✅ Veo3.1 (待修改) | ⚠️ |
| Features H2 | ⬜ → ✅ Veo3.1 (待统一) | ⚠️ |
| Model Selector H2 | ⬜ → ✅ Veo3.1 (待统一) | ⚠️ |
| Comparison H2 | ⬜ → ✅ Veo3.1 (待统一) | ⚠️ |
| FAQ Questions | ✅ 多个问题包含 Veo3.1 | ✅ |

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2026-01-23 | 1.0 | 初始 SEO 审计和优化方案 |
| 2026-01-23 | 2.0 | 整合评审反馈：新增 OG/Twitter 图片、H1 修改、长尾 FAQ、内链、SoftwareApplication 结构化数据；修正关键词策略；调整 Meta Description 为可选 |
| 2026-01-23 | 3.0 | 技术评审修正：H1 改用纯文本（移除 gradient 标签）；新增"统一 H2 关键词拼写"任务；FAQ 数值改为模糊表述；内链简化为仅对比表格；移除 CTA 区域检查；补充 JSON-LD 同步更新步骤 |
| 2026-01-23 | 3.1 | 补充实施细节：任务 7 添加 Link 组件引入和 CSS 样式说明；任务 6 添加 FAQ 数据双源同步注意事项及未来优化建议；任务 1 添加 OG 图片路径大小写敏感警告 |

---

## 相关资源

- **OG 图片**: `/public/Veo_OG.jpg`
- **关联页面**: `/sora2-video`, `/pricing`
- **参考文档**: [页面文案与 SEO 优化指南](./content-seo-optimization-guide.md)

---

**文档维护者**: Claude Code
