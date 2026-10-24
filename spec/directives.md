# 指令中间表示（Directive IR）

古籍 Markdown 的所有扩展，规范化后都表示为
[generic directives](https://talk.commonmark.org/t/generic-directives-plugins-syntax/444)。
渲染器**只消费指令**，不认识短记号——这样新增一个平台的渲染器时，
不必重写词法分析。

## 三种指令形态

| 形态 | 写法 | 内容 | 古籍用途 |
| --- | --- | --- | --- |
| 行内 text | `:name[label]{attrs}` | 行内内容 | 夹注、补删、专名、书名 |
| 行内标记 | `:name{attrs}` | 无 | 抬头、空格 |
| 块级 leaf | `::name[label]{attrs}` | 单行 | 插图块（`tu`，v0.3 起） |
| 容器 container | `:::name{attrs}` … `:::` | 块级内容 | 多行抬头 |

`label` 内容会被**递归解析**为行内 Markdown，因此指令可以嵌套。

## 注册表

规范名（canonical name）取两字拼音首字母，与古籍整理术语对应；
同时接受英文别名，解析后一律归一到规范名。

| 规范名 | 中文 | 别名 | 形态 | 属性 | 短记号 |
| --- | --- | --- | --- | --- | --- |
| `jz` | 夹注（小注） | `note` | text | `type` | `<…>` |
| `bz` | 补字 | `add`、`ins` | text | `src` | `((…))` |
| `sz` | 删字 | `del` | text | `src` | `{{…}}` |
| `gz` | 改字 | `sub`、`amend` | text | `src` | `[…]` |
| `tt` | 抬头 | `raise` | text（标记）/ container | `n` | 行首 `^` |
| `kg` | 空格 | `space` | text（标记） | `n` | 行首 `.` |
| `zm` | 专名号 | `name` | text | `type` | `/…/` |
| `sm` | 书名号 | `book` | text | `part` | `《…》` |
| `qw` | 阙文 | `missing` | text | 无 | `[[…]]` |
| `qz` | 缺字猜测 | `guess` | marker | `guess` | 无独立短记号，见 [syntax.md §14](./syntax.md#14-缺字猜测guess) |
| `zi` | 组字 | `compose` | text | 无 | 无短记号，直接写 `:zi[…]` |
| `table` | 表格 | 无 | container | 无 | `:::table` … `:::`，见 [syntax.md §15](./syntax.md#15-表格容器-table) |
| `tu` | 图 | `figure`、`tupian` | text / leaf | `id` | 无短记号，见 [syntax.md §17](./syntax.md#17-图-tu) |
| `th`\* | 表格表头格 | 无 | text | `colspan`、`rowspan` | 内部表示，见下 |
| `td`\* | 表格数据格 | 无 | text | `colspan`、`rowspan` | 内部表示，见下 |

\* `th`／`td` 由 `gujiToDirective` 规范化 `:::table` 的行列小语法时产生，
不是给人直接书写的短记号——文档里列出是为了让 `unknown` 选项与调试工具
认得这两个名字，直接手写 `:th[…]`/`:td[…]` 也能被解析，但不建议这样做。

### 属性

| 属性 | 出现于 | 取值 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `n` | `tt`、`kg` | 正整数字符串，1–9 | `1` | 抬头级数 / 空格数 |
| `type` | `zm` | `人` `地` `国` `族` `朝` `官` `其他` | 无 | 专名种类 |
| `type` | `jz` | `双行` `单行` `尾注` | `双行` | 夹注排印方式 |
| `src` | `bz`、`sz`、`gz` | 自由文本 | 无 | 校勘依据，如 `据宋本` |
| `part` | `sm` | 自由文本 | 无 | 篇名，如 `藝文志` |
| `guess` | `qz` | 自由文本，不含空白与花括号 | 无 | OCR／整理者对缺字的猜测 |
| `colspan`、`rowspan` | `th`、`td` | 正整数字符串 | `1` | 跨列／跨行格数，`:::table` 规范化产生 |
| `id` | `tu` | `[a-z0-9][a-z0-9-]*` | 无 | 图的 id，到同章 fig.json 里查文件（[09](./09-guji-fig.md)） |

指令属性值在指令语法中一律是**字符串**；`n` 需由渲染器转成整数，
非法或缺省时按 `1` 处理，超过上限时钳制到上限。

## 未知指令

源文中出现注册表以外的指令名时，渲染器按 `unknown` 选项处理：

| 取值 | 行为 |
| --- | --- |
| `keep`（默认） | 保留为 `<span class="guji-unknown" data-guji-directive="名字">`，内容照常渲染 |
| `children` | 丢弃包装，只渲染内容 |
| `error` | 抛出错误 |

这样第三方可以在同一篇文档里混用自己的指令，而古籍渲染器不至于把内容吃掉。

## 规范化（normalize）的保证

`normalize: 源文 → Directive Markdown` 必须满足：

1. **行数不变**　输出行数与行序同输入完全一致。渲染期的错误行号可直接映射回源文。
   （列号会因插入 `:jz[` 等而偏移，本版本不提供列映射。）
2. **幂等**　`normalize(normalize(x)) == normalize(x)`。
   已经是指令形式的文本再次规范化不会变化。
3. **不生效区逐字保留**　§0.1 所列区域按字节原样输出。
4. **失败即字面**　任何不满足生效条件的记号原样输出，不产生错误。

## 转义责任

规范化在生成 `:name[label]` 时，必须保证 label 内的方括号是**配对**的；
不配对的 `[` 或 `]` 要用反斜杠转义，否则指令会被提前截断。

```
源文：  <注[未閉合>
输出：  :jz[注\[未閉合]
```

（这里的 `[` 没能配成改字——本行内找不到合法的 `]`，见
[syntax.md §4](./syntax.md#4-改字-)——于是落到转义这一步。）

配对的方括号（例如 label 内含链接）不转义：

```
源文：  <見[說文](s.html)>
输出：  :jz[見[說文](s.html)]
```

## 与 remark-directive 的关系

JavaScript 实现直接复用 `micromark-extension-directive` 与 `mdast-util-directive`，
因此 IR 与生态里现成的 directive 工具链完全兼容：
`remark-directive` 能解析我们的输出，我们也能解析别人写的指令。
