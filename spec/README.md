# guji-markdown 规范

**版本：0.1.0（草案）**　　**状态：可实现，语法仍可能微调**

本目录是古籍 Markdown 的**格式定义**，与具体实现语言无关。
`packages/` 下的 JavaScript 实现、以及将来任何平台的实现，都必须以本目录为准，
并通过 [`fixtures/cases.json`](./fixtures/cases.json) 的一致性测试。

## 目录

| 文件 | 内容 |
| --- | --- |
| [syntax.md](./syntax.md) | **语法规范**：七种扩展记号的写法、边界条件、歧义消解与转义 |
| [directives.md](./directives.md) | **指令中间表示**：短记号 → Directive 的映射、指令注册表、属性 |
| [ast.md](./ast.md) | **抽象语法树与输出**：mdast 节点形态、HTML 元素与 class 约定 |
| [conformance.md](./conformance.md) | **一致性测试**：语料格式与实现自测方法 |
| [fixtures/](./fixtures/) | 跨平台共享的测试语料 |

## 基线

古籍 Markdown 是 [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/) 的**超集**。

* 未被本规范定义的一切，按 CommonMark 处理。
* 本规范只在 CommonMark **未赋予语义**的字符组合上添加语义
  （`<非标签>`、`((…))`、`{{…}}`、`《…》`、`/…/`、行首 `^`、行首 `.`）。
* 扩展**不在**下列位置生效：围栏代码块、缩进代码块、代码片段、
  自动链接与原始 HTML 标签内部、行内链接与图片的目标部分、被反斜杠转义处。

推荐扩展名 `.gmd`；`.md` 亦可，但需渲染器显式开启古籍扩展。

## 术语

| 术语 | 说明 |
| --- | --- |
| **源文** | 作者手写的古籍 Markdown 文本 |
| **规范化（normalize）** | 源文 → Directive Markdown 的纯文本变换，逐行进行，不改变行数 |
| **中间表示 / IR** | 规范化后的 Directive Markdown，也是唯一被渲染器消费的形态 |
| **指令（directive）** | `:name[label]{attrs}` 形式的通用扩展节点，见 [directives.md](./directives.md) |
| **行** | 源文中以换行符分隔的一行。抬头、空格、以及所有行内扩展都**不跨行** |

## 版本与兼容

规范采用 `主.次.补丁`：

* **补丁**：措辞澄清，不改变任何已有输入的解析结果。
* **次版本**：新增记号或属性；旧文档解析结果不变。
* **主版本**：可能改变已有输入的解析结果。

实现应在 README 中声明其支持的规范版本。
