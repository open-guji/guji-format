# guji-punct v0.2 规范：外挂标点（`NNN.punct.json`）

> 状态：正式（v0.1 2026-10-09 补到字段级，overview#497；**v0.2 2026-10-19 增标题符 `kind: heading`（分段符仍只锚段末字之后），删去保留值 `range`**，GUJI-240 用户定，见 §4.2）
> 格式标识：`https://open-guji.org/schema/punct/v0.2.json`（v0.1 `…/punct/v0.1.json` 的文件原样仍合法，不必迁移；用了标题符就要写 v0.2）
> Schema：[`schemas/guji_punct_v0.2.schema.json`](../schemas/guji_punct_v0.2.schema.json)（v0.1：[`guji_punct_v0.1.schema.json`](../schemas/guji_punct_v0.1.schema.json)）
> 适用：**只用于 book-text 的 `original`**，每章一份，存 main。总表见 [00](./00-总览.md)。

---

## 一、定位

- **标点与正文解耦**：正文在 char 里保持纯净；本文件只记「在哪一格的前面或后面加什么标点」。改一个字不会污染标点 diff，标点重做也不动正文。
- **管什么**：点号（句读）、成对标号（引号、书名号）、自然段分段符、标题符（v0.2：分卷与各级标题，阅读器据此出目录）。
- **不管什么**：专名号（人名、地名、官名等的下划线）只在 [entity](./05-guji-entity.md) 里记，本层不记。字本身在 char。
- **每章只入库一份**。几个模型的对照稿只在本地测试，不进仓。
- 维基文库、Kanripo、识典等转录导入一次就不再改，标点直接写在它们的 `NNN.md` 正文里，不做外挂标点。

## 二、文件结构

```json
{
  "$schema": "https://open-guji.org/schema/punct/v0.1.json",
  "version": "1.1.0",
  "text_version": "1.0.0",
  "book_id": "96mid1ogzk",
  "volume": 3,
  "metadata": {
    "title": "欽定四庫全書總目·第3册",
    "creator": "glm:glm-4.5-flash",
    "base_edition": "original",
    "description": "基于 original 底本自动生成独立外挂标点与分段。"
  },
  "stats": {"total_annotations": 3688, "points": 3581, "paragraph_breaks": 107},
  "punctuations": [
    {"mark": "\n\n", "kind": "break", "pos": "after",  "anchor": "3:1:10", "char_offset": 9,  "pre_char": "四", "source": "rule:reflow"},
    {"mark": "《",   "kind": "point", "pos": "before", "anchor": "3:4:-1", "char_offset": 16, "pre_char": "讀", "source": "glm:glm-4.5-flash"},
    {"mark": "》",   "kind": "point", "pos": "after",  "anchor": "3:4:3",  "char_offset": 19, "pre_char": "言", "source": "glm:glm-4.5-flash"},
    {"mark": "\n\n", "kind": "break", "pos": "after",  "anchor": "3:4:8b", "char_offset": 28, "pre_char": "本", "source": "rule:reflow"}
  ]
}
```

## 三、字段

### 3.1 顶层

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `$schema` | string | 是 | 格式版本 | `https://open-guji.org/schema/punct/v0.2.json`（或 v0.1） | |
| `version` | string | 是 | **标点线内容版本**（不是格式版本）；index.json 该章 `punct_version` 是它的镜像 | `MAJOR.MINOR.PATCH`，major 0–3；见 §五 | `"1.1.0"` |
| `text_version` | string | 是 | 本层是对着哪一版文本做的＝当时 char 的 `version` | 不得超前于当前 char 的 `version` | `"1.0.0"` |
| `review` | object | major ≥2 时必填（schema 强制） | 验收记录 | `date`、`signed_by`、`sample`，三项都不许空 | |
| `book_id` | string | 是 | 所属条目 id | 与同章 char 一致 | `"96mid1ogzk"` |
| `volume` | integer ≥1 | 是 | 册号 | 与同章 char 一致，等于 index.json 该章 `n` | `2` |
| `metadata` | object | 否 | 说明信息 | 见 3.2 | |
| `stats` | object | 否 | 统计，**只供人看**，不作校验依据 | 键名不限，值是整数；常用 `total_annotations`、`points`、`paragraph_breaks`、`headings`、`periods`、`commas`、`quotations`、`book_titles` | |
| `punctuations` | array | 是 | 标点条目 | 见 3.3；数组顺序不限，消费方按锚点排序 | |

