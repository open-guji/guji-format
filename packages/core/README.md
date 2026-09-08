# @open-guji/markdown-core

古籍 Markdown 扩展的**平台无关内核**：把源文里的短记号规范化为
[Directive](https://talk.commonmark.org/t/generic-directives-plugins-syntax/444)
中间表示，并提供解析成 mdast 的 remark 插件。

渲染器（[web](../web)、[pdf](../pdf)）都建在它之上；写新平台的渲染器时，
只要能消费指令，就不必重写词法分析。

规范见仓库 [`spec/`](../../spec)，本包实现规范 **0.1.0**。

## 安装

```bash
npm i @open-guji/markdown-core
```

## 用法

### 只要中间表示

```js
import { gujiToDirective } from '@open-guji/markdown-core'

gujiToDirective('^惟我\n.皇上<聖躬>，本作[甲]{{乙}}')
// ':tt{n=1}惟我\n:kg{n=1}皇上:jz[聖躬]，本作:gz[甲]:sz[乙]'
```

纯字符串到字符串，无副作用，**逐行处理且不改变行数**——
渲染期报出的行号可以直接映射回源文。

### 解析成 mdast

```js
import { parseGuji } from '@open-guji/markdown-core'

parseGuji('子曰<孔子也>。')
// root > paragraph > [ text('子曰'), textDirective{ name:'jz', children:[text('孔子也')] }, text('。') ]
```

### 作为 remark 插件

```js
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGuji from '@open-guji/markdown-core'
import remarkRehype from 'remark-rehype'

unified().use(remarkParse).use(remarkGuji).use(remarkRehype)
```

插件会自己注册 directive 的 micromark / mdast 扩展，**不需要再 use `remark-directive`**。
它必须排在 `remark-parse` 之后（要包裹 parser 才能在解析前完成规范化）。

## API

| 导出 | 说明 |
| --- | --- |
| `remarkGuji`（默认导出） | remark 插件 |
| `gujiToDirective(source, options?)` | 源文 → Directive Markdown |
| `transformInline(text, options?)` | 只做行内记号转换（单行） |
| `parseGuji(source, options?)` | 源文 → mdast |
| `gujiProcessor(options?)` | 返回配好的 unified processor |
| `formatDirective(tree, options?)` | mdast → Directive Markdown |
| `applyLineScope(tree)` | 抬头的行作用域归并 |
| `normalizeDirectiveNames(tree)` | 指令别名归一 |
| `DIRECTIVES` / `lookupDirective` / `resolveDirectiveName` / `parseLevel` | 指令注册表 |
| `buildMask` / `escapeDirectiveLabel` | 规范化用到的底层工具，写别的实现时可参考 |

## 选项

```ts
interface GujiOptions {
  // 各记号开关，默认全开
  jz?: boolean; bz?: boolean; sz?: boolean; gz?: boolean
  tt?: boolean; kg?: boolean; zm?: boolean; sm?: boolean

  maxSpanLength?: number   // 行内记号内容上限，默认 64
  maxLevel?: number        // n 属性上限，默认 9
  gzRequireCjk?: boolean   // 改字内容须含 CJK，默认 true
  zmRequireCjk?: boolean   // 专名号内容须含 CJK，默认 true
  indentedCode?: boolean   // 识别缩进代码块，默认 true

  shorthand?: boolean      // 解析前先规范化短记号，默认 true
  lineScope?: boolean      // 抬头的行作用域归并，默认 true
  normalizeNames?: boolean // 指令别名归一，默认 true
}
```

各项的语义与边界条件见 [`spec/syntax.md`](../../spec/syntax.md)。

## 已知限制

* **列号不精确**。规范化会在行内插入 `:jz[` 等文本，因此 mdast 节点的
  `column` 指向的是规范化之后的文本。行号是准的。
  路线图里有一版基于 micromark 词法扩展的实现，会解决这一点。
* **记号不跨行内结构**。像 `/孔**子/**` 这种跨越强调边界的写法属未定义行为。
* **简写式引用链接与改字冲突**。`[說文]`（配合别处的 `[說文]: url` 定义）会被
  识别为改字；行内链接 `[說文](url)` 不受影响。见
  [`spec/syntax.md` §4](../../spec/syntax.md#4-改字-)。

## 许可证

Apache-2.0
