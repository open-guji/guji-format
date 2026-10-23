# guji-fig v0.1 规范：图表（`NNN.fig.json`）

> 状态：正式（v0.1，2026-10-23 Sheldon 评审通过，GUJI-737／GUJI-738）
> 格式标识：`https://open-guji.org/schema/fig/v0.1.json`
> Schema：[`schemas/guji_fig_v0.1.schema.json`](../schemas/guji_fig_v0.1.schema.json)
> 适用：book-text `original` 每章一份，**只有用到图的章才有**，真源，存 main。总表见 [00](./00-总览.md)。
> 设计来龙去脉：book-text `docs/design/2026-10-图片格与插图设计.md`。

---

## 一、定位

古籍里有两类「不是字、但要显示」的东西，统称**图**：

| 类 | 是什么 | char 里怎么记 | cord 里怎么记 |
|---|---|---|---|
| **图片格**（`kind: inline`） | 在正文字流里占一格（偶尔连几格）的图形，Unicode 没有对应字。例：殿本《總目》册 5 第 148 叶「圖作▢形」 | 格上加 `fig`，`c` 写 `□`，见 [02 §4.7](./02-guji-char.md) | 照旧在 `cells[]` |
| **插图块**（`kind: block`） | 占若干列、半页或整页的插图、图表、卦图、地图；正文在这里断开 | `columns[]` 里一项 `kind: figure` 的图列，见 [02 §4.7](./02-guji-char.md) | `marks[]` 一项 `kind: figure`，见 [01 §3.6](./01-guji-cord.md) |

fig.json 记每张图的来源、说明与文件；char 只记「哪一格／哪一列是图、是哪张图」。

**不归本格式管的**：

- 有 Unicode 码位的符号（○◎●□△╳⊙ 等）照常定成字，写在 char 的 `c`。
- Unicode 没收、但是汉字的字照旧 `c` 写近似字＋`zi` 记原形。
- 印章（后来钤的，不属正文）照旧是 cord `marks` 的 `seal`，第一版阅读器不显示。

## 二、文件结构

```json
{
  "$schema": "https://open-guji.org/schema/fig/v0.1.json",
  "book_id": "96mid1ogzk",
  "volume": 5,
  "figures": [
    {
      "id": "f148-2-14",
      "kind": "inline",
      "page": 148,
      "box": [1648, 1873, 116, 44],
      "alt": "左半圈连一实点",
      "file": "fig/005/f148-2-14.png",
      "sha256": "f5c4d3f1a0e0b5f2a3c1d9b7e8f60123456789abcdef0123456789abcdef0123",
      "mime": "image/png",
      "width": 120,
      "height": 48,
      "source": "crop",
      "by": "cv:export"
    }
  ]
}
```

## 三、字段

### 3.1 顶层

| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `$schema` | string | 是 | `https://open-guji.org/schema/fig/v0.1.json` |
| `book_id` | string | 是 | 与同章 char 一致 |
| `volume` | integer ≥1 | 是 | 与同章 char 一致 |
| `figures` | array | 是 | 每张图一项，见 3.2 |

不许有别的字段。

### 3.2 图（`figures[]`）