### 3.2 `metadata`

| 字段 | 类型 | 必填 | 含义 | 例 |
|---|---|---|---|---|
| `title` | string | 否 | 本章标题 | `"欽定四庫全書總目·第2册"` |
| `creator` | string | 否 | 主要产出方，写法同条目的 `source` | `"glm:glm-4.5-flash"` |
| `created_at` | string（ISO 8601 date-time） | 否 | 生成时间 | `"2026-10-04T22:00:00Z"` |
| `base_edition` | string | 否 | 底本，固定 `"original"` | `"original"` |
| `description` | string | 否 | 一句话说明 | |

### 3.3 标点条目（`punctuations[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `mark` | string | 是 | 标点符号 | 见 §四 枚举 | `"，"` |
| `kind` | string | 否，缺省 `point` | 类别 | `point` 点号与成对标号／`break` 自然段分段符／`heading` 标题符（v0.2，§4.2）。v0.1 的保留值 `range` 在 v0.2 删去 | `"point"` |
| `pos` | string | 否，缺省 `after`；`heading` 必填 `before` | 加在锚点格的哪一边 | `after` 该字之后／`before` 该字之前（开引号、`《`、标题符）；分段符只能 `after` | `"before"` |
| `label` | string | 否，只用于 `heading` | 目录里显示的名字；缺省用标题原文（v0.2） | 非空 | `"卷二　經部二"` |
| `toc` | boolean | 否，只用于 `heading`，缺省 `true` | `false`＝正文排成标题但不进目录（副题行）（v0.2） | | `false` |
| `anchor` | string | original 入库**必填** | 锚点格位 key | `<页>:<列>:<格>[子列]`，必须在同章 char 里存在（见 [02 §二](./02-guji-char.md)） | `"3:4:-1"` |
| `char_offset` | integer ≥0 | 否 | 锚点格的字下标（缓存） | 见 [00 §四·2](./00-总览.md)：同章 char 读序的 0 起下标 | `16` |
| `pre_char` | string | original 入库**必填**；**标题符不写**（v0.2，§4.2） | **校验字**：锚点那一格上的字（`after`、`before` 都核这一格） | 必须等于 char 该格的 `c` | `"讀"` |
| `confidence` | number 0–1 | 否 | 置信度 | | `0.95` |
| `source` | string | 否 | 产出方 | `<类>:<名>`：`glm:<模型>`、`qwen:<模型>`、`llm:<模型>` 大模型；`claude:manual` Claude 道人工补；`human:<人>` 人工；`rule:<规则名>` 规则（如 `rule:reflow` 分段）。不设枚举 | `"rule:reflow"` |
| `id` | string | 否 | 条目编号 | 文件内唯一；现有数据不写 | `"p001"` |

`anchor` 的对象写法 `{page, line, slot, lane?, volume?}` 只为兼容旧数据保留，original 入库一律写字符串。

## 四、`mark` 取值

| `mark` | `kind` | `pos` | 名称 | 现状 |
|---|---|---|---|---|
| `，` | point | after | 逗号 | 在用 |
| `。` | point | after | 句号 | 在用 |
| `、` | point | after | 顿号 | 在用 |
| `；` | point | after | 分号 | 在用 |
| `：` | point | after | 冒号 | 在用 |
| `？` | point | after | 问号 | 在用 |
| `！` | point | after | 叹号 | 在用 |
| `「` `」` | point | `「` before／`」` after | 引号（第一层） | 在用 |
| `『` `』` | point | `『` before／`』` after | 引号（第二层） | 在用 |
| `《` `》` | point | `《` before／`》` after | 书名号 | 在用 |
| `\n\n` | **break** | after（锚段末字） | 自然段分段符。写两个换行是 Markdown 的分段写法：生成 rich.md 时原样插入，空一行才是另起一段 | 在用 |
| `#`～`######` | **heading** | before | 标题符，`#` 的个数是级别（v0.2，§4.2） | v0.2 |
| `——` | point | after | 破折号 | 允许，未用 |
| `……` | point | after | 省略号 | 允许，未用 |
| `（` `）` | point | `（` before／`）` after | 括号 | 允许，未用 |

