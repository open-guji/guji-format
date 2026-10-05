# guji-entity 规范：独立外挂命名实体与知识图谱链接格式 (v0.1)

> 格式标识符：`https://open-guji.org/schema/entity/v0.1.json`  
> 推荐扩展名：`*.entity.json`

---

## 1. 定位与设计原则

古籍在底本物理形态中通常不包含现代专名号（横排下划线、竖排专名线）与书名号。现代古籍整理与知识工程的核心目标之一是**识别命名实体（书名、人名、地名、官职、朝代等）**，并与开源古籍知识库（`book-index`）互联互通。

传统将实体标记和超链接直接内嵌进 Markdown 的做法（如 `[李器之](book-index://Entity/hixhio740001)`）存在以下硬伤：
1. **底本真源污染**：嵌入标记使正文字符被大量 URL 和中括号淹没，破坏了底本的不可篡改性与纯净性；
2. **位移级联失效风险**：若仅使用字符串线性偏移（`start_offset`/`end_offset`），底本一旦增删一个字，后续全书的偏移量瞬间全部错位失效；
3. **实体演进脱节**：随着知识库新建词条（如新收录某官职、补全某古地名），无法在不修改底本的情况下平滑更新超链接。

**解决方案：实体伴生层独立外挂**：
- **以物理拓扑格位为核心锚点**：使用 `<页>:<列>:<格>[子列]` 锚定起止位置，彻底免疫跨页跨列的文字增删级联影响；
- **自校验字符流**：记录实体原文 `text`，注入合成时与底本对应格位逐字比对，杜绝错位；
- **与标点层（`guji-punct`）完全解耦**：标点是字与字之间的断句控制符（Tokens），实体是汉字区间的语义包装（Spans），两者正交共存、互不冲突。

---

## 2. 实体分类与映射规范

实体类型支持以下核心枚举（与 `book-index` 实体库规范保持一致）：

| 实体类型 `type` | 中文名称 | Markdown 渲染记号 | 知识图谱对齐目标 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| **`work`** | 书名 / 篇名 | 书名号 `《…》`（`:sm[…]`） | `book-index/Work` 或 `Book` | `《春秋左氏傳》`、`《鳳棲梧》` |
| **`people`** | 人名 / 著者 / 传主 | 专名号 `/…/`（`:zm[…]{type=人}`） | `book-index/Entity/people/` | `孔子`、`李器之`、`許衡` |
| **`place`** | 地名 / 郡望 / 山水 | 专名号 `/…/`（`:zm[…]{type=地}`） | `book-index/Entity/place/` | `嚴州`、`河內`、`金陵` |
| **`office`** | 官职 / 爵位 | 专名号 `/…/`（`:zm[…]{type=官}`） | `book-index/Entity/office/` | `集賢殿大學士`、`書狀官` |
| **`dynasty`** | 朝代 / 年号 | 专名号 `/…/`（`:zm[…]{type=朝}`） | `book-index/Entity/dynasty/` | `乾道`、`建隆`、`南朝齊` |
| **`other`** | 其他专名（族名/国名） | 专名号 `/…/`（`:zm[…]`） | `book-index/Entity/other/` | `匈奴`、`鮮卑` |

---

## 3. 数据模型定义

### 3.1 实体条目（Entity Entry）

```jsonc
{
  "id": "e001",
  "type": "people",
  "text": "李器之",
  // 权威拓扑锚点：起止格位（单册内为 <页>:<列>:<格>[子列]）
  "anchor": {
    "start": "3:5:2",
    "end": "3:5:4"
  },
  // 派生缓存偏移量（可选，供运行时快速切片，增删字后可由脚本一键重算）
  "span": {
    "start_offset": 118,
    "end_offset": 121
  },
  // 知识库匹配与链接
  "target": {
    "status": "matched",                 // matched(已收录) / new_candidate(新候选需建档) / external(外部网址)
    "entity_type": "people",
    "entity_id": "hixhio740001",         // 匹配的 book-index ID
    "canonical_name": "李器之",          // 规范名
    "href": "book-index://Entity/hixhio740001", // 内部 URI 或外部 URL
    "confidence": 0.98
  },
  "source": "llm:qwen-plus"
}
```

字段说明：
- `type`: 实体类型（`work`, `people`, `place`, `office`, `dynasty`, `other`）。
- `text`: 底本实体原文字符串。
- `anchor`: **核心权威锚点**。包含 `start` 与 `end` 两个格位键。
- `span`: 线性字符流偏移量区间 `[start_offset, end_offset)`（左闭右开，不计空格与换行，仅作内存运行加速缓存）。
- `target`: 知识图谱对齐对象：
  - `status`: 对齐状态：`matched`（已成功关联知识图谱）、`new_candidate`（属于专名实体但在知识库中尚未建档，触发待录入任务）、`external`（外部权威链接，如 CBDB / 维基百科）。
  - `entity_id`: 关联的 `book-index` ID。
  - `href`: 超链接地址。
- `source`: 识别来源（`llm`、`dict:cbdb`、`human` 等）。

### 3.2 完整外挂实体文件结构

