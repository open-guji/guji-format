# guji-markdown v0.2 规范：古籍 Markdown 全文格式

> 状态：正式（v0.2；2026-10-09 按 book-text 实际补写 lines.md／rich.md 的生成规则，overview#497）
> 适用：book-text 的章文件 `NNN.md`（转录本、整理本）；`original` 生成的 `NNN.lines.md`、`NNN.rich.md`；网页渲染、排版引擎。
> 记法的逐条语法见 [syntax.md](./syntax.md)；中间表示见 [directives.md](./directives.md)；HTML 输出见 [ast.md](./ast.md)。总表见 [00](./00-总览.md)。

---

## 一、定位

`guji-markdown` 用一组贴近 CommonMark 的短记号，把古籍特有的排版现象写进纯文本：

| 现象 | 记号 | 语法 |
|---|---|---|
| 双行夹注 | `<右列\|左列>`，不分行时 `<注文>` | [syntax §1](./syntax.md) |
| 单行小注 | `:jz[注文]{type=单行}` | [syntax §1](./syntax.md)、[directives](./directives.md) |
| 校勘：补字／删字／改字 | `((甲))`／`{{乙}}`／`[甲]{{乙}}` | [syntax §2–5](./syntax.md) |
| 抬头（平抬） | 行首 `^`，可叠 `^^` | [syntax §6](./syntax.md) |
| 空格（挪抬） | 行首 `.`，可叠 `..` | [syntax §7](./syntax.md) |
| 专名号 | `/人名/` | [syntax §8](./syntax.md) |
| 书名号 | `《書名》` | [syntax §9](./syntax.md) |
| 阙文 | `[[]]`（未知字数）、`[[□□]]` | [syntax §13](./syntax.md) |
| 残字推测 | `□{guess=字}` | [syntax §14](./syntax.md) |
| 表格 | `:::table` 容器 | [syntax §15](./syntax.md) |
| 组字 | `:zi[IDS 或描述]` | [syntax §16](./syntax.md) |
| 页码 | 独占一行的 `<!-- pN -->`（HTML 注释，渲染时不显示） | 本篇 §二·3 |

book-text 里有三种用到它的文件：

| 文件 | 性质 | 本篇 |
|---|---|---|
| 转录本、整理本的 `NNN.md` | 真源，存 main | §二 |
| original 的 `NNN.lines.md` | 由 char 生成，存 derived | §三 |
| original 的 `NNN.rich.md` | 由 char＋punct＋entity 生成，存 derived | §四 |

---

## 二、章文件 `NNN.md`（转录本、整理本）

### 2.1 文件

- 一章一个文件，文件名 `NNN.md`，`NNN` 是三位章号（`001`、`002`…），与版本 `index.json` 的 `chapters[].file` 一致（见 [07 §三](./07-book-text-条目布局.md)）。
- UTF-8，无 BOM，换行 `\n`，末尾带换行。
- 第一行一般是本章标题（`## 第07回`、`# 經部七·孝經類`）。
- 版本 `index.json` 写 `"guji_markdown": "0.2.0"` 的，表示本版本的 md 按本规范 v0.2 写（含表格、组字等 0.2 新记法）；没写的，渲染器按 v0.2 宽松解析。

### 2.2 两种排法

| 排法 | 怎么认 | 规则 |
|---|---|---|
| **一列一行**（忠实底本） | 版本 `index.json` 有 `"line_is_column": true`（Kanripo、CBETA 来源） | md 的一行＝底本的一列；页码另存 `pages.tsv`（见 07 §四·3），md 里不插页码 |
| **自然段**（默认） | 没有 `line_is_column` | 一个自然段一行，段与段之间空一行；整理本的条目可以用 `**粗体**` 作条目标题 |

### 2.3 页码

- 页码写成独占一行的 `<!-- pN -->`（`N` 是页号或叶码），渲染时不显示，用于和书影对照。鼓励使用，不强制。
- 一列一行的版本页码不进 md，记在 `pages.tsv`。

### 2.4 整理者的话

书志头、校勘按语、出版说明、整理后记这类**整理者**写的话，写成 `<!-- … -->` 注释，不进正文。原书作者、注家的话才进正文。

### 2.5 book-text 新入库的硬规则

（来源：overview `项目进展/古籍文本/整体设计/2026-09-book-text格式规范.md`，校验器 `validate_text_format.py` 同号规则。）

| 规则 | 内容 |
|---|---|
| F-MD-01 | 夹注用 `<…>`。存量允许千頃堂書目（`d59f2mel8d1c`）的 `⟨…⟩`、宋史藝文志（`d59f2gdp696q`）的 `（（…））`，随下次改版逐本转，不批量转 |
| F-MD-02 | `〔…〕` 只用于校勘记、考证按语、著录出处，不作夹注 |
| F-MD-03 | 括注、夹注同行闭合 |
| F-MD-07 | 同一份 md 里标题层级不跳级 |
| F-MD-09 | `:::table` 容器块合法 |
| — | 组字式（`[口*恒]`、`{宀兒}` 等 CBETA／维基组字式）一律保留原样，不批量换成 `□` |

