# @open-guji/markdown-web

古籍 Markdown 的**网页解析器**：源文 → HTML，附横排与竖排两套样式。

建在 [`@open-guji/markdown-core`](../core) + unified（remark / rehype）之上。
规范见仓库 [`spec/`](../../spec)，本包实现规范 **0.1.0**。

## 安装

```bash
npm i @open-guji/markdown-web
```

## 用法

```js
import { gujiToHtml } from '@open-guji/markdown-web'
import '@open-guji/markdown-web/styles/guji.css'

const html = gujiToHtml('《論語》曰<孔子所述>：學而時習之。')
// <p><span class="guji-sm">…</span>曰<span class="guji-jz">孔子所述</span>：學而時習之。</p>
```

返回的是**片段**，请放进一个带 `guji-doc` 类的容器：

```html
<article class="guji-doc">…</article>
```

竖排再加 `guji-vertical`，并引入第二张样式表：

```js
import '@open-guji/markdown-web/styles/guji.css'
import '@open-guji/markdown-web/styles/guji-vertical.css'
```

```html
<article class="guji-doc guji-vertical">…</article>
```

### 直接出一整页

```js
import { gujiToDocument } from '@open-guji/markdown-web'

gujiToDocument(source, { title: '論語', vertical: true })
// 样式已内联，写进文件就能用浏览器打开
```

## API

| 导出 | 说明 |
| --- | --- |
| `gujiToHtml(source, options?)` | 源文 → HTML 片段 |
| `gujiToHast(source, options?)` | 源文 → hast，便于自行接后续处理 |
| `gujiToDocument(source, options?)` | 源文 → 完整 HTML 页面 |
| `renderDocument(fragment, options?)` | 已有片段 → 完整 HTML 页面 |
| `createGujiProcessor(options?)` | 返回配好的 unified processor，可再 `.use()` |
| `gujiHandlers(options)` | remark-rehype 的 handlers，用于自定义管线 |
| `gujiCss` / `gujiVerticalCss` | 样式表的字符串形式 |

## 选项

```ts
interface GujiHtmlOptions extends GujiOptions {
  classPrefix?: string                     // 默认 'guji-'
  bookTitleMarks?: 'keep' | 'drop'         // 是否输出《》，默认 'keep'
  unknown?: 'keep' | 'children' | 'error'  // 未注册指令怎么办，默认 'keep'
  spaceChar?: string                       // 空格实际写入的字符，默认 U+3000
  allowDangerousHtml?: boolean             // 放行原始 HTML，默认 false
}
```

`GujiOptions` 的部分见 [core 的说明](../core/README.md#选项)。

## 输出约定

| 指令 | HTML |
| --- | --- |
| `jz` 夹注 | `<span class="guji-jz">` |
| `bz` 补字 | `<ins class="guji-bz">`（绿） |
| `sz` 删字 | `<del class="guji-sz">`（红加删除线） |
| `gz` 改字 | `<ins class="guji-gz">`（灰） |
| `tt` 抬头 | `<span class="guji-tt" data-guji-n="1">`（容器形态为 `<div>`） |
| `kg` 空格 | `<span class="guji-kg" data-guji-n="1">　</span>` |
| `zm` 专名号 | `<span class="guji-zm">` |
| `sm` 书名号 | `<span class="guji-sm">`，`《》` 包在 `<span class="guji-sm-mark">` 里 |
| `qw` 阙文 | `<span class="guji-qw">`，`□` 与说明分别包在 `.guji-qw-box`／`.guji-qw-label` 里 |
| `qz` 缺字猜测 | `<span class="guji-qz" data-guji-guess="…">`，`□` 与猜测字分别包在 `.guji-qz-box`／`.guji-qz-guess` 里 |
| `zi` 组字 | `<span class="guji-zi">`，内容原样（IDS 或方位描述） |
| `table` 表格 | `<table class="guji-table">`，行渲染为 `<tr>`，表头行的格是 `<th>`，其余 `<td>` |

补字、改字用 `<ins>`，删字用 `<del>`，是因为它们在语义上正是 HTML 的插入与删除，
屏幕阅读器与纯文本提取工具都能正确理解；补字与改字靠 class 区分，
因为「改」是一次操作而非「添 + 删」，见
[`spec/syntax.md` §5 校勘三式](../../spec/syntax.md#5-校勘三式)。
空格里放的是真的表意空格（U+3000）而不是靠 CSS 撑宽度，复制粘贴不会丢。

完整约定见 [`spec/ast.md`](../../spec/ast.md)。

## 安全

源文中的原始 HTML **默认被丢弃**（`allowDangerousHtml: false`）。
若要放行，输出就不再可信，请自行接 `rehype-sanitize`。

## 样式定制

样式全部走自定义属性，覆盖 `.guji-doc` 上的变量即可：

```css
.guji-doc {
  --guji-font: "Source Han Serif SC", serif;
  --guji-line-height: 2.1;
  --guji-max-raise: 3;      /* 为抬头预留的最大格数 */
  --guji-jz-size: 0.72em;
  --guji-bz-color: #1d7a4c;   /* 补字：绿 */
  --guji-sz-color: #b3261e;   /* 删字：红 */
  --guji-gz-color: #6f6f6f;   /* 改字：灰 */
}
```

三个可选体例类：

* `.guji-doc--jz-parens` —— 夹注加圆括号
* `.guji-doc--jiaokan-marks` —— 补字、改字加〔〕，删字加（），
  即点校本体例。只靠颜色区分对色觉障碍读者不友好，需要无障碍时打开这一条。
* `.guji-doc--proofing` —— 校对模式：阙文／缺字猜测默认显示的 `□`
  换成显示说明/猜测字，见 [`spec/ast.md` §2.6](../../spec/ast.md#26-校对模式)。

## 已知限制

* **双行夹注**在横排下只能做到"小字"，竖排下用 `column-count: 2` 近似，
  注文很长时会溢出。需要精确断行请用 [pdf 包](../pdf) 的排版后端。
* **分行 `|` 与双行夹注的自动分栏是两套机制**，两者同时使用时
  （竖排 `.guji-doc--jz-double` + 分行标记）不保证正好在 `|` 处分栏，
  见 [core 的说明](../core/README.md#已知限制)。
* 位置信息的列号不精确，见 [core 的说明](../core/README.md#已知限制)。

## 许可证

Apache-2.0
