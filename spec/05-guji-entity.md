# guji-entity v0.2 规范：专名与专名号（`NNN.entity.json`）

> 状态：正式（v0.2，2026-10-09 定稿，overview#497；取代 v0.1）。
> 格式标识：`https://open-guji.org/schema/entity/v0.2.json`
> Schema：[`schemas/guji_entity_v0.2.schema.json`](../schemas/guji_entity_v0.2.schema.json)（v0.1 留档：[`guji_entity_v0.1.schema.json`](../schemas/guji_entity_v0.1.schema.json)）
> 适用：**只用于 book-text 的 `original`**，每章一份，存 main。总表见 [00](./00-总览.md)。

---

## 一、定位

- **专名层与正文解耦**：识别出的专名（书名、人名、地名、官名、朝代、年号）作为字区间外挂在 char 上，链到 book-index 的条目。不往正文或 markdown 里塞记号。
- **锚点用格位**：起止都是格位 key，删改别处的字不会让它错位；`text` 记原文，用来逐字校验。
- **与标点层正交**：标点是字与字之间的记号，实体是一段字的语义包装，两者分开存、互不覆盖（边界见 §六）。
- **每章只入库一份**；对照稿只在本地测试，不进仓。
- 转录本（维基、Kanripo 等）不做实体层；整理本 markdown 正文里只认《書名》（网站 #479 定）。

## 二、文件结构

```json
{
  "$schema": "https://open-guji.org/schema/entity/v0.2.json",
  "version": "1.4.0",
  "text_version": "1.0.0",
  "book_id": "96mid1ogzk",
  "volume": 2,
  "metadata": {"title": "欽定四庫全書總目·第2册", "creator": "glm:glm-4.5-flash", "base_edition": "original"},
  "stats": {"total_entities": 1368, "matched": 567, "ambiguous": 14, "new_candidates": 787},
  "entities": [
    {
      "id": "e00002", "type": "work", "text": "四書通證",
      "anchor": {"start": "4:5:14b", "end": "4:5:17b"},
      "span": {"start_offset": 252, "end_offset": 256},
      "target": {"status": "matched", "entity_id": "d59f2gpsxjia", "canonical_name": "四書通證",
                 "href": "book-index://Work/d59f2gpsxjia", "note": "按撰人「張存中」核对"},
      "source": "glm:glm-4.5-flash"
    },
    {
      "id": "e00140", "type": "dynasty", "text": "宋",
      "anchor": {"start": "19:2:11", "end": "19:2:11"},
      "span": {"start_offset": 2550, "end_offset": 2551},
      "target": {"status": "ambiguous", "canonical_name": "宋",
                 "candidates": [{"entity_id": "hixi1ubk35zj", "canonical_name": "北宋"},
                                {"entity_id": "hixi1ubk35zp", "canonical_name": "南宋"}]},
      "source": "glm:glm-4.5-flash"
    },
    {
      "id": "e00035", "type": "office", "text": "大理寺",
      "anchor": {"start": "9:9:10a", "end": "9:9:12a"},
      "span": {"start_offset": 1121, "end_offset": 1124},
      "target": {"status": "new_candidate", "canonical_name": "大理寺"},
      "source": "glm:glm-4.5-flash",
      "group": {"id": "ge00035", "text": "大理寺評事", "kind": "compound"}
    },
    {
      "id": "e01355", "type": "office", "text": "評事",
      "anchor": {"start": "9:9:13a", "end": "9:9:5b"},
      "span": {"start_offset": 1124, "end_offset": 1126},
      "target": {"status": "matched", "entity_id": "1jb8awb9axxxc", "canonical_name": "評事",
                 "href": "book-index://Entity/1jb8awb9axxxc", "level": "concept", "note": "未定朝代，挂概念条"},
      "source": "glm:glm-4.5-flash",
      "group": {"id": "ge00035", "text": "大理寺評事", "kind": "compound"}
    }
  ]
}
```

## 三、字段

### 3.1 顶层

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `$schema` | string | 是 | 格式版本 | `https://open-guji.org/schema/entity/v0.2.json` | |
| `version` | string | 是 | **实体线内容版本**；index.json 该章 `entity_version` 是它的镜像 | `MAJOR.MINOR.PATCH`，major 0–3；见 §八 | `"1.4.0"` |
| `text_version` | string | 是 | 本层对着哪一版文本做的＝当时 char 的 `version` | 不得超前于当前 char | `"1.0.0"` |
| `review` | object | major ≥2 时必填（schema 强制） | 验收记录 | `date`、`signed_by`、`sample`，三项都不许空 | |
| `book_id` | string | 是 | 所属条目 id | 与同章 char 一致 | |
| `volume` | integer ≥1 | 是 | 册号 | 与同章 char 一致 | `2` |
| `metadata` | object | 否 | 说明 | `title`、`creator`、`created_at`（ISO 8601）、`base_edition`（固定 `original`） | |
| `stats` | object | 否 | 统计，**只供人看**，不作校验依据 | 键名不限，值是整数；常用 `total_entities`、`matched`、`ambiguous`、`new_candidates`，以及各类型计数（`works`、`people`、`places`、`offices`、`dynasties`、`reigns`） | |
| `entities` | array | 是 | 实体条目 | 见 3.2；数组顺序不限 | |

