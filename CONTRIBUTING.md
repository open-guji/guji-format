# 参与开发

## 环境

```bash
pnpm install
pnpm build      # 各包依次构建（web / pdf 的样式会先编译成 TS 模块）
pnpm test       # 跑一致性测试
pnpm typecheck
pnpm demo       # 生成 examples/web-demo/*.html
pnpm docs:sample # 重新生成 README 里的渲染样张
```

Node ≥ 18.18，包管理器用 pnpm。

## 改语法的顺序

语法是**规范先行**的，请按这个顺序改，别倒过来：

1. 在 [`spec/fixtures/cases.json`](./spec/fixtures/cases.json) 里加用例
   —— 正例和反例都要有，反例更能防回归；
2. 更新 [`spec/syntax.md`](./spec/syntax.md) 与 [`spec/directives.md`](./spec/directives.md)；
3. 改 `packages/core` 的规范化器，让新用例通过；
4. 若涉及输出，再改 `packages/web` / `packages/pdf` 与 [`spec/ast.md`](./spec/ast.md)；
5. 按 [`spec/README.md`](./spec/README.md#版本与兼容) 的规则决定要不要升规范版本。

三个包里的 `SPEC_VERSION` 必须与语料里的 `version` 一致，测试会检查这一点。

## 加新平台的实现

新语言的实现请放在仓库根下的同级目录（如 `swift/`、`python/`），
读取 `spec/fixtures/cases.json` 并通过
[`spec/conformance.md`](./spec/conformance.md) 列出的三类断言。
不要复制 `packages/core` 的代码——规范才是唯一真相源。

## 改样式之后

`packages/web/styles/*.css` 一动，README 里的渲染样张
（`docs/images/sample-render.png`）就可能过期，跑一次 `pnpm docs:sample` 重新生成。
这一步需要 playwright 和 CJK 衬线字体（`apt-get install -y fonts-noto-cjk`），
缺了脚本会明确报出来。

## 代码风格

* 源码与注释用中文写说明、英文写标识符；
* 注释解释"为什么"，不复述"做了什么"；
* 每个公开 API 都要有 JSDoc，并在包 README 的表格里列出。
