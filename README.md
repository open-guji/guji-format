# guji-markdown 古籍 Markdown

> 一套面向中国古籍整理、点校与排印的 Markdown 扩展：**规范 + 多平台解析器**。

古籍文本里有大量普通 Markdown 表达不了的东西——夹注（小注）、校勘的补字、删字与改字、
抬头与空格（平抬 / 挪抬）、专名号、书名号。`guji-markdown` 用一组
**极短、贴近古籍整理惯例的行内记号**把它们写进纯文本，再统一转换为
[Markdown Directive](https://talk.commonmark.org/t/generic-directives-plugins-syntax/444)
中间表示，最后由各平台渲染器输出 HTML / PDF / 其他格式。

```
                  ┌──────────────────┐
  古籍 Markdown → │  规范化 normalize │ → Directive Markdown → mdast → HTML  (packages/web)
     (.gmd)       └──────────────────┘        :jz[…] :zm[…]      │
                                                                 └──→ PDF   (packages/pdf)
```

---

## 一分钟看懂

源文（`.gmd`）：

```markdown
^惟我
.太祖高皇帝，起自布衣。/朱元璋/克/金陵/，遂有天下。

《明太祖實錄》卷一<太祖，諱元璋，字國瑞>載其事[甚詳]{{未詳}}，((今))從之。
```

规范化后的中间表示（Directive Markdown）：

```markdown
:tt{n=1}惟我
:kg{n=1}太祖高皇帝，起自布衣。:zm[朱元璋]克:zm[金陵]，遂有天下。

:sm[明太祖實錄]卷一:jz[太祖，諱元璋，字國瑞]載其事:gz[甚詳]:sz[未詳]，:bz[今]從之。
```

渲染结果（节选）：

```html
<p><span class="guji-tt" data-guji-n="1">惟我</span>
<span class="guji-kg" data-guji-n="1">　</span>太祖高皇帝，起自布衣。<span class="guji-zm">朱元璋</span>克<span class="guji-zm">金陵</span>，遂有天下。</p>
```

## 扩展一览

| 记号 | 名称 | 指令 | HTML |
| --- | --- | --- | --- |
| `<小注>` | 夹注（小注） | `:jz[…]` | `<span class="guji-jz">` |
| `((甲))` | 补字：单纯添甲 | `:bz[…]` | `<ins class="guji-bz">`（绿） |
| `{{甲}}` | 删字：单纯删甲 | `:sz[…]` | `<del class="guji-sz">`（红加删除线） |
| `[甲]{{乙}}` | 改字：以甲改乙 | `:gz[…]:sz[…]` | `<ins class="guji-gz">`（灰） |
| 行首 `^` | 抬头（平抬），可叠加 `^^` | `:tt{n=1}` | `<span class="guji-tt">` |
| 行首 `.` | 空格（挪抬），可叠加 `..` | `:kg{n=1}` | `<span class="guji-kg">` |
| `/人名/` | 专名号 | `:zm[…]` | `<span class="guji-zm">` |
| `《書名》` | 书名号 | `:sm[…]` | `<span class="guji-sm">` |

完整语法、边界条件与转义规则见 **[`spec/`](./spec/)**。

### 校勘为什么要三种记号

「改」不是「添」加「删」。`((甲)){{乙}}` 表达的是两次独立操作，
而 `[甲]{{乙}}` 是一次操作的两面——甲是定本读法，乙是底本读法。
三种记号各有各的颜色（绿 / 红删除线 / 灰），读者不看上下文也能分辨；
机器则可以机械地还原出两个本子：

* **定本** ＝ 保留补字与改字，丢弃删字
* **底本** ＝ 保留删字，丢弃补字与改字

详见 [`spec/syntax.md` §5 校勘三式](./spec/syntax.md#5-校勘三式)。

## 仓库结构

```
guji-markdown/
├─ spec/                 格式定义（与实现语言无关，所有解析器的唯一真相源）
│  ├─ syntax.md          语法规范
│  ├─ directives.md      指令中间表示（Directive IR）
│  ├─ ast.md             mdast 节点与 HTML 输出约定
│  ├─ conformance.md     一致性测试说明
│  └─ fixtures/cases.json 跨平台共享测试语料
├─ packages/             JavaScript / TypeScript 实现（发布到 npm）
│  ├─ core/              @open-guji/markdown-core  规范化 + remark 插件（平台无关）
│  ├─ web/               @open-guji/markdown-web   网页解析器：HTML + CSS
│  └─ pdf/               @open-guji/markdown-pdf   PDF 生成器
├─ examples/             示例文本与 demo
└─ .github/workflows/    CI
```

* `spec/` 是**规范**，不是某个实现的文档。将来若增加其他平台的解析器
  （Swift / Kotlin / Rust / Python …），请新建同级目录（如 `swift/`、`python/`），
  并让它通过 `spec/fixtures/cases.json` 的一致性测试。
* `packages/*` 各自独立 `package.json`，可以单独打包发布；
  `web` 与 `pdf` 都只依赖 `core`，互不依赖。

## 快速开始

```bash
pnpm install
pnpm build
pnpm test
```

网页渲染：

```bash
pnpm add @open-guji/markdown-web
```

```js
import { gujiToHtml } from '@open-guji/markdown-web'
import '@open-guji/markdown-web/styles/guji.css'

gujiToHtml('《論語》曰<孔子所述>：學而時習之。')
// → <p><span class="guji-sm">…</span>…</p>
```

只要中间表示：

```js
import { gujiToDirective } from '@open-guji/markdown-core'

gujiToDirective('^惟我\n.皇上')
// → ':tt{n=1}惟我\n:kg{n=1}皇上'
```

各包的详细 API 见对应目录下的 README：
[core](./packages/core/README.md) · [web](./packages/web/README.md) · [pdf](./packages/pdf/README.md)。

## 设计原则

1. **源文可读**：不加工具也能通读，记号取自古籍整理的习惯符号。
2. **CommonMark 兼容**：扩展只在普通 Markdown 未定义语义的地方生效；
   代码块、代码片段、链接目标、HTML 标签内部一律不做转换。
3. **单一中间表示**：所有扩展先规范化为 Directive，之后的渲染器只认 Directive，
   新增平台不必重写词法分析。
4. **规范化不改变行号**：规范化逐行进行，行数与行序不变，
   便于把渲染期的错误位置映射回源文。
5. **表现与语义分离**：AST 只记录"这是专名号 / 这是夹注"，
   竖排、双行小注、抬头高度等全部交给样式层。

## 路线图

- [x] 规范 v0.1：八种扩展 + 转义规则 + 一致性语料
- [x] `@open-guji/markdown-core`：规范化器 + remark 插件
- [x] `@open-guji/markdown-web`：HTML 渲染 + 横排 / 竖排样式
- [ ] `@open-guji/markdown-pdf`：Paged.js + Chromium 后端（骨架已就绪）
- [ ] 反向规范化（Directive → 古籍短记号）与格式化器
- [ ] micromark 词法扩展：精确到列的位置信息
- [ ] 更多扩展：阙文 `□`、原书页码、校勘记、批校眉批

## 许可证

Apache-2.0，见 [LICENSE](./LICENSE)。