| 字段 | 类型 | 必填 | 含义 | 取值 |
|---|---|---|---|---|
| `id` | string | 是 | 图 id，章内唯一 | `[a-z0-9][a-z0-9-]*`；建议图片格写 `f<页>-<列>-<格>`、插图块写 `p<页>-fig<n>`。**不跟格位变**：重切后格号变了，id 照旧，只改 char 里引用它的格 |
| `kind` | string | 是 | 类别 | `inline` 图片格／`block` 插图块 |
| `page` | integer ≥1 | 是 | 所在页（扫描顺序号） | 与格位 key 的「页」同一数法 |
| `box` | box | 是 | 原图像素框 `[x, y, w, h]` | 图片格等于 cord 该格的 `box`；插图块等于 cord `marks.figure` 的 `box`；图片格连占几格时取几格的外包框 |
| `alt` | string | 是 | 说明文字；悬停、读屏、复制都用它 | 非空。人定是图时没写说明的，导出写「图形符号」 |
| `file` | string | 是 | 图片文件，相对版本目录 | `fig/<NNN>/<id>.<png\|webp\|svg>` |
| `sha256` | string | 是 | 文件的 SHA-256 | 64 位小写十六进制 |
| `mime` | string | 是 | 文件类型 | `image/png`／`image/webp`／`image/svg+xml`，要和扩展名一致 |
| `width`、`height` | number >0 | 是 | 像素图写像素；SVG 写 viewBox 宽高 | |
| `source` | string | 是 | 来源 | `crop` 从书影裁出（只许 png、webp）／`redraw` 人工重绘 |
| `by` | string | 否 | 谁做的 | `cv:export`、`human:<名字>` |
| `note` | string | 否 | 备注 | |

不许有别的字段。

## 四、图片文件

- 路径：`<版本目录>/fig/<NNN>/<id>.<扩展名>`，真源，存 main，和文本一起走 PR、一起发布（Sheldon 2026-10-23 定）。
- **裁图**（`source: crop`）：cv 导出时从 R2 页图全分辨率（cord 该页 `image.sha256`）按 `box` 外扩 2 像素裁出。图片格存 PNG；插图块存 WebP（有损 q90）。不做去底、二值化，保持书影原貌，读者端按主题调色。
- **重绘**（`source: redraw`）：SVG。只许图形元素（`path`、`circle`、`rect`、`line`、`polyline`、`polygon`、`ellipse`、`g`），不许 `script`、`foreignObject`、`image`、外链；颜色写 `currentColor`，跟正文同色。
- 单个文件 ≤ 1 MB；超过的插图块先降到长边 2000 像素。
- 授权：随条目 `original` 版本（CC0）。书影是公有领域，裁图同；重绘图入库即以 CC0 发布。

## 五、版本

fig **不跟踪内容版本**（与 cord、norm 一样）：换图（裁图换成重绘、重裁）不升任何线。
「哪一格、哪一列是图」记在 char 里，改它照 char 走，升文本线（[00 §三](./00-总览.md)）。

cv 再次导出时，**保留**已有的 `source: redraw` 条目，不用裁图覆盖。

## 六、与其他文件的关系

| 文件 | 关系 |
|---|---|
| char | 格的 `fig`、图列的 `fig` 引用本文件的 `id`；本文件每张图都要被引用（不留孤图） |
| cord | 图片格：`box` 等于 cord 该格的框；插图块：等于 cord `marks.figure`（同 `fig`）的框 |
| norm | 图片格不许出现在 norm 里（图没有通行字） |
| punct、entity、decision | 照常锚格位；图片格的校验字是 `□` |
| lines.md、rich.md | 图片格写 `:tu[说明]{id=…}`，图列写一行 `::tu[说明]{id=…}`，见 [03 §三](./03-guji-markdown.md) |
| index.json | 章条目用 `fig_file` 声明（[07 §3.3](./07-book-text-条目布局.md)）；char 里有图就必须声明 |

## 七、校验

由 book-text `validate_text_format.py` F-OV-13 执行：

1. 章条目声明了 `fig_file` 就必须存在；char 里有 `fig` 或图列就必须声明 `fig_file`。
2. char 每个 `fig`、cord 每个 `marks.figure.fig` 在本文件里有；本文件每张图都被引用；`kind` 与引用方一致（格 → `inline`，图列 → `block`）。
3. 图片格 `c` 为 `□`，不带 `lacuna`／`guess`／`guess_c`／`zi`；图列 `cells` 为空（schema 强制）。
4. `file` 存在，`sha256` 对得上，≤ 1 MB；SVG 不含脚本、外链、内嵌位图。
5. `page`、`box` 与 cord 一致。
6. norm 里没有图片格。
