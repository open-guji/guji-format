# guji-format 规范目录

> 开源古籍数字化平台的数据格式：从书影到文本、标点、专名、版本布局。
> 原则：**信息只增不减、层次逐级派生、正文与标注解耦**。
> 只读本目录，就能写出 book-text 里任何一个文件，并知道它从哪来、改了要重生什么。**先读 [00 总览](./00-总览.md)。**

## 一、book-text 文件体系

| 篇 | 文件 | 格式版本 | Schema |
|---|---|---|---|
| [00 总览](./00-总览.md) | 全部文件一张表、派生关系、依赖表、坐标与版本线 | — | — |
| [01 guji-cord](./01-guji-cord.md) | `NNN.cord.json` 每格像素框 | 0.1 | [`guji_cord_v0.1`](../schemas/guji_cord_v0.1.schema.json) |
| [02 guji-char](./02-guji-char.md) | `NNN.char.json` 每格的字（文本唯一真源）；格位 key 定义 | 0.1 | [`guji_char_v0.1`](../schemas/guji_char_v0.1.schema.json) |
| [03 guji-markdown](./03-guji-markdown.md) | 章文件 `NNN.md` 记法；`lines.md`、`rich.md` 生成规则 | 0.2 | — |
| [04 guji-punct](./04-guji-punct.md) | `NNN.punct.json` 标点、分段、书名号、标题符 | 0.2 | [`guji_punct_v0.2`](../schemas/guji_punct_v0.2.schema.json) |
| [05 guji-entity](./05-guji-entity.md) | `NNN.entity.json` 专名与专名号 | 0.2 | [`guji_entity_v0.2`](../schemas/guji_entity_v0.2.schema.json) |
| [06 guji-norm](./06-guji-norm.md) | `NNN.norm.json` 异体→通行字 | 0.2 | [`guji_norm_v0.2`](../schemas/guji_norm_v0.2.schema.json) |
| [07 book-text 条目布局](./07-book-text-条目布局.md) | 条目目录、`manifest.json`、`index.json`、章文件、辑佚、汇总索引 | 1 | [`book_text_manifest_v1`](../schemas/book_text_manifest_v1.schema.json)、[`book_text_index_v1`](../schemas/book_text_index_v1.schema.json) |
| [08 guji-decision](./08-guji-decision.md) | `NNN.decision.json` 候选字（部分待用户拍板） | 0.2 | [`guji_decision_v0.2`](../schemas/guji_decision_v0.2.schema.json) |

`original`（本项目从书影做出来的文本）每章一组：char、cord、punct、entity、norm、decision 是真源，存 main；lines、rich 由脚本生成，存生成分支 `derived`。转录本（维基、Kanripo、识典）和整理本用 `NNN.md`（＋整理本的 `NNN.json`）。

## 二、古籍 Markdown 记法

| 篇 | 管什么 |
|---|---|
| [syntax](./syntax.md) | 扩展记号逐条语法：夹注、校勘三式、抬头、空格、专名号、书名号、阙文、表格、组字 |
| [directives](./directives.md) | 中间表示（Directive Markdown） |
| [ast](./ast.md) | mdast 与 HTML 输出约定 |
| [conformance](./conformance.md) | 一致性测试语料与跑法 |

## 三、旧说法对照

原来的 Level 1／2／3 说法不再用：原 guji-page（Level 1）在 book-text 里拆成 cord（几何）和 decision（候选）；原 guji-cell（Level 2）改名 char 并去掉候选；Level 3a 就是 lines；Level 3b（reflow）不再单独生成，由 rich 取代。

## 四、版本与兼容

- 每种 JSON 文件的**格式版本**写在 `$schema`（URL），与 `schemas/` 下的文件一一对应；文件里的 `version` 是**内容版本**（只 original 三线用），两者不要混。
- 改格式时：新增或删除枚举值、新增字段、改字段含义，都要升格式版本（新 URL、新 schema 文件），旧 schema 文件留档不删。只补说明、不改约束的，不升版本；把现有数据都已写了的字段改成必填（如 punct 的 `volume`），也可以不升，在 PR 里写明。
- **已有数据的格式不改键名**（用户 10-09 定）：char、cord、norm 等已经有数据的格式，`a`、`c`、`t` 这类短键名保持不变；要省空间就走压缩（存储、传输时压缩），不改键名。新格式在第一次定为正式之前可以取更清楚的名字（如 08 decision 的 `cell`、`current`、`text`）。
- 每篇规范开头写明状态和日期；升版本时在该篇末尾写「上一版 → 本版的变化」（如 [05 §十](./05-guji-entity.md)）。
