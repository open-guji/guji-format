# guji-decision v0.1 规范：候选字层（`NNN.decision.json`）

> 状态：**正式**（v0.1，2026-10-09 定稿；**v0.2 2026-10-17 增可选 `reason`／`route`／`route_ref`**，GUJI-558 Eliot 提出，见 §3.4；overview#497；由 overview `项目进展/古籍文本/整体设计/2026-10-decision.json规范草案.md`（文本总管 10-06 应网站 #444 起草）写成；§五 三点用户 10-09 已定）。
> 格式标识：`https://open-guji.org/schema/decision/v0.2.json`（v0.1 `…/decision/v0.1.json` 的文件原样仍合法，不必迁移）
> Schema：[`schemas/guji_decision_v0.2.schema.json`](../schemas/guji_decision_v0.2.schema.json)（v0.1：[`guji_decision_v0.1.schema.json`](../schemas/guji_decision_v0.1.schema.json)）
> 适用：book-text `original` 每章一份，存 main。总表见 [00](./00-总览.md)。现在还没有任何 decision 数据。

---

## 一、定位

- char 只记定下来的那一个字；**拿不准的格，其他候选字放在这里**，按格位 key 挂在 char 上。稀疏：只有存在候选的格才有条目。
- 用途是展示：网站在对读正文里标出这些格，点开看候选与依据。
- **不改文本**。裁定后要改字，改的是 char（文本线 patch）；本文件把该条 `status` 改为 `resolved`。
- 已定的异体映射在 [norm](./06-guji-norm.md)；还没定该不该并到通行字的异体，在本文件记 `kind: variant`。

## 二、文件结构

```json
{
  "$schema": "https://open-guji.org/schema/decision/v0.1.json",
  "book_id": "96mid1ogzk",
  "volume": 3,
  "items": [
    {
      "cell": "3:4:12",
      "current": "撰",
      "kind": "uncertain",
      "status": "open",
      "cands": [
        {"text": "𢰅", "src": "cv", "conf": 0.41, "why": "字形匹配次优"},
        {"text": "譔", "src": "gemini", "note": "对读他本作譔"}
      ]
    },
    {
      "cell": "5:2:7",
      "current": "内",
      "kind": "variant",
      "status": "resolved",
      "cands": [{"text": "內", "src": "table"}],
      "by": "human",
      "note": "本书统一作「内」，不并"
    }
  ]
}
```

## 三、字段

### 3.1 顶层

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `$schema` | string | 是 | 格式版本 | `https://open-guji.org/schema/decision/v0.1.json`（草案原写 `"schema": "guji-decision/0.1"`，改为与 char、punct、entity 一致） |
| `book_id` | string | 是 | 所属条目 id | 与同章 char 一致 |
| `volume` | integer ≥1 | 是 | 册号 | 与同章 char 一致 |
| `items` | array | 是 | 条目 | 见 3.2 |

### 3.2 条目（`items[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `cell` | string | 是 | 格位 key | 必须在同章 char 里存在；同一 `cell` 只一条 | `"3:4:12"` |
| `current` | string | 是 | **校验字**：char 该格**当前**的字 | 等于 char 该格的 `c`；文本改了以后对不上的条目要修 | `"撰"` |
| `kind` | string | 是 | 疑什么（见 §四） | `uncertain` 存疑／`variant` 异体 | `"uncertain"` |
| `status` | string | 是 | 到哪一步（见 §四） | `open` 待裁／`resolved` 已裁／`rejected` 驳回 | `"open"` |
| `cands` | array | 是，非空 | 其他候选，按可信度从高到低，≤5 个 | 见 3.3；驳回也留着原候选 | |
| `by` | string | `resolved`、`rejected` 时写 | 谁裁的 | `human`／`rule` | `"human"` |
| `note` | string | 否 | 一句话依据 | | |
| `reason` | string | 否（v0.2） | 为什么拿不准，见 §3.4 | `unclear`（缺省）／`seg_bad`／`seg_recut`／`seg_missing_page` | `"seg_bad"` |
| `route` | string | `reason` 为 `seg_*` 时必填（v0.2） | 处置去向，见 §3.4 | `recut`／`list`／`add_page` | `"recut"` |
| `route_ref` | string | 否（v0.2） | `route` 的指向：清单名或 GUJI-xxx；须与 `route` 同在 | | `"GUJI-558"` |

