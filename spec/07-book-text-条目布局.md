# 07 book-text 条目布局

> 状态：正式（2026-10-09 定稿，overview#497）。标「待定」的条目照实保留。
> Schema：[`schemas/book_text_manifest_v1.schema.json`](../schemas/book_text_manifest_v1.schema.json)、[`schemas/book_text_index_v1.schema.json`](../schemas/book_text_index_v1.schema.json)
> 依据：overview `项目进展/古籍索引网站/设计/阅读文本.md`（#307，09-30 新结构）、`项目进展/古籍文本/整体设计/2026-09-book-text格式规范.md`（校验规则 F-*）、book-text `CLAUDE.md`、`docs/ORIGINAL.md`。总表见 [00](./00-总览.md)。

---

## 一、目录结构

```
book-text/
├── Work/<c1>/<c2>/<c3>/<work_id>/      一个 Work 条目
│   ├── manifest.json                  本条目全部版本的清单（§二）
│   ├── default/                       主版本
│   │   ├── index.json                 章目录与本版本元数据（§三）
│   │   ├── 001.md  002.md …           章文件（§四·1）
│   │   ├── 001.json …                 整理本才有：由 md 派生的结构化条目（§四·2）
│   │   ├── pages.tsv                  一列一行的转录本才有：页码对照（§四·3）
│   │   └── extra/                     附件（§五·3）
│   ├── <key>/                         其他版本，结构同 default/
│   ├── fragments/<书名>.json          辑佚（§五·1）
│   └── sources/<来源>/…               抓取原件（§五·2）
├── Book/<c1>/<c2>/<c3>/<book_id>/      一个 Book 条目，结构同 Work（没有 fragments、sources）
└── index/
    ├── texts/{0-f}.json               全部 manifest 的汇总（§六）
    └── fragments/{0-f}.json           全部辑佚的汇总（§六）
```

### 1.1 分片

`<c1>/<c2>/<c3>` 是条目 id 的**倒数第三、倒数第二、倒数第一个字符**：`d59f2q3s53b5` → `Work/3/b/5/d59f2q3s53b5/`，`96mid1ogzk` → `Book/g/z/k/96mid1ogzk/`。与 book-index 同一套。

### 1.2 版本 key

| 规则 | 内容 |
|---|---|
| 主版本 | key 固定 `default`，目录 `default/`；manifest 的 `versions[0]` 永远是它 |
| 其他版本 | 按来源取 key：`collated` 整理本、`wikisource` 维基文库、`kanripo` Kanripo、`shidian` 识典（私有仓）；其他来源用来源英文短名（如 `shiyuan` 適園叢書本） |
| 同源第二份起 | 加序号：`wikisource-2`、`wikisource-3` |
| 字符 | 只用 `[a-z0-9-]`，以字母开头 |
| 保留字 | `default`、`manifest`、`fragments`、`sources`、`extra` 不能作非主版本的 key |
| **主版本怎么选** | 按来源优先：整理本 → 维基文库 → Kanripo → 识典；章数只在同一来源内部比。只有一份文本的，那份就是 `default/`。新加的版本排位高于现 default 时，把现 default 挪成按来源命名的 key，新的放进 `default/` |
| 一书一份 | 同一个 Work 已有全文的，一般不再收第二份；另一来源记在已收那份 `index.json` 的 `other_sources` |

---

仓根的 `scripts/`（维护脚本）、`.claude-inbox/` 不属数据，本规范不管。

## 二、`manifest.json`

```json
{
  "id": "d59f2mel8d1c",
  "versions": [
    {"key": "default", "kind": "collated", "label": "整理本", "source": "wikisource", "source_name": "維基文庫",
     "source_url": null, "license": "CC BY-SA 4.0", "quality": "rough", "chapters_total": 32},
    {"key": "wikisource", "kind": "transcription", "label": "維基文庫", "source": "wikisource", "source_name": "維基文庫",
     "source_url": "https://zh.wikisource.org/wiki/…", "license": "CC BY-SA 4.0", "quality": "source",
     "chapters_total": 32, "edition_label": "四庫全書本"}
  ]
}
```

