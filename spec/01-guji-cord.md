# guji-cord v0.1 规范：字框坐标（`NNN.cord.json`）

> 状态：正式（v0.1，2026-10-06 用户定，取代原 guji-page 在 book-text 里的存储形态）
> Schema：[`schemas/guji_cord_v0.1.schema.json`](../schemas/guji_cord_v0.1.schema.json)
> 适用：book-text `original` 每章一份，网站图文对读用。

---

## 一、定位

- **只记几何，不记字**：每一格在书影上的像素框，按格位 key（见 [02](./02-guji-char.md) §二）挂到 char 上。要知道这一格是什么字，查 char。
- 坐标用 IIIF Canvas 像素空间，左上原点 `[x, y, w, h]`。
- 由 open-guji-cv 切分产出。不跟踪内容版本，`producers` 记来源提交。
- cv 内部的富信息页面（OCR 多候选、置信度、定字途径、人审状态）是 cv 的工作格式，**不进 book-text**；其中拿不准的字的候选，以后进 `decision.json`（待设计）。

## 二、文件结构

```jsonc
{
  "$schema": "https://open-guji.org/schema/cord/v0.1.json",
  "book_id": "96mid1ogzk",
  "volume": 2,                          // 册号 = index.json 该章的 n
  "pages": [
    {
      "page": 3,                        // 扫描顺序号 = char 格位 key 的「页」
      "image": {"width": 2345, "height": 3122, "sha256": "5e901f…"},
      "canvas": {
        "id": "https://data.kaiyuanguji.com/iiif/96mid1ogzk/canvas/02/0003",
        "seq": "0003", "width": 2345, "height": 3122
      },
      "producers": {"cv": {"tool": "open-guji-cv", "rev": "4a9c397602", "pipeline": "keben_body_v2"}},
      "regions": [
        {"id": "r1", "kind": "body", "box": [343, 335, 1692, 2482], "rules": [[[2059, 327], [2011, 2804]]]}
      ],
      "columns": [
        {"col": 1, "kind": "body", "box": [1815, 335, 220, 2482]}
      ],
      "cells": [
        {"a": "3:1:1", "box": [1862, 332, 163, 128]},
        {"a": "3:1:2", "box": [1858, 451, 163, 131]}
      ],
      "marks": [
        {"kind": "blank", "col": 1, "slot": 14, "box": [1816, 1999, 197, 98]},
        {"kind": "seal", "box": [1750, 200, 220, 220], "occludes": ["3:1:3"]}
      ]
    }
  ]
}
```

### 字段

| 位置 | 字段 | 说明 |
|---|---|---|
| 页 | `page` | 扫描顺序号，从 1 起 |
| 页 | `canvas` | IIIF canvas：`…/canvas/<册号两位>/<page 四位>` |
| 页 | `regions[]` | 版面区域：`body`（正文版框）／`banxin`（版心）／`margin`（天头地脚）；`rules` 是界行折线 |
| 页 | `columns[]` | 每列的框，`col` 与 char 的列号一致 |
| 页 | `cells[]` | `a` 格位 key（必须在 char 里存在），`box` 像素框；可选 `id` 稳定框 id |
| 页 | `marks[]` | 非字元素：`blank`（版式留白格）／`seal`（印章，`occludes` 列被压住的格位）／`excluded`（切坏非字） |

## 三、校验

- cord 的每个 `cells[].a` 都必须在同章 char 里有；char 里的格可以暂时没有框（比如还没切到）。
- 页号、列号与 char 一致。