- 标点都用全角中文标点字符。新增别的符号先改本规范。
- **成对标号拆成两条**：开符号 `pos: before` 锚在区间第一个字，闭符号 `pos: after` 锚在区间最后一个字。
- 同一格上可以有多条标点；先后见 [03 §四](./03-guji-markdown.md)。

### 4.1 书名号与专名号的分工（和 entity 的边界）

| 东西 | 记在哪 | 规则 |
|---|---|---|
| **书名号 `《》`** | **两层都记** | 本层出一对 `《》`；[entity](./05-guji-entity.md) 出一个 `type: work` 的实体。`《` 的 `anchor` 必须等于该实体的 `anchor.start`，`》` 的 `anchor` 必须等于 `anchor.end`。由同一次识别产出，改一边要同步改另一边 |
| **专名号**（人、地、官、朝代、年号的下划线） | 只在 entity | 本层不记 |
| 引号、句读、分段 | 只在本层 | entity 不记 |

### 4.2 标题符（v0.2）

标题符标出分卷和各级标题，阅读器据此排标题、出左侧目录（册 → 卷 → 各级标题）。

- **一个锚点**：`pos: before`，锚在标题第一个字上；标题的内容是从这个字到下一个分段符为止。不记结束位置，标题里的 `《》` 等标点照常另记。
- **级别**：`mark` 是 1～6 个 `#`，个数就是级别，与 guji-markdown 的标题写法一致。一部书各级叫什么写在版本 `index.json` 顶层 `heading_levels`（[07 §3.3](./07-book-text-条目布局.md)）。「分卷」就是第 1 级标题，不另设分卷符。
- **前后都是分段处**：标题第一个字要么是册首第一个字，要么前一个字带分段符；标题末字后面也必须有分段符。
- **改字不动标题**：标题只认格位，不存字、不存字下标（`char_offset` 照例只是缓存），**也不写校验字 `pre_char`**，所以改标题里任何一个字（含首字）都不会让标题符失效。
- **分段符照旧锚段末字之后**（`pos: after`），标题行也一样：标题后的分段符锚在标题末字上。分段符不用 `before`，段落归属一律看「段末字之后」。
- **在分段处插字由改字工具判定**：在两段交界处（前段末字之后、后段首字之前）插字时，改字工具要判定新字归前段还是后段，不能默认。归前段（如补标题行末缺的字），就把前段末字上的分段符挪到新字上，`pre_char` 跟着改成新字；归后段（如补下一段开头缺的字），分段符不动，若后段首字带标题符，标题符挪到新字上。删字同理：删段末字，分段符挪到新的段末字上；删标题首字，标题符挪到新的首字上。
- **`label`**：目录名。标题原文太长或不宜直接当目录名时写（如卷名行「欽定四庫全書總目卷二」写 `label: "卷二　經部二"`）；不写就用标题原文（注入点号与成对标号后的文字）。
- **`toc: false`**：正文排成标题，但目录里不单列，用于副题行（如「經部二」已并进卷的 `label`）。
- 没有标题符的书照旧只用 `break`，不受影响。

例（四庫總目第 2 册卷二开头，完整文件见 [`sample.punct-v0.2.json`](../examples/spec-samples/sample.punct-v0.2.json)）：

| anchor | 字 | 条目 | 说明 |
|---|---|---|---|
| `39:1:1` | 欽 | `#` heading，`label: "卷二　經部二"` | 第 1 级：卷 |
| `39:1:10` | 二 | `\n\n` break | 卷名行结束 |
| `39:2:2` | 經 | `#` heading，`toc: false` | 副题行「經部二」 |
| `39:2:4` | 二 | `\n\n` break | |
| `39:3:3` | 易 | `##` heading | 第 2 级：類「易類二」 |
| `39:3:5` | 二 | `\n\n` break | |
| `39:4:1` | 易 | `###` heading；`《` before | 第 3 级：书名行 |
| `39:4:18b` | 本 | `\n\n` break | 书名行结束 |