### 2.1 顶层

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `id` | string | 是 | 条目 id | 等于条目目录名 |
| `versions` | array | 是 | 全部版本，`versions[0]` 是 `default` | 每个版本目录都要登记，登记了的都要有目录（F-MF-01） |

### 2.2 版本（`versions[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `key` | string | 是 | 版本 key＝目录名 | 见 §一·2 | `"kanripo"` |
| `kind` | string | 是 | 版本性质 | `transcription` 转录（维基、Kanripo、识典等搬来的文本）／`collated` 整理本／`self_collated` 本项目从书影自做的文本（即 original，见 2.3） | `"transcription"` |
| `label` | string | 是 | 下拉显示名，**只写来源** | `維基文庫`、`Kanripo`、`整理本`、`開源古籍自校本`…；同源第二份写「維基文庫 2」 | `"維基文庫"` |
| `source` | string | 是 | 来源代号 | `wikisource`、`kanripo`、`zhihu`（知乎网友整理）、`unknown`（来源不明的整理本）、`original`（本项目从书影自做；旧数据里已有的 `open-guji` 仍认，见 §二·4）、其他来源英文短名（如 `shiyuan`） | `"wikisource"` |
| `source_name` | string | 是 | 来源中文名 | `維基文庫`、`Kanripo`、`知乎网友整理`、`网络`（unknown）、`開源古籍`… | |
| `source_url` | string 或 null | 是（可为 null） | 来源页面 | 维基页面、Kanripo 仓库地址；没有写 `null` | |
| `license` | string | 是 | 本版本的授权 | 取值：`CC0 1.0`／`CC BY-SA 4.0`／`CC BY-NC-SA 4.0`／`来自网络，版权未知`（固定字符串）／其他明确的上游 CC 授权（「CC 官方简称＋空格＋版本号」，如 `CC BY 4.0`）。**`is_original: true` 的版本必须是 `CC0 1.0`**；其余见下。不许 `null`、`未知`、`unknown` | `"CC BY-SA 4.0"` |
| `quality` | string | 是 | 文本质量等级 | `source`（照录来源，未加工）、`ocr`（OCR 未校）、`rough`（粗校）、`fine`（精校）、`none`、`placeholder`（占位）。与版本 index.json 的 `text_quality.grade` 同一套 | `"source"` |
| `chapters_total` | integer ≥0 | 是 | 章数 | 等于版本 `index.json` 的 `chapters` 条数 | `32` |
| `edition_label` | string | 否 | 底本版本名（维基／Kanripo 页面上的版本名，如「四庫全書本」） | 只作补充显示，不替代 `label` | `"文淵閣四庫全書本"` |
| `is_original` | boolean | 否 | `true`＝本版本就是 original（见 2.3）；同一条目最多一个版本为 `true` | 只与 `kind: self_collated` 一起用 | `true` |
| `note` | string | 否 | 一句话说明 | | |
| `script` | string | 否 | 本版本正文的字形：`hant` 繁体／`hans` 简体／`mixed` 繁简混杂。**缺省＝未判定**（没有正文的空版本不写，也不写 `null`）；由 book-text 的 `scripts/set_script.py` 按统一口径写入，手写也合法 | `hant`／`hans`／`mixed` | `"hant"` |
| `visibility` | string | 否 | `internal`＝只内部角色可见（book-text-private 用），公开仓不写 | `internal` | |

授权以本字段为准（book-text README「授權」节）。**硬规定（2026-10-08 用户定，overview#497，取代同日前一条）**：