---

## 三、`NNN.lines.md`：一列一行的分行稿（由 char 生成）

**生成器**：overview `scripts/book-text/original_char.py::render_lines`（与 cv `guji_char_cord.char_to_lines_md` 逐字相同）。**不手改。**

规则：

1. 按 char 的 `pages[]` 顺序，每页先出一行 `<!-- p<page> -->`（`page` 是扫描顺序号）。
2. 该页每个**有字的列**出一行；`cells` 为空的列不出行。
3. 每行行首：`raised` 个 `^`，再 `lead_blank` 个 `.`。
4. 行内按 `cells` 读序分段：
   - 正文（`main`）格：直接写字；
   - 单行小注（`solo`）连续的一段：`:jz[…]{type=单行}`；
   - 双行夹注连续的一段（先 a 后 b）：两列都有字写 `<a 列的字|b 列的字>`（保留 `|`）；只有一列有字的，按单行小注写 `:jz[字]{type=单行}`。
5. 每格的写法：`lacuna: true` 写 `[[]]`（在单行小注里写 `□`）；有 `zi` 写 `:zi[zi 的值]`（`c` 是近似字时，生成器可选在字后附 `{ids=zi 的值}`；缺省不输出，解析端暂不识别该后缀，下游需先剥掉）；`guess: true` 写 `□{guess=c}`；其余写 `c`。
6. 全文末尾一个换行。

```markdown
<!-- p3 -->
欽定四庫全書總目卷四
^易類四
^讀易私言一卷<兩江總督|採進本>
..元許衡撰衡字平仲河內人
```

---

## 四、`NNN.rich.md`：带标点、专名的阅读稿（由 char＋punct＋entity 生成）

**生成器**：overview `scripts/book-text/original_char.py::render_rich`（口径同 cv `siku_extract.assemble_volume`）。**不手改。**标点层有条目缺 `anchor`，或 punct／entity 的校验字与 char 对不上时，该章不出 rich。

规则：

1. 字流按 char 读序（见 [00 §四·2](./00-总览.md)）。版面不保留：不分列、不出 `^`、`.`。
2. 页码：每页第一个有字的列前出 `<!-- p<page> -->`（没有字的页不出）。
3. 夹注：一段双行夹注写 `<a 列的字|b 列的字>`（保留 `|`，与 §三·4 一致）；前一段夹注和后一段夹注紧接、中间没有分段的，合成一条。单行小注写 `:jz[…]{type=单行}`。
4. 标点：按 [04](./04-guji-punct.md) 注入。同一字上的先后：`before` 在前（`「` 在 `《` 前），然后是字，然后 `after`（`》` 最先），分段符最后。
5. 分段：`kind: break` 的标点在该字之后结束自然段，输出空行（`\n\n`）。
6. 专名（[05](./05-guji-entity.md)）：
   - `work` 实体写书名号：`《書名》`；`target.status` 为 `matched` 且有 `href` 的写 `《[書名](href)》`。与该实体同起止的 punct《》不再重复出。
   - 其他类型写专名号：`/人名/`；matched 且有 `href` 的写 `[/人名/](href)`。
   - **相邻专名用指令式**（2026-10-09 定，overview#497）：两个或多个非 `work` 专名在字流里紧挨着、中间没有任何字或标点时，这一串里的**每一个**都写成指令 `:zm[甲]`，带链接的写 `[:zm[甲]](href)`。例：`從:zm[馬融]:zm[鄭元]:zm[虞翻][:zm[陸績]](book-index://Entity/…)本`。原因：`/甲//乙/` 这种连写，guji-markdown 解析器认不出。单个专名照旧写 `/甲/`；书名有《》隔开，不受影响。
   - 跨页的专名、书名：页码注释落在专名号、书名号里面，如 `[/國史院編<!-- p126 -->修/](…)`；解析器照认，渲染时不显示注释。
7. 规范层（norm）暂不套用：rich 保持 char 原字。
8. 全文末尾一个换行。

```markdown
<!-- p3 -->欽定四庫全書總目卷四

易類四

《[讀易私言](book-index://Work/d59f2gohhgxu)》一卷<兩江總督採進本>

/元/[/許衡/](book-index://Entity/…)撰。衡字平仲，/河內/人。
```

---

## 五、字形三维度

同一份文本可以派生三种字形：

1. **原刻（`original`）**：保留底本原字，含异体、避讳缺笔、俗体、组字、阙文。char 与 lines、rich 都是这一种。
2. **通行繁体（`traditional`）**：按 [norm](./06-guji-norm.md) 把异体换成通行繁体（`𢰅`→`撰`）。由前端按需替换，book-text 不另存。
3. **现代简体（`simplified`）**：经 OpenCC（`t2cn`）转换；专名号、书名号保持。由前端转换，不另存。