### 3.2 实体条目（`entities[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `id` | string | 是 | 条目编号，文件内唯一，一经发出不改 | `e` ＋五位数字（`e00001`）；新增条目接着最大号往后编，不复用 | `"e00035"` |
| `type` | string | 是 | 实体类型 | 白名单见 §三·3 | `"office"` |
| `text` | string | 是 | **校验字**：底本原文 | 必须等于 char 里 `anchor.start`..`anchor.end` 各格的 `c` 依读序拼接 | `"大理寺"` |
| `anchor` | object | 是 | 起止格位（含两端） | `start`、`end` 都是格位 key（见 [02 §二](./02-guji-char.md)）；`end` 在读序上不早于 `start`；可以跨列、跨夹注子列 | `{"start": "9:9:13a", "end": "9:9:5b"}` |
| `span` | object | 否 | 字下标缓存，左闭右开 | `start_offset`＝`anchor.start` 的字下标，`end_offset`＝`anchor.end` 的字下标＋1（见 [00 §四·2](./00-总览.md)）；`end_offset − start_offset` 等于 `text` 的字数 | `{"start_offset": 1124, "end_offset": 1126}` |
| `target` | object | 是 | 链接 book-index 的结果 | 见 §四 | |
| `source` | string | 否 | 产出方 | `<类>:<名>`，同 punct（`glm:glm-4.5-flash`、`claude:manual`、`human:<人>`…） | `"glm:glm-4.5-flash"` |
| `group` | object | 否 | 复合专名的整串信息 | 见 §五 | |

### 3.3 `type` 白名单

| `type` | 中文 | 链到 book-index | 渲染（网站，book-index-ui 0.47.3 起） | 例 |
|---|---|---|---|---|
| `work` | 书名、篇名 | `Work`（或 `Book`） | 书名号：正文里的《》来自标点层，实体层加波浪线 | 讀易私言、四書通證 |
| `people` | 人名 | `Entity`（people） | 专名直线 | 許衡、王弼 |
| `place` | 地名 | `Entity`（place） | 专名**双线** | 河內、資州 |
| `office` | 官职、官署 | `Entity`（office） | 专名直线 | 集賢殿大學士、大理寺 |
| `dynasty` | 朝代 | `Entity`（dynasty） | 专名直线 | 宋、元 |
| `reign` | 年号 | `Entity`（reign） | 专名直线 | 乾道、建隆 |
| `other` | 其他专名（族名、国名等），兜底 | `Entity` | 专名直线 | 匈奴 |

- `book` **不作** `type` 值：指向 Book 条目的书名仍写 `work`，靠 `href` 的 `Book/` 前缀区分。
- 白名单之外的值不许写。新增类型先改本规范和 schema，并请网站确认渲染。
- 线型由 `type` 决定，数据里不写线型。

## 四、`target`：链到 book-index

### 4.1 五种状态

| `status` | 含义 | 必带 | 不得带 | 网站渲染 |
|---|---|---|---|---|
| `matched` | 唯一命中一个 book-index 条目 | `entity_id`、`canonical_name`、`href` | `candidates` | 画线＋链接＋悬停摘要卡 |
| `matched_multi` | 一个 span 是合称，对应两个以上条目（正嘉＝正德＋嘉靖，二程＝程顥＋程頤） | `canonical_name`、`targets[]`（≥2 项） | `entity_id`、`href`、`candidates` | 画线＋逐项链接＋悬停卡列出各项（§四·4） |
| `ambiguous` | 命中多个同名条目，尚未消歧 | `canonical_name`、`candidates[]`（≥2 项） | `entity_id`、`href` | 只画线 |
| `new_candidate` | 是专名，但 book-index 里还没建档 | `canonical_name` | `entity_id`、`href`、`candidates` | 只画线 |
| `external` | 链到外部（CBDB、维基等），保留 | `href`（外部 URL） | `entity_id` | 只画线 |

### 4.2 字段