1. **`CC0 1.0` 目前只给本项目从书影完全自己做的 original**（`is_original: true`，现在只有四庫總目 `96mid1ogzk`）。schema 强制。
2. **其余从别处 OCR 或转录来的版本**（`collated`、`transcription`，包括据影印本 OCR 校对的整理本）一律暂不标 CC0：
   - 上游授权写得明确的照上游写：维基文库、Kanripo 自录 `CC BY-SA 4.0`；Kanripo 转自 CBETA 的佛典 `CC BY-NC-SA 4.0`；
   - 其余一律写固定字符串 **`来自网络，版权未知`**。旧写法 `未知`、`null`、`unknown` 都改成这一句。

### 2.3 original 怎么认

- **original**＝本项目从书影自做的文本（char／cord／punct／entity／norm 真源）。它是 manifest 里 **`kind: self_collated` 且 `is_original: true`** 的那个版本。
- 目录 key 照主版本规则：它是本条目最好的文本时就放在 `default/`（现在四庫總目 `96mid1ogzk` 即如此）。工具识别 original 一律看 manifest 的 `is_original`，不看目录名；目录名叫 `original/` 的旧写法同样认。
- 旧文档（book-text `docs/ORIGINAL.md`、`VERSIONING.md`）写的 `original/` 目录按本节理解。

### 2.4 已定事项

- **自做文本的 `source` 代号**（用户 10-09 定，overview#497）：新数据写 `original`（`source_name`「開源古籍」）。旧数据里已有的 `open-guji`（如四庫 `96mid1ogzk`）仍认，读取方两者一视同仁。
- **自做文本的授权**（用户 10-08 定）：只有 `is_original` 的版本是 `CC0 1.0`，其余照上游授权或写「来自网络，版权未知」，见 §二·2。存量不合的由文本经理改（吻合度报告 §六 方案 8b）。

---

## 三、版本 `index.json`

所有版本都有一份。**名字、授权、来源以 manifest 为准**，index.json 只放章目录和本版本特有的元数据。三种 kind 的字段不同，分开写。

### 3.1 公共：章目录 `chapters[]`

| 字段 | 类型 | 必填 | 含义 | 取值 | 例 |
|---|---|---|---|---|---|
| `n` | integer ≥1 | 是 | 章号 | 从 1 起；original 里等于册号 | `1` |
| `file` | string | 是 | 章文件名（不含扩展名） | 三位数字，等于 `n` 补零 | `"001"` |
| `title` | string | 是 | 章标题 | 卷名、回目等 | `"第一回　甄士隱夢幻識通靈"` |
| `has_json` | boolean | 转录本、整理本必填 | 有没有同名 `NNN.json`（§四·2） | | `false` |

### 3.2 转录本（`kind: transcription`）

**顶层：**

| 字段 | 类型 | 必填 | 含义 | 取值／例 |
|---|---|---|---|---|
| `chapters` | array | 是 | 章目录 | 3.1；章条目另见下表 |
| `total_chapters` | integer | 是 | 章数 | 等于 `chapters` 条数 |
| `version_label` | string | 是 | 本版本的描述名 | `"程甲本（紅樓夢）"` |
| `revision` | string | 是 | 存量字段，固定 `"1.0.0"`，**不维护**（转录本不跟踪版本） | `"1.0.0"` |
| `source` | object | 是 | 来源记录，用于追溯 | 见下表 |
| `work_id` | string | Work 层必填 | 所属 Work id | |
| `book_id` | string | Book 层必填 | 所属 Book id | |
| `fetched_at` 或 `scraped_at` | string（日期） | 二选一必填 | 抓取日期 | `"2026-09-27"` |
| `text_quality` | object | 是 | `{"grade": <quality 取值>}` | `{"grade": "source"}` |
| `edition_note` | string | 否 | 版本说明：与 book-index 哪个 Book 对应、处理了什么 | |
| `guji_markdown` | string | 否 | md 按哪一版 guji-markdown 写 | `"0.2.0"` |
| `line_is_column` | boolean | 否 | `true`＝md 一行即底本一列（Kanripo／CBETA），页码在 `pages.tsv` | `true` |
| `fetch_stats` | object | 否 | 抓取统计 | `{"requests": 0, "retries_429": 0, "source": "dump"}` |
| `other_sources` | array | 否 | 同一作品的其他来源（未另收版本） | `[{"name": "Kanripo", "url": "…", "id": "KR6r0127"}]` |
| `variants` | array | 否 | 来源里标注的异文 | `[{"primary": "女", "alt": ["男"]}]` |
| `unknown_templates` | object | 否 | 维基转换时没认出的模板计数 | `{"uncategorized": 1}` |
| `dropped_refs` | integer | 否 | 维基转换时丢掉的注脚数 | `1` |
| `table_notation` | string | 否 | 本版本表格记法 | `"guji-table-v1"`（即 `:::table`） |
| `placeholder_chars` | integer | 否 | 占位字（缺字）个数 | `10` |
| `scraped_from` | string | 否 | 抓取来源文件 | `"wikisource-multistream.xml.bz2 (2026-04-25 dump)"` |

