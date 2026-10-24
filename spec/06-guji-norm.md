# guji-norm v0.2 规范：规范层（`NNN.norm.json`）

> 状态：正式（v0.2，2026-10-06；形状随 CV 导出器 F4，见 overview#419；2026-10-09 补到字段级，overview#497）
> Schema：[`schemas/guji_norm_v0.2.schema.json`](../schemas/guji_norm_v0.2.schema.json)
> 适用：book-text `original` 每章一份，真源，存 main。总表见 [00](./00-总览.md)。

## 一、定位

- 记录**异体字 → 通行字**的映射，按格位 key 挂在 [char](./02-guji-char.md) 上。只记和原样不同的格，稀疏存放；没有异体的章也有一份空表（`items: []`）。
- 只收「异体」这一类。校勘改字不进本层（校勘改字直接改 char）。
- char 里的字保持刻本原样；生成「通行繁体」读本时用本层替换（由前端做，见 [03 §五](./03-guji-markdown.md)）。rich.md 现在不套本层。
- 还没定下的异体（不确定该不该并到通行字）记在 [decision](./08-guji-decision.md)，`kind: variant`；定下来才进本层。

## 二、文件结构

```jsonc
{
  "schema": "guji-norm/0.2",
  "book_id": "96mid1ogzk",
  "volume": 3,
  "table": null,
  "items": [
    {"a": "3:4:12", "c": "𢰅", "t": "撰", "by": "table", "why": "异体"}
  ]
}
```

## 三、字段

### 3.1 顶层

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `schema` | string | 是 | 格式版本 | 固定 `"guji-norm/0.2"`（注意：本格式用 `schema`，不是 `$schema`，见 §五） | |
| `book_id` | string | 是 | 所属条目 id | 与同章 char 一致 | |
| `volume` | integer ≥1 | 是 | 册号 | 与同章 char 一致 | `3` |
| `table` | string 或 null | 否 | 所用异体对照表的名称或版本 | 没有对照表写 `null` | `null` |
| `items` | array | 是 | 映射条目 | 见 3.2；可以为空 | |

### 3.2 条目（`items[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `a` | string | 是 | 格位 key | 必须在同章 char 里存在 | `"3:4:12"` |
| `c` | string | 是 | 原字（**校验字**） | 必须等于 char 该格的 `c` | `"𢰅"` |
| `t` | string | 是 | 通行字 | 不等于 `c` | `"撰"` |
| `by` | string | 否 | 来源 | `table` 对照表／`human` 人工／`cv` cv 导出 | `"table"` |
| `why` | string | 否 | 类别 | 只许 `异体` | `"异体"` |

条目不许有别的字段（schema `additionalProperties: false`）。

## 四、版本

norm **不跟踪内容版本**（与 cord 一样）：改 norm 不升任何线，char 没变所以文本线也不动。index.json 章条目只用 `norm_file` 声明有这个文件。

## 五、已知待统一

- 格式标识用 `"schema": "guji-norm/0.2"`，而 char、cord、punct、entity、decision 用 `"$schema": <URL>`。下一版（v0.3）统一为 `"$schema": "https://open-guji.org/schema/norm/v0.3.json"`；这次不改。

## 六、校验

- 每条 `a` 在 char 里存在，`c` 等于 char 该格的字；文本改了以后，对不上的条目要修。
- 同一个 `a` 只出现一次。
- 图片格（char 格上有 `fig`，见 [02 §4.7](./02-guji-char.md)）不许出现在本层：图没有通行字（F-OV-13）。