```json
{
  "$schema": "https://open-guji.org/schema/entity/v0.1.json",
  "version": "1.0.0",
  "text_version": "1.0.0",
  "book_id": "988g7gsqhd",
  "volume": 1,
  "metadata": {
    "title": "北行日錄上",
    "creator": "qwen-plus:ner_v1",
    "created_at": "2026-10-04T22:15:00Z",
    "base_edition": "original"
  },
  "stats": {
    "total_entities": 4,
    "matched": 3,
    "new_candidates": 1,
    "works": 1,
    "people": 2,
    "places": 1
  },
  "entities": [
    {
      "id": "e001",
      "type": "people",
      "text": "李器之",
      "anchor": {
        "start": "3:5:2",
        "end": "3:5:4"
      },
      "target": {
        "status": "matched",
        "entity_type": "people",
        "entity_id": "hixhio740001",
        "canonical_name": "李器之",
        "href": "book-index://Entity/hixhio740001"
      }
    },
    {
      "id": "e002",
      "type": "work",
      "text": "鳳棲梧",
      "anchor": {
        "start": "3:5:8",
        "end": "3:5:10"
      },
      "target": {
        "status": "matched",
        "entity_type": "work",
        "entity_id": "b1x4k9m0z2q1",
        "canonical_name": "鳳棲梧",
        "href": "book-index://Work/b1x4k9m0z2q1"
      }
    }
  ]
}
```

---

## 4. 三合一动态合成与阅读器渲染规范

阅读器或富文本导出工具可联合读取：
1. **底本纯文字**（Level 3a `lines.md`）
2. **外挂标点**（`*.punct.json`）
3. **外挂实体**（`*.entity.json`）

通过流式拉链对齐合并（Zip Merge），产出带标点、分段、专名线及超链接的最终阅读版：

```markdown
十四日，丙申，雨。[/李器之/](book-index://Entity/hixhio740001)以《[鳳棲梧](book-index://Work/b1x4k9m0z2q1)》餞行。
```
- **书名号内嵌链接**：`《[书名](url)》`；
- **专名号内嵌链接**：`[人名](url)` 并附带专名 CSS 样式；
- **未录入实体候选**：渲染专名号 `/…/` 但不挂载链接，点击可一键呼起“在知识库中建档”工作流。

---

## 5. 版本号（book-text `original`，2026-10-05 定）

> 规范全文：open-guji-core/overview `项目进展/古籍文本/整体设计/2026-10-文本版本号与仓库流程.md`（v2）。

本格式文件顶层的 `version` 是**本层的内容版本**，不是格式版本（格式版本看 `$schema`）。

### 5.1 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `version` | 是 | 本层（实体）的内容版本，`MAJOR.MINOR.PATCH`；MAJOR 只能是 0–3（0 只用于 wip，1–3 是质量等级） |
| `text_version` | 是 | 本层是对着哪一版文本做的，即 book-text `original/index.json` 该章的 `text_version`。**不得超前于当前文本** |
| `review` | major ≥2 时必填（schema 强制） | 验收记录，`date`、`signed_by`、`sample`（抽检数据）三项都不许为空 |

```json
{
  "$schema": "https://open-guji.org/schema/entity/v0.1.json",
  "version": "1.2.0",
  "text_version": "1.4.1",
  "book_id": "96mid1ogzk"
}
```

### 5.2 三线独立

只有 book-text 的 `original`（本项目从书影做出来的文本）跟踪版本；维基文库、Kanripo、识典的转录不写这几个字段。`original` 每册分三条线，各自独立的 semver，互不牵连：

| 线 | 文件 | 版本号记在 |
|---|---|---|
| 文本 | `NNN.lines.md` | `original/index.json` 章条目的 `text_version` |
| 标点 | `NNN.punct.json`（[04](./04-guji-punct.md)） | 顶层 `version` |
| 实体 | `NNN.entity.json`（[05](./05-guji-entity.md)） | 顶层 `version` |

文本改了以后，逐个核本层锚点的校验字（`anchor.start`…`anchor.end` 之间的字与 `text` 是否一致）：

- 全对得上：本层只把 `text_version` 跟到新文本版本，**不升**自己的 `version`；
- 有对不上的：本层按规模修，修好后自己升 patch 或 minor，`text_version` 同时跟上。

### 5.3 三级怎么升

- **major ＝ 质量等级**：1 可用，2 出版级，3 定本。门槛从严，绝大多数停在 1；升 major 要成文验收记录（`review`），并要用户点头；脚本不自动升。major 一升，minor、patch 归零。
- **minor ＝ 较大改动**：新增实体类型；整册重识别；一批 new_candidate 建档后集中回填 book-index id；匹配器换规则后重新链接。
- **patch ＝ 小范围改动**：改个别实体的边界、类型、链接；修少量锚点。
- **分界**：以一次 PR 为单位，一册改动 ≤50 处且逐处改的算 patch；超过，或按规则成批改的算 minor。拿不准选 minor。
- `wip/` 阶段可写 `0.x`；第一次并入 book-text main 时定为 `1.0.0`，前提是够得上第 1 级。

### 5.4 major 门槛（实体线）

| 等级 | 门槛 |
|---|---|
| 1 可用 | 机器识别加自动链接；抽 50 个，类型和边界精确率 ≥90%；挂错 book-index 条目另报，≤5% |
| 2 出版级 | 所有实体人工确认过类型、边界、链接；精确率 ≥99%；逐段抽 20 段查漏，召回 ≥95%；没有「存疑」链接 |
| 3 定本 | 全册逐段人工补过漏，召回 ≥99%；所有链接对象在 book-index 都已正式建档且非「存疑」；用户签核 |
