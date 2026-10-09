# guji-decision v0.1 规范：候选字层（`NNN.decision.json`）

> 状态：**草案定稿，部分待用户拍板**（2026-10-09，overview#497；由 overview `项目进展/古籍文本/整体设计/2026-10-decision.json规范草案.md`（文本总管 10-06 应网站 #444 起草）写成）。标「待定（待用户拍板）」的三处未拍板前，本篇可按此开发样例，不批量入库。
> 格式标识：`https://open-guji.org/schema/decision/v0.1.json`
> Schema：[`schemas/guji_decision_v0.1.schema.json`](../schemas/guji_decision_v0.1.schema.json)
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
      "a": "3:4:12",
      "c": "撰",
      "kind": "uncertain",
      "status": "open",
      "cands": [
        {"t": "𢰅", "src": "cv", "conf": 0.41, "why": "字形匹配次优"},
        {"t": "譔", "src": "gemini", "note": "对读他本作譔"}
      ]
    },
    {
      "a": "5:2:7",
      "c": "内",
      "kind": "variant",
      "status": "resolved",
      "cands": [{"t": "內", "src": "table"}],
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
| `a` | string | 是 | 格位 key | 必须在同章 char 里存在；同一 `a` 只一条 | `"3:4:12"` |
| `c` | string | 是 | **校验字**：char 该格**当前**的字 | 等于 char 该格的 `c`；文本改了以后对不上的条目要修 | `"撰"` |
| `kind` | string | 是 | 疑什么（见 §四） | `uncertain` 存疑／`variant` 异体 | `"uncertain"` |
| `status` | string | 是 | 到哪一步（见 §四） | `open` 待裁／`resolved` 已裁／`rejected` 驳回 | `"open"` |
| `cands` | array | 是，非空 | 其他候选，按可信度从高到低，≤5 个 | 见 3.3；驳回也留着原候选 | |
| `by` | string | `resolved`、`rejected` 时写 | 谁裁的 | `human`／`rule` | `"human"` |
| `note` | string | 否 | 一句话依据 | | |

### 3.3 候选（`cands[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `t` | string | 是 | 候选字 | 不等于条目的 `c` |
| `src` | string | 是 | 来源 | `cv`、`ocr`、模型名（`gemini`、`glm`…）、`human`、`table` |
| `conf` | number 0–1 | 否 | 来源自报的置信度，只用于排序 | |
| `why`、`note` | string | 否 | 依据，一句话 | |

## 四、两个维度：`kind` 与 `status`（待定（待用户拍板）：是否采用两维标法）

| `kind` | 中文 | 含义 |
|---|---|---|
| `uncertain` | 存疑 | 不确定这格是什么字（识别不准、漫漶、形近） |
| `variant` | 异体 | 字是对的，不确定该不该并到通行字；候选是可能的通行字。定下来后进 norm |

| `status` | 中文 | 含义 |
|---|---|---|
| `open` | 待裁 | 还没人定 |
| `resolved` | 已裁 | 人已定；定下的字已在 char，`c` 就是结果，**`c` 不得出现在 `cands` 里** |
| `rejected` | 驳回 | 候选都不成立，维持原字 |

网站建议：`open` 的 `uncertain` 最醒目；`resolved`、`rejected` 默认不标（或灰标）。

## 五、草案里未拍板的三点（照实保留）

1. **待定（待用户拍板）**：§四 的两维标法（`kind`＋`status`）是否采用。
2. **待定（待用户拍板）**：候选**先只展示、不入检索**。检索只用 char（定下的字），否则一个字多个写法会让命中数和高亮对不上；以后要「搜候选」由网站加开关，不改本格式。
3. **待定（待用户拍板）**：用户同意后，文本侧在 vol03 造一个小样例给网站开发。

（草案里的第 3 点「进 guji-format」由本篇完成。）

## 六、版本与流程

- **不跟踪版本号**。index.json 章条目用 `decision_file` 声明有这个文件，缺则无候选。裁定改了 char，才算文本线 patch。
- **谁写**：候选由 CV 导出器、外部模型（Gemini、GLM 等）的候选文件产出；**入库与改 `status` 只由 Claude 道或本地整理会话做**（外部模型只出候选文件）。
- **体量**：稀疏，预期每册几百到几千条。

## 七、校验（F-OV-05，待落地进 `validate_text_format.py`）

- 过 schema；`volume`、`book_id` 与同章 char 一致。
- `a` 在 char 里存在；`c` 等于 char 该格的字；同一 `a` 只一条。
- `cands` 非空；`resolved` 的条目 `c` 不在 `cands[].t` 里；`resolved`、`rejected` 带 `by`。

（草案原把这条编为 F-OV-04；F-OV-04 已用于 `*_file` 声明，改为 F-OV-05。）