**`source` 对象：**

| 字段 | 必填 | 含义 | 例 |
|---|---|---|---|
| `name` | 是 | 来源名 | `"維基文庫"` |
| `license` | 是 | 授权（与 manifest 一致） | `"CC BY-SA 4.0"` |
| `url` | 是 | 来源地址 | |
| `page_title`、`revid`、`pageid`、`timestamp`、`dump_date` | 否 | 维基页面名、修订号、页面号、修订时间、dump 日期 | |
| `commit`、`base_edition` | 否 | Kanripo 仓库提交号、Kanripo 底本代号（如 `WYG`） | |
| `siku_class`、`catalog_line`、`upstream`、`type`、`note` | 否 | 四库分类、目录行原文、上游来源（如 CBETA）、来源类型、备注 | |

**章条目另加（转录本）：**

| 字段 | 含义 | 例 |
|---|---|---|
| `md_len` | 该章 md 的字符数 | `6891` |
| `page_title`、`revid` | 维基该章页面名、修订号 | `"紅樓夢（程甲本）/一"`、`1486886` |
| `juan` | 卷号 | `"07"` |
| `volume` | 册号 | `1` |
| `pdf_pages` | 对应 PDF 页范围与核对结果 | `"43-56 ok=14 miss=0"` |
| `has_table` | 本章含 `:::table` | `true` |

### 3.3 original（`kind: self_collated`，`is_original: true`）

**顶层：**

| 字段 | 类型 | 必填 | 含义 | 例 |
|---|---|---|---|---|
| `chapters` | array | 是 | 每册一条，见下表 | |
| `total_chapters` | integer | 是 | 册数 | `2` |
| `book_id` 或 `work_id` | string | 是 | 所属条目 id | `"96mid1ogzk"` |
| `source` | object | 是 | `{"name", "license"}` | |
| `version_label` | string | 否 | 描述名 | `"開源古籍自校本"` |
| `note` | string | 否 | 说明 | |
| `fetched_at` | string | 否 | 入库日期 | |
| `revision`、`guji_markdown` | string | 否 | **存量，不维护**：original 的版本由三条线管（§三·4），不用 `revision` | |

**章条目（每册一条）：**

| 字段 | 类型 | 必填 | 含义 | 例 |
|---|---|---|---|---|
| `n`、`file`、`title` | | 是 | 同 3.1；`n`＝册号＝各层文件的 `volume` | |
| `char_file` | string | **是** | 文本真源文件名 | `"002.char.json"` |
| `cord_file` | string | 否 | 像素框文件名 | `"002.cord.json"` |
| `punct_file` | string | 否 | 标点文件名 | `"002.punct.json"` |
| `entity_file` | string | 否 | 实体文件名；**网站没有这个声明就不画专名** | `"002.entity.json"` |
| `norm_file` | string | 否 | 规范层文件名 | `"002.norm.json"` |
| `decision_file` | string | 否 | 候选层文件名 | `"002.decision.json"` |
| `text_version` | string | 是 | 文本线版本，char `version` 的镜像 | `"1.0.0"` |
| `punct_version` | string | 有 punct 时必填 | punct `version` 的镜像 | `"1.1.0"` |
| `entity_version` | string | 有 entity 时必填 | entity `version` 的镜像 | `"1.4.0"` |
| `pages` | string | 否 | 本册覆盖的页号范围（扫描顺序号，首尾都含） | `"1-188"` |
| `lines_file`、`rich_file` | string | **只在 derived 分支** | 生成物文件名 | `"002.lines.md"` |

