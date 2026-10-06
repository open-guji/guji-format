# guji-char v0.1 规范：定字文本（`NNN.char.json`）

> 状态：正式（v0.1，2026-10-06 用户定，取代原 guji-cell）
> Schema：[`schemas/guji_char_v0.1.schema.json`](../schemas/guji_char_v0.1.schema.json)
> 适用：book-text `original` 每章一份，**文本的唯一真源**。

---

## 一、定位

- **每一格是什么字**：按「页:列:格[子列]」记下每一格最终定下的字，以及分列、夹注、抬头、阙文这些版式信息。
- **文本版本号跟踪的就是它**（文本线，见 book-text `docs/VERSIONING.md`）。标点、实体、规范层都锚在它的格位上。
- **不带坐标**：像素框在 [cord](./01-guji-cord.md)，按格位 key 对上。
- **不带候选**：OCR、模型给的其他候选字，以及拿不准的字怎么裁，放在 `decision.json`（待设计）。char 只记定下来的那一个字。
- `lines.md`、`rich.md` 都由 char 生成（见 [03](./03-guji-markdown.md)），不手改。

## 二、格位 key

`<页>:<列>:<格>[子列]`，例如 `3:5:12`、`3:4:6a`。

- **页**：本册扫描图顺序号，从 1 起，等于 cord 里的 `page`、IIIF canvas 的 `seq`。
- **列**：页内第几列，从右往左，从 1 起。版心列、空列也占列号。
- **格**：列内第几格，从 1 起。抬头超出上框的格记负数（`-1`、`-2`），**没有第 0 格**。
- **子列**：双行夹注才有：`a` 是右列（先读），`b` 是左列（后读），两列各自从夹注起始那一格起数。正文、单行小注不带后缀。

## 三、文件结构

```jsonc
{
  "$schema": "https://open-guji.org/schema/char/v0.1.json",
  "version": "1.0.0",            // 文本线版本，index.json 该章 text_version 是它的镜像
  "book_id": "96mid1ogzk",
  "volume": 2,                   // 册号 = index.json 该章的 n
  "pages": [
    {
      "page": 3,
      "label": "一",             // 可选：版心叶次
      "columns": [
        {
          "col": 1,
          "raised": 0,           // 可选：抬头格数（lines.md 的 ^）
          "lead_blank": 0,       // 可选：挪抬空格数（lines.md 的 .）
          "kind": "body",        // 可选：body（默认）/ banxin / blank
          "cells": [
            {"a": "3:1:1", "c": "欽"},
            {"a": "3:1:2", "c": "定"}
          ]
        },
        {
          "col": 4,
          "cells": [
            {"a": "3:4:5", "c": "本"},
            {"a": "3:4:6a", "c": "兩"},
            {"a": "3:4:7a", "c": "江"},
            {"a": "3:4:6b", "c": "採"},
            {"a": "3:4:7b", "c": "進"},
            {"a": "3:4:8", "c": "□", "lacuna": true},
            {"a": "3:4:9", "c": "春", "guess": true}
          ]
        }
      ]
    }
  ]
}
```

### 格（`cells[]`）字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `a` | 是 | 格位 key |
| `c` | 是 | 定下的字。Unicode 没收的字放近似的已收字，另在 `zi` 记原形 |
| `lane` | 否 | `main`（默认）／`solo`（单行小注）／`jz_r`、`jz_l`（双行夹注，可由 `a`／`b` 后缀推出，写不写均可） |
| `lacuna` | 否 | `true` 表示阙文：`c` 写「□」。不带这个标记的「□」是刻本上本来就刻着的方框 |
| `guess` | 否 | `true` 表示残字，`c` 是推测的字 |
| `zi` | 否 | 组字：IDS 串或描述文字，`c` 是近似字 |

### 读序

`cells` 数组的顺序就是阅读顺序。双行夹注的一段：先排完这一段的 `a`（右列），再排 `b`（左列）。各工具按数组顺序取字流，不再按 key 排序。

## 四、与其他文件的关系

| 文件 | 和 char 的关系 |
|---|---|
| `cord.json` | 按 `a` 对上每格的像素框；cord 里不再存字 |
| `punct.json`、`entity.json` | 锚点是 char 的格位 key，校验字取 char 该格的 `c` |
| `norm.json` | 按格位记异体→通行字 |
| `decision.json` | 不确定字的其他候选（待设计） |
| `lines.md`、`rich.md` | 由 char（加 punct、entity、norm）生成，放生成分支，不进 main |
