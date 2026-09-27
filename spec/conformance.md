# 一致性测试

任何平台的实现都应通过 [`fixtures/cases.json`](./fixtures/cases.json)。
语料用 JSON 是为了让 JavaScript 之外的语言也能零依赖读取。

## 语料格式

```jsonc
{
  "version": "0.1.0",
  "cases": [
    {
      "name": "jz/basic",          // 唯一标识，用 "分组/用例" 命名
      "note": "夹注基本用法",        // 可选说明
      "guji": "子曰<孔子也>",        // 源文
      "directive": "子曰:jz[孔子也]", // 规范化结果（必测）
      "html": "<p>…</p>",          // 渲染结果，可选；省略则不测 HTML
      "options": { }               // 可选，覆盖默认选项
    }
  ]
}
```

## 实现须通过的三类断言

1. **规范化**　`normalize(guji) === directive`
2. **幂等**　`normalize(directive) === directive`
3. **渲染**　`render(guji) === html`（当用例提供了 `html`）
   —— 比较前对两侧做同样的空白归一化（去掉标签间的换行与首尾空白）。

另有一条不靠语料、靠 API 形状的要求：

4. **降级可数**（[syntax.md §0.5](./syntax.md#05-️-降级必须可数)）
   实现必须提供一条途径，让调用方数出「有几处记号因超过长度上限而被降级
   为正文」。语料里的 `*/over-limit` 各例给出了该触发降级的最小情形，
   但**「触发了几次」测不到语料里**——那是实现自己的测试要覆盖的。

## 分组

| 前缀 | 覆盖 |
| --- | --- |
| `jz/` `bz/` `sz/` `gz/` `tt/` `kg/` `zm/` `sm/` | 各记号的基本用法与边界（含 `*/over-limit` 长度上限各例） |
| `qw/` | 阙文 `[[…]]` |
| `qz/` | 缺字猜测 `□{guess=…}` |
| `table/` | 表格容器 `:::table` 的行列小语法 |
| `inert/` | 代码块、代码片段、链接目标、HTML、转义 |
| `nest/` | 嵌套与优先级 |
| `mixed/` | 综合段落 |

## 添加用例

改动语法时，先加用例、再改实现。用例应当**同时**说明"什么该匹配"
和"什么不该匹配"——反例比正例更容易回归。

## JavaScript 实现的跑法

```bash
pnpm --filter @open-guji/markdown-core test   # 断言 1、2
pnpm --filter @open-guji/markdown-web  test   # 断言 3
```
