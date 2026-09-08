# @open-guji/markdown-pdf

古籍 Markdown 的 **PDF 生成器**。

> **状态：预览。** 可打印 HTML 的生成已经稳定；Chromium 后端能出 PDF，
> 但竖排的断行、双行夹注的精确排布仍在调。

规范见仓库 [`spec/`](../../spec)，本包实现规范 **0.1.0**。

## 分层

```
源文 ──[@open-guji/markdown-web]──> HTML 片段
                                      │
                     gujiToPrintHtml   │  + @page 规则 + 竖排样式 + 可选 Paged.js
                                      ▼
                              可打印 HTML  ──[Chromium]──> PDF
```

第一层是**纯函数**，没有外部依赖，浏览器里也能跑，输出可以交给任何排版引擎；
第二层才需要 playwright。

## 安装

```bash
npm i @open-guji/markdown-pdf

# 要真的出 PDF
npm i -D playwright && npx playwright install chromium

# 想要更好的分页控制（页眉页脚、跨页避断），可选
npm i pagedjs
```

## 用法

```js
import { gujiToPdf, gujiToPrintHtml } from '@open-guji/markdown-pdf'

// 只要可打印 HTML
const html = gujiToPrintHtml(source, { pageSize: 'A5', vertical: true })

// 出 PDF
const bytes = await gujiToPdf(source, { title: '明太祖實錄', banks: true })
```

### 命令行

```bash
guji-pdf 實錄.gmd                  # → 實錄.pdf
guji-pdf 實錄.gmd --html           # → 實錄.html，不调用排版后端
guji-pdf 實錄.gmd --size A4 --banks --title 明太祖實錄
guji-pdf --check                   # 检查排版后端是否可用
```

## 选项

```ts
interface PdfOptions {
  pageSize?: 'A4' | 'A5' | 'B5' | 'Letter' | string  // 默认 'A5'
  pageMargin?: string                                 // CSS margin，默认 '20mm 18mm'
  fontSize?: string                                   // 默认 '11pt'
  lineHeight?: number                                 // 默认 1.85
  vertical?: boolean                                  // 竖排，默认 true
  banks?: boolean                                     // 版框与界行，默认 false
  paged?: 'auto' | 'always' | 'never'                 // 是否内联 Paged.js，默认 'auto'
  title?: string
  extraCss?: string
  executablePath?: string                             // 自带的 Chromium 路径
  browserArgs?: string[]
  timeout?: number                                    // 默认 30000
}
```

外加 [web 包的全部选项](../web/README.md#选项)。

## 为什么用浏览器排版

竖排（`writing-mode: vertical-rl`）、专名线画在字的左侧
（`text-underline-position: left`）、抬头的逻辑方向外移——
这些正好都是 CSS 书写模式已经解决的问题，而 web 包已经把语义标好了。
让 PDF 复用同一份 HTML 与 CSS，意味着**网页和印本天然一致**，
不必维护两套排版规则。

评估过的其他后端：

| 方案 | 结论 |
| --- | --- |
| **Chromium + Paged.js**（当前） | 竖排与逻辑属性支持最好；分页控制靠 Paged.js 补齐 |
| Typst | 排版质量高、无需浏览器，但竖排 CJK 支持尚不完整 |
| XeLaTeX + xeCJK | 竖排成熟，但要另写一套从 mdast 到 TeX 的映射，且与网页样式两套维护 |
| 纯 pdfkit / PDF 库 | 需要自己实现断行与避头尾，工作量最大 |

如果将来 Typst 的竖排 CJK 成熟，会作为第二后端加入——
`gujiToPrintHtml` 之前的那一段是共用的。

## 已知限制

* 竖排下**双行夹注**用 CSS 多列近似，注文很长时会溢出列高。
* 没装 `pagedjs` 时由 Chromium 自行分页，页码与跨页避断的控制较弱。
* 版框与界行（`banks`）是用渐变画的，行距变化时需要同步调 `--guji-print-line-height`。

## 路线图

- [ ] 双行夹注的精确断行（在 Paged.js 的 chunker 阶段做）
- [ ] 书口、鱼尾、版心页码
- [ ] Typst 后端
- [ ] 字体子集化，减小产物体积

## 许可证

Apache-2.0