## 五、版本号（标点线）

本节是 overview `项目进展/古籍文本/整体设计/2026-10-文本版本号与仓库流程.md`（v2，用户 10-05 定）的标点线摘要；三线总则见 [00 §四·3](./00-总览.md)。

- **major＝质量等级**：1 可用，2 出版级，3 定本。从严，绝大多数停在 1；升 major 要成文验收记录（`review`）并要用户点头；脚本不自动升。major 一升，minor、patch 归零。
- **minor＝较大改动**：整册重跑或换模型、换提示词；新的分段规则；新增标点类型（如引号分层、给一册加标题符）；批量修一类错误（如「曰」后统一加冒号）。
- **patch＝小范围改动**：改几处、几十处标点；修少量锚点没对上的条目。
- **分界**：以一次 PR 为单位，一册改动 ≤约 50 处且逐处改的算 patch；超过，或按规则成批改的算 minor。拿不准选 minor。
- **本层 major 不得高于文本线的 major。**
- **文本改了以后**：逐条核 `pre_char` 是否仍等于 char 该格的字。全对得上，只把 `text_version` 跟到新文本版本，不升 `version`；有对不上的，修好后升 patch 或 minor，`text_version` 同时跟上。
- `wip/` 分支可写 `0.x`；第一次并入 main 时定为 `1.0.0`。
- 升版本用 overview `scripts/book-text/bump_original.py --line punct`，它同时改 index.json 镜像、写 `CHANGES.md`。

| 等级 | 门槛 |
|---|---|
| 1 可用 | 机器标点（大模型），只插标点、不改字；抽 200 处，一致率 ≥95% |
| 2 出版级 | 全册人工审读一遍，书名号、引号层级、分段符合标点规范；抽 500 处，一致率 ≥99.5% |
| 3 定本 | 对照至少一种权威点校本逐段核过，分歧处有记录和取舍理由；抽 1,000 处，一致率 ≥99.9%；用户签核 |

## 六、注入与渲染

阅读器、生成器按 char 读序逐字注入（rich.md 的完整规则见 [03 §四](./03-guji-markdown.md)）：

1. 按 char 读序取字流；把每条标点按 `anchor` 换成字下标。
2. 输出第 i 个字之前，先出锚在 i 上的标题符（rich.md 写 `#`× 级别加一个空格），再出其余 `before` 标点；输出字；再输出锚在 i 上的 `after` 标点，`break` 最后。
3. 标题符所在的段（到下一个分段符为止）整段是标题；阅读器排成对应级别的标题，并按 §4.2 出目录。
4. **防御校验**：注入前核 `pre_char` 等于该格的字；不等就告警（网站标红存疑），不盲目注入。
5. 两种展示：**自然段版**遇 `break` 分段、遇 `heading` 排标题；**原刻分行版**忽略 `break` 和 `heading`，保持每列换行和行首 `^`、`.`。
6. 认不得的 `kind` 一律不注入（不要把 `mark` 当普通标点插进正文）。

## 七、校验

- 过 schema；`volume`、`book_id` 与同章 char 一致。
- 每条 `anchor` 在 char 里存在，`pre_char` 等于该格的 `c`（F-OV-02 在 `text_version` 落后时逐条核）。
- `version` 与 index.json `punct_version` 相等；`text_version` 不超前；major 不高于文本线；major ≥2 带 `review`（F-OV-01、F-OV-03）。
- 每一对《》都对应一个同起止的 `work` 实体，反之亦然。
- 不出现 `kind: range`、`pos: range`（v0.2 schema 已删）。
- `break`：`mark` 为 `\n\n`，`pos` 必为 `after`（v0.2 schema 拦 `before`）。
- `heading`（v0.2）：`pos` 必为 `before`，`mark` 为 1～6 个 `#`，不带 `pre_char`；`label`、`toc` 只出现在 `heading` 上；标题前后都是分段处，同一格最多一个标题符；级别不跳级（第一个标题之后，级别 n 的标题之前必有级别 n−1 的标题）。
