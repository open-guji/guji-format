# guji-cell v0.1 规范：无坐标拓扑结构与字符网格格式

> 状态：正式（v0.1）  
> Schema：[`schemas/guji_cell_v0.1.schema.json`](../schemas/guji_cell_v0.1.schema.json)  
> 适用：轻量化存储、无需图像渲染的文本校对、版本差异比对、Markdown 导出中间表示。

---

## 一、定位与设计原则

`guji-cell` 是数字化流水线的**结构拓扑层（Level 2）**：
1. **省略物理坐标，保留排版逻辑**：去除像素坐标 `[x, y, w, h]`，极大缩减数据体积，消除因图像分辨率、缩放或重裁带来的坐标变动干扰。
2. **保留物理格位与读序**：精确记录每一列的第几格，区分正文、单行小注与双行夹注分栏（左/右）。
3. **保留候选不确定性**：继承 Level 1 中的 OCR 多候选与置信度，使纯文本校对工具依然能够访问算法证据链。
4. **支持两种互转的数据视图**：
   - **模式 A（树状结构 Tree View）**：以册、页、列、格层层嵌套，便于按行列渲染布局。
   - **模式 B（扁平网格索引 Flat Map View）**：以 `<册>:<页>:<列>:<格>[子列]` 为全局键，便于随机访问与算法比对。

---

## 二、模式 A：树状结构（Hierarchical Tree View）

每个文件对应一册或一卷文本（例如 `vol03.guji-cell.json`）：

```jsonc
{
  "schema": "guji-cell/0.1",
  "book_id": "96mid1ogzk",
  "volume": 3,
  "pages": [
    {
      "page_index": 3,
      "page_label": "一",
      "columns": [
        {
          "col_index": 1,
          "raised": 0,           // 抬头（平抬）
          "lead_blank": 0,       // 挪抬空格
          "cells": [
            {
              "slot": 1,         // 格位序号（若抬头超出上框，采用负数标定，如 -1、-2）
              "char": "欽",
              "lane": "main",    // main / jz_r / jz_l / solo
              "candidates": [
                {"char": "欽", "conf": 0.96},
                {"char": "飮", "conf": 0.03}
              ],
              "review": "auto"
            },
            {
              "slot": 2,
              "char": "定",
              "lane": "main",
              "candidates": [{"char": "定", "conf": 0.99}]
            }
          ]
        },
        {
          "col_index": 4,
          "raised": 1,
          "lead_blank": 0,
          "cells": [
            {
              "slot": 1,
              "char": "讀",
              "lane": "main"
            },
            // 双行小注示例：同一 slot 占位内的左右两栏字符
            {
              "slot": 6,
              "lane": "jz_r",
              "char": "兩",
              "candidates": [{"char": "兩", "conf": 0.95}]
            },
            {
              "slot": 6,
              "lane": "jz_l",
              "char": "採",
              "candidates": [{"char": "採", "conf": 0.92}]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 三、模式 B：扁平网格索引（Flat Map View）

将整书/整卷的字符网格平铺为一个全局 Key-Value 字典：

### 1. 键格式定义（Global Cell Key）
$$\text{Key} = \text{<册>}:\text{<页>}:\text{<列>}:\text{<格>}[\text{子列}]$$
- **格位规则**：列内正常顺序从 1 开始递增；若遇**行首抬头超出上框**，格位采用**负数标定**（如 `3:3:4:-1`、`3:3:4:-2`）。
- **子列后缀规则**：
  - 正文（`main`）：无后缀，如 `3:3:1:1`
  - 单行小注（`solo`）：无后缀，如 `1:6:2:4`
  - 双行夹注右列（`jz_r`）：加后缀 `a`，如 `3:3:4:6a`
  - 双行夹注左列（`jz_l`）：加后缀 `b`，如 `3:3:4:6b`

### 2. 扁平 JSON 示例：
```jsonc
{
  "schema": "guji-cell-map/0.1",
  "book_id": "96mid1ogzk",
  "cells": {
    "3:3:1:1": {
      "char": "欽",
      "lane": "main",
      "candidates": [{"char": "欽", "conf": 0.96}, {"char": "飮", "conf": 0.03}],
      "review": "auto"
    },
    "3:3:1:2": {
      "char": "定",
      "lane": "main",
      "candidates": [{"char": "定", "conf": 0.99}]
    },
    "3:3:4:6a": {
      "char": "兩",
      "lane": "jz_r",
      "candidates": [{"char": "兩", "conf": 0.95}]
    },
    "3:3:4:6b": {
      "char": "採",
      "lane": "jz_l",
      "candidates": [{"char": "採", "conf": 0.92}]
    }
  }
}
```

---

## 四、两种视图的等价性与互转规则

1. **确定性互转**：模式 A 与模式 B 包含的信息量完全对称，两者可通过内置纯函数进行无损双向转换。
2. **读序（Reading Order）重构**：
   - 树状视图天然保持阅读顺序；
   - 扁平 Map 视图恢复阅读顺序的排序键为：
     $$\text{KeySort} = (\text{页}, \text{列}, \text{段落}, \text{格})$$
     双行夹注段落遵循：将整段连续的 `a`（右列）排在前，整段连续的 `b`（左列）排在后，最后闭合小注。
