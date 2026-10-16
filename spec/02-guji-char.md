# guji-char v0.1 规范：定字文本（`NNN.char.json`）

> 状态：正式（v0.1，2026-10-06 用户定；2026-10-09 补到字段级，overview#497）
> Schema：[`schemas/guji_char_v0.1.schema.json`](../schemas/guji_char_v0.1.schema.json)
> 适用：book-text `original` 每章一份，存 main，**文本的唯一真源**。总表见 [00](./00-总览.md)。

---

## 一、定位

- **每一格是什么字**：按「页:列:格[子列]」记下每一格最终定下的字，以及分列、夹注、抬头、阙文这些版式信息。
- **文本线版本号跟踪的就是它**（见 [00 §四·3](./00-总览.md)）。标点、实体、规范层、候选层都锚在它的格位上。
- **不带坐标**：像素框在 [cord](./01-guji-cord.md)，按格位 key 对上。
- **不带候选**：OCR、模型给的其他候选字放在 [decision](./08-guji-decision.md)。char 只记定下来的那一个字。
- `lines.md`、`rich.md` 都由 char 生成（见 [03](./03-guji-markdown.md)），不手改。
- 由 open-guji-cv（切分、识别、人裁，工作区在 guji-workspace）导出。

## 二、格位 key

写法 `<页>:<列>:<格>[子列]`，例如 `3:5:12`、`3:4:6a`、`3:4:-1`。正则：`^\d+:\d+:-?[1-9]\d*[ab]?$`。

| 段 | 怎么数 | 例 |
|---|---|---|
| **页** | 本册扫描图顺序号，从 1 起。等于 cord 的 `page`、IIIF canvas 的 `seq`。**不是**版心叶码（叶码记在 `label`） | `3` |
| **列** | 页内第几列，**从右往左**，从 1 起。版心列、空列也占列号 | `5` |
| **格** | 列内第几格，**从版框上沿往下**数，从 1 起。版式留白格（挪抬、低格空出的格）、排除的非字格**也占号**——这些格在 cord 的 `marks` 里，不在 char 里，所以 char 里一列的格号可以不从 1 开始、可以有空缺。抬头超出上框的格记负数：紧挨上框外的一格是 `-1`，再往外是 `-2`。**没有第 0 格**：`-1` 的下一格是 `1` | `12`、`-1` |
| **子列** | 只有双行夹注才有：`a` 是右列（先读），`b` 是左列（后读）。一段夹注的 a、b 两列**都从这段夹注起始的那一格起数**；夹注之后的正文从「起始格＋max(a 的字数, b 的字数)」接着数。正文、单行小注不带后缀 | `9a`…`21a`、`9b`…`21b` |

例：第 4 页第 5 列，正文「遷及其𡚁也黨」占 3–8 格，之后一段双行夹注，右列「如論語集註…」是 `4:5:9a`–`4:5:21a`，左列「之說張存中…」是 `4:5:9b`–`4:5:21b`。

格号的口径是 cv 的几何格号（overview#419 定）：由 cv 切分时按版框量出，char 照抄，不由字数推算。

格位 key 只在一章（一册）之内唯一。

## 三、文件结构

```jsonc
{
  "$schema": "https://open-guji.org/schema/char/v0.1.json",
  "version": "1.0.0",
  "book_id": "96mid1ogzk",
  "volume": 2,
  "pages": [
    {"page": 1, "columns": []},
    {
      "page": 3,
      "label": "一",
      "columns": [
        {"col": 1, "cells": [{"a": "3:1:1", "c": "欽"}, {"a": "3:1:2", "c": "定"}]},
        {"col": 4, "raised": 1, "cells": [
          {"a": "3:4:-1", "c": "讀"}, {"a": "3:4:1", "c": "易"},
          {"a": "3:4:6a", "c": "兩"}, {"a": "3:4:7a", "c": "江"},
          {"a": "3:4:6b", "c": "採"}, {"a": "3:4:7b", "c": "進"},
          {"a": "3:4:8", "c": "□", "lacuna": true},
          {"a": "3:4:9", "c": "春", "guess": true}
        ]},
        {"col": 9, "kind": "blank", "cells": []}
      ]
    }
  ]
}
```

## 四、字段