### 3.3 候选（`cands[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `text` | string | 是 | 候选字 | 不等于条目的 `current` |
| `src` | string | 是 | 来源 | `cv`、`ocr`、模型名（`gemini`、`glm`…）、`human`、`table` |
| `conf` | number 0–1 | 否 | 来源自报的置信度，只用于排序 | |
| `why`、`note` | string | 否 | 依据，一句话 | |

### 3.4 v0.2 新增：`reason`／`route`／`route_ref`

三项全是**可选**、条目层（不在 `cands[]` 里），由 H 道写（与改 `status` 同权）。0.1 的文件没有这三项，照旧合法；读者对缺省的 `reason` 一律当 `unclear`。

| `reason` | 含义 | `route` |
|---|---|---|
| `unclear`（缺省） | 字本身认不清、漫漶、形近 | 不得出现 |
| `seg_bad` | 切分切坏了（框压邻格、切断字） | 必填 |
| `seg_recut` | 需整块重切 | 必填 |
| `seg_missing_page` | 缺页 | 必填 |

| `route` | 去向 |
|---|---|
| `recut` | 回 CV 重切 |
| `list` | 进某张清单（名字写 `route_ref`） |
| `add_page` | 补页（任务号或清单写 `route_ref`） |

- **对账规则**：`status: open` 且 `reason` 以 `seg_` 开头 ⇒ 必须有 `route`（否则无人接手）；`reason` 缺省或 `unclear` 时不得带 `route`；`route_ref` 只能在 `route` 存在时出现。schema 已用条件子句拦这三条。
- **转态时 `note` 的前缀**：`reason=seg_bad;route=recut[;route_ref=…] | 自由文字`；前缀只是给人和脚本 grep 的快照，机读以字段为准。
- 不影响任何版本线：decision 不跟踪版本号，`$schema` 写 v0.1 或 v0.2 都合法；用了这三项就应写 v0.2（v0.1 schema 对它们 `additionalProperties: false`）。

## 四、两个维度：`kind` 与 `status`

| `kind` | 中文 | 含义 |
|---|---|---|
| `uncertain` | 存疑 | 不确定这格是什么字（识别不准、漫漶、形近） |
| `variant` | 异体 | 字是对的，不确定该不该并到通行字；候选是可能的通行字。定下来后进 norm |

| `status` | 中文 | 含义 |
|---|---|---|
| `open` | 待裁 | 还没人定 |
| `resolved` | 已裁 | 人已定；定下的字已在 char，`current` 就是结果，**`current` 不得出现在 `cands[].text` 里** |
| `rejected` | 驳回 | 候选都不成立，维持原字 |

网站建议：`open` 的 `uncertain` 最醒目；`resolved`、`rejected` 默认不标（或灰标）。

## 五、已定事项（用户 10-09 定，overview#497）

1. **两维标法**：采用 §四 的 `kind`＋`status`。
2. **候选先只展示、不进检索**。检索只用 char（定下的字），否则一个字多个写法会让命中数和高亮对不上；以后要「搜候选」由网站加开关，不改本格式。
3. **样例**：文本侧在四庫 vol03 造 10–20 条小样例给网站开发。

（草案里的「进 guji-format」由本篇完成。）

## 六、版本与流程

- **不跟踪版本号**。index.json 章条目用 `decision_file` 声明有这个文件，缺则无候选。裁定改了 char，才算文本线 patch。
- **谁写**：候选由 CV 导出器、外部模型（Gemini、GLM 等）的候选文件产出；**入库与改 `status` 只由 Claude 道或本地整理会话做**（外部模型只出候选文件）。
- **体量**：稀疏，预期每册几百到几千条。

## 七、校验（F-OV-05，已落地进 `validate_text_format.py`）

夹具见 [`spec/fixtures/decision/`](./fixtures/decision/)（1 个正例、4 个反例）。

- 过 schema；`volume`、`book_id` 与同章 char 一致。
- `cell` 在 char 里存在；`current` 等于 char 该格的字；同一 `cell` 只一条。
- v0.2：`reason`∈{unclear, seg_bad, seg_recut, seg_missing_page}；`route`∈{recut, list, add_page}；`seg_*` 必带 `route`，`unclear`／缺省不得带 `route`，`route_ref` 须与 `route` 同在（§3.4）；`$schema` 接受 v0.1 与 v0.2 两个标识，v0.1 文件带 `reason`／`route` 类键按未知键报错。
- `cands` 非空；`resolved` 的条目 `current` 不在 `cands[].text` 里；`resolved`、`rejected` 带 `by`。

（草案原把这条编为 F-OV-04；F-OV-04 已用于 `*_file` 声明，改为 F-OV-05。）