- **有这个字段＝有这个文件**：写了的 `*_file` 必须存在，文件名必须是 `NNN.<代号>.json`／`.md`（F-OV-04）。
- 三个 `*_version` 是镜像，必须和各自文件顶层的 `version` 相等（F-OV-01），由 `bump_original.py` 同步，不手改。
- 文本线 major ≥2 的验收记录放在 char 顶层 `review`（过渡期的 `text_review` 字段不再用）。

### 3.4 `CHANGES.md`（original 版本目录下）

每次升任何一条线的版本，在 original 版本目录的 `CHANGES.md` 末尾记一行（`bump_original.py` 自动写）：

```markdown
| 日期 | 册 | 线 | 旧→新 | 说明 | PR |
|---|---|---|---|---|---|
| 2026-10-08 | 96mid1ogzk/002 | 实体 | 1.3.0→1.4.0 | 复合专名拆相邻 span（T 批2） | #27 |
```

- 「册」写 `<条目 id>/<章 NNN>`；一次动几册记几行。
- 「线」写 `文本`／`标点`／`实体`（首次并 main 可写「文本＋标点＋实体」）。

### 3.5 整理本（`kind: collated`）

| 字段 | 类型 | 必填 | 含义 | 取值／例 |
|---|---|---|---|---|
| `chapters` | array | 是 | 章目录（3.1） | |
| `work_id` | string | 是 | 所属 Work id | |
| `type` | string | 是，非 null | 整理本体裁，决定 `NNN.json` 的结构 | `catalog` 目录（艺文志、经籍志等）／`anthology` 选集／`collated_edition` 校订本／`kaozhen` 考证／`fragment_collection` 辑佚集；`placeholder` 只作存量占位，且须配 `text_quality.grade: placeholder`（F-CE-02/03/04b） |
| `total_entries` | integer | 是 | 条目数 | `749` |
| `revision` | string | 是 | 整理本版本号，按 book-index 整理本版本规定（`bump-collated.py`）管 | `"1.0.0"` |
| `revised_at` | string（日期） | 是 | 最后修订日期 | `"2026-08-25"` |
| `text_quality` | object | 是 | `grade`（同 manifest `quality`）＋`source_note`（底本说明），可加 `scope`、`grade_note`、`gap_note` | `{"grade": "rough", "source_note": "識典古籍OCR帶標點版"}` |
| `juan_groups` | array | 否 | 卷的分组（如「卷一（經部）」包含哪些章文件） | `[{"label": "卷一（經部）", "files": […]}]` |
| `references` | array | 否 | 参考来源 `{title, url}` | |
| `matched_entries` | integer | 否 | 已链到 Work 的条目数 | `737` |
| `title`、`compiler`、`compiler_role`、`edition`、`source_text`、`coverage`、`collated_edition_type`、`schema_version` | | 否 | 书目元数据：书名、编者、编者角色（撰、輯…）、所据版本、底本来源说明、覆盖程度、整理本子类、结构版本 | |

出现在 4 部以下的其余字段（`annotator`、`daxu`、`total_lue` 等）允许，不逐个解释；清单与频次见 overview 吻合度报告附录。

---

## 四、章文件

### 4.1 `NNN.md`

转录本、整理本每章一份，记法见 [03 §二](./03-guji-markdown.md)。整理本的 md 是真源（F-CE-05）。

### 4.2 `NNN.json`（整理本的结构化条目）

