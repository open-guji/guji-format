# guji-page v0.1 规范：带坐标的富信息页面文本格式

> 状态：正式（v0.1）  
> Schema：[`schemas/guji_page_v0.1.schema.json`](../schemas/guji_page_v0.1.schema.json)  
> 适用：计算机视觉与 OCR 切分成果落盘、图文对照阅读、读者校对交互、富信息底本真源。

---

## 一、定位与设计原则

`guji-page` 是古籍数字化流水线的**物理真源（Level 1）**：
1. **携带尽可能多的底层信息**：包括字框坐标、文字放行置信度、OCR 多模型备选候选集、版面区域（版心、正文、天头）、界行与印章遮挡。
2. **便于读者与专家校对**：将算法决策过程中的不确定性（如多候选列表、存疑标记）透明化，供前端校对工作台展示与交互裁决。
3. **坐标对齐现代标准**：采用 IIIF Canvas 像素空间与左上原点 `[x, y, w, h]`，与 W3C Web Annotation 及现代图像浏览器无缝衔接。
4. **稳定 ID 机制**：每个字框拥有独立的不透明稳定 ID，避免重切分后 ID 漂移导致校勘记与外部深链失效。

---

## 二、顶层字段定义

每个页面独立为一个 JSON 文件（命名规范：`pNNNN.guji-page.json`）：

```jsonc
{
  "schema": "guji-page/0.1",
  "page_id": "96mid1ogzk/3/3",          // <bookId>/<册>/<页>
  "book": {
    "id": "96mid1ogzk",                 // book-index 正式 ID
    "edition": "siku-zongmu",           // 版本代号
    "title": "欽定四庫全書總目（武英殿刻本）"
  },
  "volume": {
    "index": 3,                         // IIIF 册号，从 1 起
    "cv_book": "vol03",                 // 批处理单元名
    "label": "經部四~五·易類四~五·卷四~卷五",
    "juan_range": "4-5"
  },
  "page": {
    "index": 3,                         // 扫描页序
    "label": "一",                      // 书上原刻叶次（版心页码）
    "page_type": "body"                 // body / toc / preface / colophon / blank
  },
  "image": {
    "width": 2361, "height": 3096,
    "sha256": "05a36191f084...",        // 切分时使用的底图哈希
    "path": "data_full/zongmu/vol03/3.png"
  },
  "canvas": {
    "id": "https://data.kaiyuanguji.com/iiif/96mid1ogzk/canvas/03/0003",
    "seq": "0003",
    "width": 2361, "height": 3096
  },
  "producers": {                        // 工具来源表
    "cv": {"tool": "open-guji-cv", "rev": "1332c01734", "pipeline": "keben_body_v2"},
    "manual": {"tool": "manual", "who": "校对员A"}
  },
  "text": ["欽", "定", "四", "庫", "全", "書", "總", "目", "卷", "四"],
  "norm": [
    {"i": 12, "t": "内", "why": "异体"}  // 规范层（异体->通行字）
  ],
  "zi": [
    {"i": 40, "form": "ids"}            // 组字标记：text[40] 是 "⿰句員"
  ],
  "regions": [ ... ],                   // 版面结构
  "glyphs": [ ... ],                    // 字框与识别候选
  "marks": [ ... ]                      // 印章、留白、污损
}
```

---

## 三、核心数据结构详解

### 1. 字符流（`text`）与规范层（`norm`）
- `text`：原样层字符数组。每个元素为一个字元（支持 Ext-B+ 生僻字、PUA 码位或 IDS 组字串）。阙文未定字记录为空字符串 `""`（不与原刻方框「□」混淆）。
- `norm`：稀疏记录异体字规范映射：
  ```jsonc
  {"i": 85, "t": "撰", "why": "异体"}  // 原文 text[85] 为刻本 "𢰅"
  ```

### 2. 字框与 OCR 候选（`glyphs[]`）
每个字框承载其几何定位与算法决策过程中的所有信息：

```jsonc
{
  "id": "3:1:1",                   // 统一局部物理拓扑主键 <页>:<列>:<格>[子列]
  "text": [0, 1],                  // 对应 text[0]（右开区间）
  "box": [1851, 341, 177, 134],     // IIIF Canvas 像素 [x, y, w, h]
  "col": "c1",                     // 归属列 ID
  "lane": "main",                  // 通道：main(正文) / jz_r(小注右) / jz_l(小注左) / solo(单行小注)
  "slot": 1,                       // 列内字格物理序号。注意：若遇抬头超出上框，采用负数标定（如 -1、-2）
  "char": "欽",                    // 当前放行认定的字形
  "method": "cv:match_ref",        // 定字途径：human / ocr / yolo / cv:context / cv:match_ref
  "review": "auto",                // 状态：pending(未裁) / auto(自动放行) / human(人工已裁) / disputed(存疑)

  // 【核心能力】：携带 OCR 多候选与置信度，供读者/校对交互选择
  "candidates": [
    {"char": "欽", "conf": 0.96, "src": "paddle_ocr"},
    {"char": "飮", "conf": 0.03, "src": "paddle_ocr"},
    {"char": "飲", "conf": 0.01, "src": "context"}
  ],

  "lacuna": null,                  // defect(残损/切坏) / unreadable(阙文)
  "guess": null,                   // 若为残字，人裁建议字形（如 "□{guess=春}"）
  "flags": []                      // occluded(印章遮挡) / orphan(未入列孤框)
}
```

### 3. 版面区域与列（`regions[]`）
构建版面拓扑逻辑，严格保证行读顺序：

```jsonc
{
  "id": "r1",
  "kind": "body",                  // body(正文版框) / banxin(版心) / margin(天头地脚)
  "box": [355, 352, 1662, 2438],
  "columns": [
    {
      "id": "c1",
      "n": 1,                      // 第 1 列
      "kind": "body",
      "box": [1838, 352, 179, 2438],
      "raised": 0,                 // 抬头级数（平抬格数）
      "lead_blank": 0,             // 挪抬点数（行首连续空格数）
      "runs": [                    // 本列包含的阅读片段，引用 text 下标区间
        {"lane": "main", "text": [0, 10]}
      ]
    }
  ]
}
```

### 4. 非字元素与遮挡（`marks[]`）
```jsonc
{
  "id": "m1",
  "kind": "seal",                  // seal(印章) / excluded(切坏非字) / blank(版式留白格)
  "box": [1750, 200, 220, 220],
  "occludes": ["g_01a2b3c4d5"],    // 压住的字框 ID 列表
  "text": "乾隆御覽之寶"           // 印文（可选）
}
```