### 4.1 顶层

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `$schema` | string | 是 | 格式版本 | `https://open-guji.org/schema/char/v0.1.json` | |
| `version` | string | 是 | **文本线内容版本**；index.json 该章的 `text_version` 是它的镜像，必须相等 | `MAJOR.MINOR.PATCH`，major 0–3（0.x＝粗校完、精校未完，并入 main 时 ≥0.1.0，且章条目 `proofing` 必须为 true；见 00 §4.3）；正则 `^[0-3]\.(0\|[1-9]\d*)\.(0\|[1-9]\d*)$` | `"1.0.0"` |
| `review` | object | major ≥2 时必填（schema 强制） | 文本线验收记录 | `date`（日期串）、`signed_by`（签核人）、`sample`（抽检数据：一句话或对象），三项都不许空 | |
| `book_id` | string | 是 | 所属条目 id | 等于条目目录名 | `"96mid1ogzk"` |
| `volume` | integer ≥1 | 是 | 册号 | 等于 index.json 该章 `n`、文件名 `NNN` 的数值 | `2` |
| `pages` | array | 是 | 本册**每一张扫描图**一项，按 `page` 升序；没有字的页也要有（`columns: []`） | 见 4.2 | |

### 4.2 页（`pages[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `page` | integer ≥1 | 是 | 扫描顺序号 | 见 §二 |
| `label` | string | 否 | 版心叶次（刻本上的叶码） | 原样照录，如 `"一"`、`"十二"` |
| `columns` | array | 是 | 本页**有字的列**，以及显式标 `kind: blank` 的列；按读序（`col` 升序） | 见 4.3 |

### 4.3 列（`columns[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `col` | integer ≥1 | 是 | 列号 | 见 §二 |
| `raised` | integer ≥0 | 否，缺省 0 | 抬头格数。lines.md 里该行行首写这么多个 `^` | 现有数据 0–2 |
| `lead_blank` | integer ≥0 | 否，缺省 0 | 行首空格数（挪抬、低格）。lines.md 里该行行首在 `^` 之后写这么多个 `.` | 现有数据 0–4 |
| `kind` | string | 否，缺省 `body` | 列类别 | `body` 正文列／`banxin` 版心列／`blank` 空列（`cells` 为空） |
| `cells` | array | 是 | 本列的格，**数组顺序就是阅读顺序** | 见 4.4 |

`raised`、`lead_blank` 是 lines.md 的排印记号，由 cv 给出；格位以 `a` 为准，不要从这两个数去推首格的格号（两者的对应关系不是机械的）。

### 4.4 格（`cells[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `a` | string | 是 | 格位 key | 见 §二 | `"3:4:6a"` |
| `c` | string | 是 | 定下的字，一个字符（或一个组字的近似字） | Unicode 已收的字。Unicode 没收的字放近似的已收字，另在 `zi` 记原形；阙文写 `□`（U+25A1） | `"欽"` |
| `lane` | string | 否 | 所在分道 | `main` 正文（缺省）／`solo` 单行小注／`jz_r` 双行夹注右列／`jz_l` 双行夹注左列。`jz_r`、`jz_l` 可由 `a` 的 `a`／`b` 后缀推出，写不写都行；**`solo` 推不出，必须写** | `"solo"` |
| `lacuna` | boolean | 否 | `true`＝阙文（这格原有字，看不清或缺失），`c` 写 `□` | 不带这个标记的 `□` 是刻本上本来就刻着的方框 | `true` |
| `guess` | boolean | 否 | `true`＝残字，`c` 是推测的字 | | `true` |
| `zi` | string | 否 | 组字：Unicode 没收的字的原形，写 IDS 串或描述文字；`c` 是近似字 | 如 `"⿰木孚"` | |

格对象不许有别的字段（schema `additionalProperties: false`）。

### 4.5 读序

`cells` 数组顺序就是阅读顺序，各工具按数组顺序取字流，**不按 key 排序**。

- 双行夹注的一段：先排完这一段的 `a`（右列），再排 `b`（左列）。一列里可以有好几段夹注。
- 字下标（punct 的 `char_offset`、entity 的 `span`）就是这条字流的 0 起下标，见 [00 §四·2](./00-总览.md)。

## 五、与其他文件的关系

| 文件 | 和 char 的关系 |
|---|---|
| cord | 按 `a` 对上每格的像素框；cord 不存字 |
| punct | 锚点是 char 的格位 key，校验字 `pre_char` 取 char 该格的 `c` |
| entity | 锚点 `anchor.start`..`anchor.end` 是 char 的格位 key，校验字 `text` 是这段格的 `c` 依读序拼起来 |
| norm、decision | 按格位记（norm 用 `a`，decision 用 `cell`）；校验字（norm 的 `c`、decision 的 `current`）等于 char 该格的 `c` |
| lines.md、rich.md | 由 char（加 punct、entity）生成，放 derived 分支 |

## 六、校验

- 过 schema；格位 key 在全章不重复。
- `version` 与 index.json 该章 `text_version` 相等（F-OV-01）；major ≥2 带 `review`（F-OV-03）。
- `volume`、`book_id` 与同章 cord、punct、entity、norm 一致。
- char → lines.md 必须能逐字节还原（`convert_original_char.py` 入库时核）。