整理本每章可有一份同名 json（`has_json: true`），**由同名 md 派生**（F-CE-05：md 为真源）；md 与 json 不同步是巡检项。

**F-CE-05 登记的例外（json 为真源）**：只有 `NNN.json`、没有同名 md 的章，须同时满足下列条件才算合规，否则仍按 F-CE-05 要求补 md：

1. 所属版本的 `index.json` 中 `type` 为 `fragment_collection`（辑佚集），或该章 json 的内容无法一一还原成 md（例如 json 的章号与同版本其他章的 md 章号不对应）；
2. 该章在 `index.json` 的 `chapters[]` 里 `has_json: true`；
3. 例外清单登记在 book-text 的巡检脚本输出里（`b3_status.py` 的 #11 行），新增例外须经文本块经理点头。

存量例外（10-14 登记，现 77 章）：`d59f2mua7w8y` 75 章（馬國翰辑佚目录，各章只有目录元数据，`fragments` 为空）、`d59f2ncf8cn5` 1 章、`d59f2mcdblz4` 1 章。`d59dh3vo9af4` 原登记 4 章（json 章号与 md 章号错位），10-14 已按 json = md + 4 整体改名对齐（book-text #99），卷首 1–4 的 json 移入 `sources/`，该条目已从例外中移出。

**顶层：**

| 字段 | 必填 | 含义 | 例 |
|---|---|---|---|
| `title` | 是 | 章标题 | `"經部七·孝經類"` |
| `sections` | 是 | 条目列表，见下 | |
| `page_title`、`source_url`、`source_juan` | 否 | 来源页面名、地址、来源卷号 | |
| `work_id`、`related_works` | 否 | 本章对应的 Work、相关作品 `[{id, title, relation}]` | |
| `part`、`bian`、`lei`、`chapter`、`lue`、`lue_xu`、`total`、`total_notes`、`zhong_count`、`volume`、`page` | 否 | 考证、艺文志类的结构信息：部、编、类、章、略、略序、小计、种数、册、页 | |
| `ai_note`、`updated_at`、`schema_version` | 否 | 整理说明、更新日期、结构版本 | |

**`sections[]` 必有四键**（F-CE-06；`content` 可为空串，但键不能缺）：

| 字段 | 类型 | 含义 | 取值 |
|---|---|---|---|
| `title` | string | 条目标题 | |
| `level` | integer | 层级 | 0–4；现有 3 占绝大多数 |
| `type` | string | 条目类型 | `book` 书目条目／`verification` 考证条目／`prose` 散文篇／`preface` 序／`category` 类目标题／`tally` 小计行／`reconstruction` 辑佚重建条目／`comment` 按语／`poem` 诗／`page_header` 页眉 |
| `content` | string | 条目正文 | 可为空串 |

`type: book` 的条目必须有 `work_id` 键（值可为 `null`）。

**出现率 ≥1% 的其他字段：**

| 字段 | 含义 |
|---|---|
| `work_id`、`work_ids` | 该条目链到的 Work（一个或多个） |
| `book_title`、`n_juan`、`author`、`author_info`、`author_type`、`dynasty`、`edition`、`juan` | 书名、卷数、作者、作者原文说明、著作方式（撰、注…）、朝代、版本、所在卷 |
| `summary`、`note`、`ai_note` | 提要、整理注、AI 整理说明 |
| `page`、`metadata` | 来源页码、来源元数据（档案类） |
| `target_bid` | 链到的 Book id |
| `content_from`、`link_basis` | 内容出处、链接依据 |
| `_title_only`、`_author`、`_author_src`、`_work_id_src`、`_no_author` 等 | **下划线前缀的证据字段**：整理过程留下的解析证据，校验器不计违规，**不得直接删**（改版时可迁为正式字段） |

其余长尾字段允许，不逐个解释；清单与频次见吻合度报告附录。

### 4.3 `pages.tsv`（一列一行转录本的页码对照）

`line_is_column: true` 的版本带一份，制表符分隔，首行是表头：

