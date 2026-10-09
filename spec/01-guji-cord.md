# guji-cord v0.1 规范：字框坐标（`NNN.cord.json`）

> 状态：正式（v0.1，2026-10-06 用户定；2026-10-09 补到字段级，overview#497）
> Schema：[`schemas/guji_cord_v0.1.schema.json`](../schemas/guji_cord_v0.1.schema.json)
> 适用：book-text `original` 每章一份，存 main，网站图文对读用。总表见 [00](./00-总览.md)。

---

## 一、定位

- **只记几何，不记字**：每一格在书影上的像素框，按格位 key（见 [02 §二](./02-guji-char.md)）挂到 char 上。要知道这一格是什么字，查 char。格（`cells[]`）里**不得**出现 `c`、`char`、`text` 字段（schema 强制）。
- 坐标用 IIIF Canvas 像素空间：`[x, y, w, h]`，左上原点，单位像素，可以是小数。
- 由 open-guji-cv 切分产出。**不跟踪内容版本**，来源记在每页的 `producers`。
- cv 内部的富信息（OCR 多候选、置信度、定字途径、人审状态）是 cv 的工作格式，**不进 book-text**；拿不准的字的候选进 [decision](./08-guji-decision.md)。

## 二、文件结构

```jsonc
{
  "$schema": "https://open-guji.org/schema/cord/v0.1.json",
  "book_id": "96mid1ogzk",
  "volume": 2,
  "pages": [
    {
      "page": 3,
      "image": {"width": 2345, "height": 3122, "sha256": "5e901f…"},
      "canvas": {"id": "https://data.kaiyuanguji.com/iiif/96mid1ogzk/canvas/02/0003", "seq": "0003", "width": 2345, "height": 3122},
      "producers": {"cv": {"tool": "open-guji-cv", "rev": "4a9c397602", "pipeline": "keben_body_v2",
                           "steps": {"border_detect": "3e33b13", "seed_admit": "4a9c397602"},
                           "products_sha": {"border_detect": "14f1c5…"},
                           "snapshot": "guji-workspace snap/96mid1ogzk/vol03"}},
      "regions": [{"id": "r1", "kind": "body", "box": [343, 335, 1692, 2482], "rules": [[[2059, 327], [2011, 2804]]]}],
      "columns": [{"col": 1, "kind": "body", "box": [1815, 335, 220, 2482]}],
      "cells":   [{"a": "3:1:1", "box": [1862, 332, 163, 128], "id": "g2c2vyyhsr3"}],
      "marks":   [{"kind": "blank", "id": "mybdqf2vsyn", "col": 1, "slot": 14, "box": [1816, 1999, 197, 98]},
                  {"kind": "excluded", "id": "modw2um5ue5", "col": 1, "slot": 9, "box": [1827, 1379, 194, 159], "note": "排除名单·非字（墨污/切坏）"}]
    }
  ]
}
```

## 三、字段

### 3.1 顶层

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `$schema` | string | 是 | 格式版本 | `https://open-guji.org/schema/cord/v0.1.json` | |
| `book_id` | string | 是 | 所属条目 id（book-index 的 Book 或 Work id） | 等于条目目录名 | `"96mid1ogzk"` |
| `volume` | integer ≥1 | 是 | 册号 | 等于 index.json 该章的 `n`，等于文件名 `NNN` 的数值 | `2` |
| `pages` | array | 是 | 每页一项，按 `page` 升序 | 见 3.2 | |

### 3.2 页（`pages[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `page` | integer ≥1 | 是 | 本册扫描图顺序号 | 从 1 起；等于 char 格位 key 的「页」、IIIF canvas 的 `seq` 数值 | `3` |
| `image` | object | 否 | 本页所用图片 | `width`、`height`（像素）、`sha256`（图片文件的 SHA-256，十六进制） | 见上 |
| `canvas` | object | 是 | IIIF canvas | `id`（必填，`https://data.kaiyuanguji.com/iiif/<book_id>/canvas/<册号两位>/<page 四位>`）、`seq`（四位页号字符串）、`width`、`height` | 见上 |
| `producers` | object | 否 | 本页由谁产出 | 键为产出方；现只有 `cv`：`tool`（固定 `open-guji-cv`）、`rev`（cv 提交号）、`pipeline`（流水线名）、`steps`（各步骤的提交号）、`products_sha`（各步骤产物的 SHA-256）、`snapshot`（guji-workspace 快照名） | 见上 |
| `regions` | array | 否 | 版面区域 | 见 3.3；封面、扉页没测出版框时可以没有 | |
| `columns` | array | 否 | 每列的框 | 见 3.4 | |
| `cells` | array | 是 | 每格的框 | 见 3.5；可以为空数组 | |
| `marks` | array | 否 | 非字元素 | 见 3.6 | |

### 3.3 区域（`regions[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `id` | string | 否 | 页内区域编号 | `r1`、`r2`… |
| `kind` | string | 是 | 区域类别 | `body` 正文版框／`banxin` 版心／`margin` 天头地脚。现有数据只有 `body` |
| `box` | box | 是 | 区域外框 | `[x, y, w, h]`；测不出版框的区域不收（不写 `null`） |
| `rules` | array | 否 | 界行（竖线），每条是一条折线 `[[x1, y1], [x2, y2], …]` | 从右往左排 |

### 3.4 列（`columns[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `col` | integer ≥1 | 是 | 列号 | 与 char 的列号一致：页内从右往左，从 1 起；版心列、空列也占号 |
| `kind` | string | 否 | 列类别 | `body`（正文列）／`banxin`／`blank`。现有数据全是 `body` |
| `box` | box | 是 | 列框 | |

cord 收**全部**列框，包括没有字的列；char 只收有字的列和显式标 `kind: blank` 的列。

### 3.5 格（`cells[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `a` | string | 是 | 格位 key | 必须在同章 char 里存在；正则 `^\d+:\d+:-?[1-9]\d*[ab]?$` | `"3:4:6a"` |
| `box` | box | 是 | 该格的像素框 | | `[1862, 332, 163, 128]` |
| `id` | string | 否 | 稳定框 id，重切后同一框不变 | cv 生成的 base36 短串，11 位左右 | `"g2c2vyyhsr3"` |

不得有 `c`／`char`／`text`。

### 3.6 非字元素（`marks[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `kind` | string | 是 | 类别 | `blank` 版式留白格（挪抬、低格留出的空格）／`seal` 印章／`excluded` 切出来但不是字（墨污、切坏） |
| `box` | box | 是 | 像素框 | |
| `id` | string | 否 | 稳定框 id | 同 3.5 |
| `col` | integer | 否 | 所在列 | `blank`、`excluded` 有 |
| `slot` | integer | 否 | 列内几何格序 | 与格位 key 的「格」同一数法 |
| `occludes` | array of string | 否 | 印章压住的格位 key | 只 `seal` 用 |
| `note` | string | 否 | 说明 | `excluded` 现写「排除名单·非字（墨污/切坏）」 |

## 四、校验

- cord 每个 `cells[].a` 都在同章 char 里有；char 里的格可以暂时没有框（还没切到）。
- 页号、列号与 char 一致；`volume`、`book_id` 与 char 一致。
- 同一页内 `a` 不重复；`id` 在全章不重复。
- 改动 cord 不升任何版本线；cord 格位变了，说明 char 的格位也变了，按 [00 §三](./00-总览.md) 走 char 那一行。