| 字段 | 类型 | 含义 | 取值 | 例 |
|---|---|---|---|---|
| `status` | string | 状态 | 上表四值之一 | `"matched"` |
| `entity_id` | string | book-index 条目 id | 见 §四·3 | `"d59f2gpsxjia"` |
| `canonical_name` | string | 规范名（book-index 条目的主名；未建档的写拟用名） | | `"四書通證"` |
| `href` | string | 链接 | matched：`book-index://<Work\|Book\|Entity>/<entity_id>`，末段必须等于 `entity_id`；external：外部 URL | `"book-index://Entity/1jb8awb9axxxc"` |
| `candidates` | array | 候选（只 `ambiguous` 用） | 每项 `{"entity_id", "canonical_name"}`，按可能性从高到低 | |
| `level` | string | 挂的是概念条还是具体条（主要用于官职：定不了朝代时挂概念条） | `concept`／`concrete`；不写＝具体条 | `"concept"` |
| `note` | string | 一句话依据或说明（匹配依据、为何不挂等） | | `"未定朝代，挂概念条"` |
| `confidence` | number 0–1 | 匹配置信度 | | |
| `entity_type` | string | v0.1 遗留，与 `type` 重复，新数据不写 | | |

T 匹配流程内部用的 `coarse`、`reclass`、`route_to` 等字段**不进文件**，落盘前去掉。

### 4.4 多链接 `matched_multi`

合称（正嘉、漢唐、魏晉、六朝、二程）一个 span 不拆，`target` 写：

```json
"target": {"status": "matched_multi", "canonical_name": "正德＋嘉靖",
  "targets": [
    {"part": "正", "entity_id": "hixi1ubq0obp", "canonical_name": "正德", "href": "book-index://Entity/hixi1ubq0obp"},
    {"part": "嘉", "entity_id": "hixi1ubq0obq", "canonical_name": "嘉靖", "href": "book-index://Entity/hixi1ubq0obq"}]}
```

- `targets[]` 每项 `entity_id`、`canonical_name`、`href` 必带（同 `matched`，href 末段等于 `entity_id`），按文中先后排；可选 `part`（对应 span 文本里的哪一段字）、`level`。顶层 `canonical_name` 为各项规范名用「＋」连接，只作显示。
- 与 `group`／`decomposition` 的分工：上下级拆分（官署＋官职、州＋县）用 §五的相邻 span；并列的独立条目（合称）用 `matched_multi`；同一个 span 不并存两套。
- 不认识 `matched_multi` 的旧读取方当作未链接（只画线），不会错链到第一项。
- 渲染约定见 [03 §四·6](./03-guji-markdown.md)：每项都有 `part` 且依次拼起来等于 span 文本时，rich 按 part 切成相邻专名各带各的链接；有项没有 `part`（二程、六朝）时整串写成一个不带链接的专名，悬停卡直接读 entity 层，列出各项的摘要卡。

### 4.3 `entity_id` 用哪个 id

- **写 matched 时用正式库（`book-index`）的 id。**正式库还没有、只在草稿库（`book-index-draft`）有的，可以写草稿 id，`href` 同步写草稿 id。
- 草稿 id 升格后，读取方按 book-index 的 `promotions.json` 跳转到新 id（网站的 `/item/<id>` 已 308 跳转，悬停卡也跟随）；**读取方不得写死旧 id**。
- 一批草稿 id 升格后，集中把文件里的旧 id 回挂成新 id，算实体线 **minor**。
- 校验器只**报告**「指向已升格旧 id」的条数，不判错。

## 五、复合专名：相邻 span ＋ `group`

一个专名由两段可以各自链接的专名组成时（官署＋官职「大理寺評事」、地名＋官职「福建儒學提舉」、州＋县「泰州如臯」），**拆成读序相邻的几个 span**，每个 span 有自己的 `anchor`、`span`、`type`、`target`；整串信息放在每个 span 都带的 `group` 里。（网站 #479 定的方案 A：阅读器一个 span＝一个类型＝一个链接，不读嵌套。）

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `group.id` | string | 是 | 组编号，文件内唯一 | `g` ＋组内第一个 span 的 `id`（如 `ge00035`） |
| `group.text` | string | 是 | 整串原文 | 等于组内各 span 的 `text` 按读序拼接 |
| `group.kind` | string | 是 | 组类型 | 现只有 `compound`（复合专名） |

规则：

- 同一 `group.id` 的 span **至少 2 个**，读序上首尾相接（前一个的 `span.end_offset` 等于后一个的 `span.start_offset`），中间不夹别的字。
- 组内各 span 的 `type` 可以不同：官署＋官职→`office`＋`office`；地名＋官职→`place`＋`office`；州＋县→`place`＋`place`。
- 整串不是一个可建档的条目，不另立整串 span，也不给整串写 `target`。
- 不拆的：后段是书院名、山水名等第一期不建档的（「東湖書院山長」「峽州長楊山谷」），整串作一个 span。
- 「X人」的籍贯：span 不含「人」字（「臨川人」→ span＝臨川）。
- 草稿契约里的 `decomposition` 写法**不进本格式**（可作匹配脚本内部的源记法，落盘时展开成相邻 span）。

