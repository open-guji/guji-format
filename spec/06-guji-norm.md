# guji-norm v0.2 规范：规范层（`NNN.norm.json`）

> 状态：正式（v0.2，2026-10-06；形状随 CV 导出器 F4，见 overview#419）
> Schema：[`schemas/guji_norm_v0.2.schema.json`](../schemas/guji_norm_v0.2.schema.json)
> 适用：book-text `original` 每章一份，真源，存 main。

## 一、定位

- 记录**异体字 → 通行字**的映射，按格位 key 挂在 [char](./02-guji-char.md) 上。只记和原样不同的格，稀疏存放。
- 只收「异体」这一类。校勘改字不进本层。
- char 里的字保持刻本原样；生成「通行繁体」读本时，用本层替换。

## 二、文件结构

```jsonc
{
  "schema": "guji-norm/0.2",
  "book_id": "96mid1ogzk",
  "volume": 3,                 // 册号 = index.json 该章的 n
  "table": null,               // 可选：所用异体对照表的名称或版本；没有就是 null
  "items": [
    {"a": "3:4:12", "c": "𢰅", "t": "撰", "by": "table", "why": "异体"}
  ]
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `a` | 是 | 格位 key，必须在同章 char 里存在 |
| `c` | 是 | 原字，必须等于 char 该格的 `c`（校验字） |
| `t` | 是 | 通行字 |
| `by` | 否 | 来源：`table`（对照表）／`human`（人工）／`cv` 等 |
| `why` | 否 | 只许 `异体` |

## 三、校验

- 每条的 `a` 在 char 里存在，且 `c` 等于 char 该格的字。文本改了以后，对不上的条目要修。
- 同一个 `a` 只出现一次。