| 列 | 含义 | 例 |
|---|---|---|
| `file` | 章文件名 | `001.md` |
| `line_no` | 该页在章文件里从第几行开始（1 起） | `3` |
| `pb` | 来源的页码代号（Kanripo 的 `<pb>`，CBETA 的页栏） | `KR3e0011_WYG_000-1a` |

---

## 五、其他

### 5.1 `fragments/<书名>.json`（辑佚，Work 层）

一部亡佚书的辑佚著录，一书一份。格式定义见 book-index `SCHEMA.md#輯佚檔fragments`（文件里 `schema_ref` 指向它），此处列要点。

**必有字段**（F-FR-01；规范档原称「核心 13 字段」，校验器实际查下列 14 个，含 `ai_note`）：`work_id`、`title`、`type`（固定 `fragments`）、`schema_version`（现为 2）、`schema_ref`、`coverage`（`{level, note, …}`，`level` 为 `catalog`／`toc`／`text`）、`loss_status`（存佚，如 `partially_extant`）、`statement`、`provenance`、`provenance_note`、`based_on`、`collectors`、`fragments`、`ai_note`。可选：`cited_in_summary(_note)`、`statement_note`、`collectors_note`、`collection_attested(_note)`、`other_statements`、`related_titles`、`text_condition`、`updated_at`。

**`fragments[]` 每条：**`seq`（序号）、`text`（佚文）、`text_status`（如 `recorded`）、`collected_by`、`attested_by`、`confidence`、`note` 必有；可选 `heading`、`piece_title`、`cited_in[]`、`editor_note`、`text_from`。

### 5.2 `sources/<来源>/`（抓取原件，Work 层）

抓取到的原始素材。不定强规则，只要求 `<来源>` 是来源标识（如 `ctext`、`source_text`），不与 `default`、`fragments` 等既定目录名冲突（F-SRC-01）。

### 5.3 `extra/`（版本目录下的附件）

整理本另附的文件（`juan_groups.json`、`校勘記.md`、`source/<N>册.md` 手编源等），放在该版本目录的 `extra/` 下，由该版本的整理流程自己定义，不进章目录。

---

## 六、汇总索引（生成，不手改）

### 6.1 `index/texts/{0-f}.json`

由 `build_texts_index.py --root <book-text>` 从全部 manifest 汇总。分片：对条目 id 逐字符 `h = (h*31 + ord(c)) & 0xFFFFFFFF`，取 `h % 16` 的十六进制字符。

```json
{"d59f28n8k000": [{"key": "default", "kind": "transcription", "label": "維基文庫", "chapters_total": 1}]}
```

每个条目一个数组，按 manifest 顺序列出各版本的 `key`、`kind`、`label`、`chapters_total`，有 `edition_label`、`quality`、`script` 的带上（manifest 缺哪个键，这里就缺哪个，不写 `null`）。

### 6.2 `index/fragments/{0-f}.json`

由 `build_index.py` 从全部 fragments 汇总，分片同上（按 Work id）。每个 Work 一个数组，每项 `{path, title, level, fragments_recorded, loss_status}`。

---

## 七、校验规则对照

| 规则 | 查什么 | 档 |
|---|---|---|
| F-MF-01 | manifest 与版本目录一一对应 | HARD |
| F-CE-01～06 | 整理本 index.json 必有字段、`type`、`text_quality`、`sections[]` 四键 | HARD |
| F-FT-01 | 转录本 index.json 必有字段、章文件名 | HARD |
| F-FR-01 | 辑佚 13 字段 | HARD |
| F-MD-* | md 记法（见 03 §二·5） | HARD／SOFT |
| F-OV-01～04 | original 三线版本、锚点校验字、验收记录、`*_file` 声明 | HARD |
| F-OV-05 | decision（见 08） | HARD |

校验器：overview `项目进展/古籍文本/scripts/validate_text_format.py`、`scripts/validate-collated.py`；JSON 文件另过本仓 `schemas/`。