## 六、专名号、书名号与标点层的边界

| 规则 | 说明 |
|---|---|
| **书名两层都记** | `work` 实体＋标点层一对《》。`《` 的 `anchor`＝实体 `anchor.start`，`》` 的 `anchor`＝实体 `anchor.end`。改一边要同步改另一边 |
| **专名号只在本层** | 人、地、官、朝代、年号的线只由本层产生，标点层不记 |
| **每字只归一个实体** | span 之间**不得重叠、不得嵌套**（阅读器按字建索引，重叠时只取一个，内层会被吞）。层次关系用 §五 的 `group` 表达 |
| 引号、句读、分段 | 只在标点层 |

## 七、合成与渲染

阅读器或生成器联合读 char＋punct＋entity，按读序合成（rich.md 的完整规则见 [03 §四](./03-guji-markdown.md)）：

```markdown
十四日，丙申，雨。[/李器之/](book-index://Entity/hixhio740001)以《[鳳棲梧](book-index://Work/b1x4k9m0z2q1)》餞行。
```

- 网站按 index.json 章条目的 `entity_file` 取本文件；**没有 `entity_file` 声明＝不画**。
- 必须有逐字可解的 `anchor`；`span` 只是缓存。
- matched 有链接和悬停卡；matched_multi 逐项链接（§四·4）；ambiguous、new_candidate、external 只画线。

## 八、版本号（实体线）

本节是 overview `项目进展/古籍文本/整体设计/2026-10-文本版本号与仓库流程.md`（v2）的实体线摘要；总则见 [00 §四·3](./00-总览.md)。

- **major＝质量等级**：1 可用，2 出版级，3 定本；升 major 要 `review` 并要用户点头；脚本不自动升。
- **minor**：新增实体类型；整册重识别；一批 new_candidate 建档后、或一批草稿 id 升格后集中回挂；匹配器换规则后重链；一批复合专名拆分。
- **patch**：改个别实体的边界、类型、链接；修少量锚点。
- **分界**：一次 PR 一册改动 ≤约 50 处且逐处改的算 patch；否则 minor。拿不准选 minor。
- 本层 major 不得高于文本线。文本改了：逐个核 `text` 与 char 的 `anchor.start..end` 是否一致；全对得上只跟 `text_version`，有对不上的修好后升 patch 或 minor。
- 升版本用 `bump_original.py --line entity`，同时改 index.json 镜像、写 `CHANGES.md`。

| 等级 | 门槛 |
|---|---|
| 1 可用 | 机器识别加自动链接；抽 50 个，类型和边界精确率 ≥90%；挂错 book-index 条目另报，≤5% |
| 2 出版级 | 所有实体人工确认过类型、边界、链接；精确率 ≥99%；逐段抽 20 段查漏，召回 ≥95%；没有「存疑」链接 |
| 3 定本 | 全册逐段人工补过漏，召回 ≥99%；所有链接对象在 book-index 都已正式建档且非「存疑」；用户签核 |

## 九、校验

- 过 schema；`volume`、`book_id` 与同章 char 一致；`id` 唯一。
- 每条 `anchor.start`、`anchor.end` 在 char 里存在，`text` 等于其间各格的字（F-OV-02 在 `text_version` 落后时逐条核）。
- `span`（有的话）与 `anchor` 换算一致。
- 各 `status` 的必带、不得带字段（§四·1）；matched 的 `href` 末段等于 `entity_id`；matched_multi 的 `targets` ≥2 项、每项 `href` 末段等于 `entity_id`、顶层不带 `entity_id`／`href`，`part` 若有须是 span 文本里的片段。
- span 不重叠；`group` 满足 §五 规则。
- 每个 `work` 实体都有同起止的一对《》。
- `version` 与 index.json `entity_version` 相等，`text_version` 不超前，major 不高于文本线（F-OV-01、F-OV-03）。

## 十、v0.1 → v0.2 的变化

| 项 | v0.1 | v0.2 |
|---|---|---|
| `type` | work／people／place／office／dynasty／other | 加 `reign` |
| `target.status` | matched／new_candidate／external | 加 `ambiguous`（带 `candidates`） |
| `target` 字段 | `entity_type`、`entity_id`、`canonical_name`、`href`、`confidence` | 加 `candidates`、`level`、`note`；`entity_type` 废弃 |
| `group` | 无 | 新增（复合专名） |
| `id`、`target`、`volume` | 选填 | 必填 |

现有 v0.1 文件只要把 `$schema` 改成 v0.2 的 URL 即可通过（现有数据已按 v0.2 写）。
