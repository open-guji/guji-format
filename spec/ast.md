# 抽象语法树与输出约定

## 1. mdast

规范化后的文本用 CommonMark + directive 解析，得到标准
[mdast](https://github.com/syntax-tree/mdast) 树，古籍扩展体现为
`textDirective` / `containerDirective` 节点：

```js
// 子曰<孔子也>
{
  type: 'paragraph',
  children: [
    { type: 'text', value: '子曰' },
    {
      type: 'textDirective',
      name: 'jz',
      attributes: {},
      children: [{ type: 'text', value: '孔子也' }]
    }
  ]
}
```

### 1.1 行作用域归并（line scope）

`tt` 从短记号规范化而来时是一个**空标记**，其语义作用域是"到本行结束"。
渲染前需要一次 mdast 变换，把标记之后、直到下一个 `break` 或父节点结束的
兄弟节点**移入**该指令的 `children`：

```
变换前：[text('臣某言\n'), textDirective(tt){}, text('陛下嗣位')]
变换后：[text('臣某言\n'), textDirective(tt){ children: [text('陛下嗣位')] }]
```

变换后 `tt` 与其他行内指令形态一致，渲染器只需处理一种情况。
`kg` 是自足标记，不参与归并。

生成 IR（`gujiToDirective`）时**不做**这一变换——IR 要能原样往返。

### 1.2 属性归一

* 指令名解析时按 [directives.md](./directives.md) 的别名表归一到规范名。
* `n` 解析为整数：非数字或 `< 1` 取 `1`，`> 9` 取 `9`。

## 2. HTML 输出

### 2.1 元素与类名

类名前缀默认 `guji-`，可通过 `classPrefix` 配置。

| 指令 | 元素 | 类名 | 附加属性 |
| --- | --- | --- | --- |
| `jz` | `<span>` | `guji-jz` | `data-guji-type`（有 `type` 时） |
| `bz` | `<ins>` | `guji-bz` | `data-guji-src`（有 `src` 时） |
| `sz` | `<del>` | `guji-sz` | `data-guji-src`（有 `src` 时） |
| `gz` | `<ins>` | `guji-gz` | `data-guji-src`（有 `src` 时） |
| `tt`（行内） | `<span>` | `guji-tt` | `data-guji-n` |
| `tt`（容器） | `<div>` | `guji-tt guji-tt-block` | `data-guji-n` |
| `kg` | `<span>` | `guji-kg` | `data-guji-n` |
| `zm` | `<span>` | `guji-zm` | `data-guji-type`（有 `type` 时） |
| `sm` | `<span>` | `guji-sm` | `data-guji-part`（有 `part` 时） |
| `qw` | `<span>` | `guji-qw` | 内含 `.guji-qw-box`（固定文本 `□`）与 `.guji-qw-label`（阙文说明，默认隐藏） |
| `qz` | `<span>` | `guji-qz` | `data-guji-guess`；内含 `.guji-qz-box`（`□`）与 `.guji-qz-guess`（猜测字，默认隐藏） |
| `zi` | `<span>` | `guji-zi` | 无，内容原样（IDS 或方位描述） |
| `tu`（行内，图片格） | `<span>` | `guji-tu` | `data-guji-id`；内含 `<img class="guji-tu-img" alt="说明">`，查不到图时是 `.guji-tu-fallback`（`〔图：说明〕`） |
| `tu`（leaf，插图块） | `<figure>` | `guji-tu guji-tu-block` | 同上 |
| `table` | `<table>` | `guji-table` | 无 |
| 表格行（合成，非指令） | `<tr>` | 无 | 由 `groupTableRows` 变换产生，见 [transform.ts](../packages/core/src/transform.ts) |
| `th`／`td` | `<th>`／`<td>` | 无 | `colspan`／`rowspan`（对应属性 > 1 时） |
| 未知 | `<span>` | `guji-unknown` | `data-guji-directive` |

补字、改字用 `<ins>`，删字用 `<del>`，是因为它们在语义上正是 HTML 的
"插入 / 删除"，屏幕阅读器与纯文本提取工具都能正确理解。
补字与改字同为 `<ins>`、靠 class 区分：两者都是定本有而底本无的文字，
差别在于改字替换掉了紧随其后的删字，见
[syntax.md §5](./syntax.md#5-校勘三式)。

三者的默认配色（可用自定义属性覆盖）：

| 指令 | 颜色 | 装饰 |
| --- | --- | --- |
| `bz` 补字 | 绿 | 无 |
| `sz` 删字 | 红 | 删除线 |
| `gz` 改字 | 灰 | 无 |

`<ins>` 在浏览器里默认带下划线，样式表必须显式清掉，
否则补字与改字会和专名号的线混淆。

### 2.2 空格的文本内容

`kg` 元素内**放入 `n` 个 U+3000 表意空格**，而不是靠 CSS 撑宽度：

```html
<span class="guji-kg" data-guji-n="2">　　</span>
```

这样复制粘贴、纯文本提取、无样式降级都能保留空格。样式表只需 `white-space: pre`。

### 2.3 抬头的排版

`tt` 元素为块级行盒（`display: block`），抬起的格数由 `data-guji-n` 驱动
CSS 自定义属性 `--guji-n`：

* **横排**：整行向行首方向外移 `n` 个字宽（`margin-inline-start: calc(var(--guji-n) * -1em)`），
  容器需预留同等 `padding-inline-start`。
* **竖排**（`writing-mode: vertical-rl`）：逻辑方向一致，同一条规则即可生效。

容器形态（`:::tt`）内的源文换行必须保留，因为抬头是逐行的
（见 [syntax.md §4](./syntax.md#4-抬头行首-)）。HTML 渲染器用
`white-space: pre-line` 实现，不必改动 AST。

> **竖排的容器尺寸**　`writing-mode: vertical-rl` 的行内轴是竖直的，
> 一列有多长取决于容器的**高度**。宿主页面必须给容器一个确定的高度，
> 否则一列会无限长、整篇挤成一条。这是排版环境的约定，不属于本规范。

### 2.4 书名号

见 [syntax.md §7](./syntax.md#7-书名号-)。`bookTitleMarks: 'keep'` 时
`《》` 作为 `<span class="guji-sm-mark">` 输出，便于竖排样式隐藏。

### 2.5 原始 HTML

古籍文本默认**不允许**原始 HTML：源文中的 HTML 块与行内 HTML 在
mdast → hast 阶段被丢弃（`allowDangerousHtml: false`）。
需要时可显式开启，但此时输出不再可信，须自行消毒。

### 2.6 校对模式

`qw`（阙文说明）与 `qz`（缺字猜测）默认只显示 `□`，真正的说明/猜测字
藏在 `.guji-qw-label`／`.guji-qz-guess` 里（`display: none`）。
容器加上修饰类 `guji-doc--proofing` 后反过来：`□` 隐藏，说明/猜测字显示——
供校对场景切换查看，不需要重新渲染。

```html
<article class="guji-doc guji-doc--proofing">…</article>
```

## 3. 纯文本输出

供检索与全文比对使用，约定：

| 指令 | 纯文本 |
| --- | --- |
| `jz` | `（` + 内容 + `）`，内容里的分行 `\|` 去掉（连排，不出现在纯文本里） |
| `bz` | 内容（保留） |
| `sz` | 空（丢弃） |
| `gz` | 内容（保留） |
| `tt` | 换行 + 内容 |
| `kg` | `n` 个 U+3000 |
| `zm` | 内容 |
| `sm` | `《` + 内容 + `》` |
| `qw` | `□`（不管 label 有没有内容，检索时统一算一个缺字符号） |
| `qz` | `□`（猜测字不进入纯文本，只在校对模式的显示里出现） |
| `zi` | 内容原样（IDS 或方位描述），检索时当作这个字的占位文本 |
| `tu` | `□`（图片格、插图块都算一个占位符，检索跳过，同阙文） |
| `table`／`th`／`td` | 逐格内容以空格连接，行之间换行；不体现 `colspan`/`rowspan` |

保留 `bz`、`gz` 而丢弃 `sz`，得到的正是"整理者认定的**定本**"；
反过来保留 `sz`、丢弃 `bz` 与 `gz`，则还原为**底本**。
这两条互逆的规则是校勘三式（[syntax.md §5](./syntax.md#5-校勘三式)）的直接推论，
实现应当保证它们成立。
