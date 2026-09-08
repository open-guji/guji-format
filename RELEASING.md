# 发布到 npm

三个包**同版本号一起发**（`@open-guji/markdown-core` / `-web` / `-pdf`）。
它们耦合紧密：`web` 与 `pdf` 依赖 `core` 的 `^` 范围，三者又都声明同一个
`SPEC_VERSION`，分开走版本只会让人对不上号。

## 0. 一次性准备

1. 有一个 npm 账号，并**开启 2FA**（发布时会要一次性验证码）。
2. 建好 `@open-guji` 作用域——在 npmjs.com 新建同名 organization，
   或者用 `npm org create open-guji`。作用域不存在时发布会报 404。
3. 确认三个名字仍未被占用：

   ```bash
   for p in core web pdf; do npm view "@open-guji/markdown-$p" version; done
   # 三次 404 才是干净的
   ```

## 1. 首次发布（本地手动）

第一次必须手动发：包还不存在，CI 的可信发布关系也就无从配置。

```bash
git switch main
git pull

pnpm install --frozen-lockfile
pnpm release:check          # 构建 + 测试 + 对产物本身做发布前自检
```

`release:check` 会真的跑一遍 `pnpm pack`，然后检查**打出来的包**而不是源码：

* 三个包版本是否一致，`SPEC_VERSION` 是否与 `spec/fixtures/cases.json` 对得上；
* `publishConfig.access` 是否为 `public`（作用域包默认私有，漏了会发布失败）；
* 产物里是否残留 `workspace:` 协议；
* `exports` 与 `bin` 指向的文件是否真在包里；
* `README.md`、`LICENSE` 是否带上了；
* 工作区是否干净、当前分支是否是发布分支。

先空跑一次确认无误：

```bash
pnpm publish -r --dry-run
```

然后正式发布：

```bash
npm login
pnpm publish -r --access public --otp=123456   # 换成你的一次性验证码
```

`pnpm publish -r` 会按依赖拓扑排序，先 `core` 再 `web`、`pdf`，
并在打包时把 `workspace:^` 换成 `^0.1.0`。

> **不要用 `npm publish`。** npm 不认识 `workspace:` 协议，
> 会把它原样写进发布出去的 `package.json`，装的人必然失败。
> 要用 npm 的话，得先 `pnpm pack` 再 `npm publish <tarball>`——
> CI 里正是这么做的，因为 `pnpm publish` 没有 `--provenance`。

发完打标签：

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 2. 验收

```bash
npm view @open-guji/markdown-web

mkdir /tmp/guji-check && cd /tmp/guji-check
npm init -y && npm pkg set type=module
npm i @open-guji/markdown-web
node -e "
  import('@open-guji/markdown-web').then(({ gujiToHtml }) =>
    console.log(gujiToHtml('《論語》曰<孔子所述>，本作[甲]{{乙}}。')))
"
```

顺带确认样式表的子路径能解析：

```bash
node -e "console.log(require.resolve('@open-guji/markdown-web/styles/guji.css'))"
```

## 3. 之后的发布（CI）

首发之后，把 `.github/workflows/release.yml` 接上就不用再手动发了。

需要在仓库里配置：

* Settings → Environments 建一个名为 `npm` 的环境（可加人工审批）；
* 该环境里加 secret `NPM_TOKEN`，值是 npm 的 **Automation** 类型令牌
  （Automation 令牌不受 2FA 拦截，适合 CI）。

流程：

```bash
# 改版本号（三个包一起）
pnpm -r --filter "./packages/*" exec npm version 0.2.0 --no-git-tag-version
pnpm install --lockfile-only

git commit -am "发布 0.2.0"
git tag v0.2.0
git push && git push origin v0.2.0     # 推标签即触发发布
```

工作流会核对标签与包版本是否一致，跑完构建、测试与自检，
再用 `pnpm pack` + `npm publish --provenance` 逐个发布，
产物带上可验证的构建出处。

想先看流程能不能跑通，去 Actions 页面手动触发一次，把 `dry-run` 留成 true。

## 4. 版本策略

| 改动 | 包版本 | 规范版本 |
| --- | --- | --- |
| 修 bug、补文档 | 补丁 | 不变 |
| 加记号、加选项，旧文档解析结果不变 | 次版本 | 次版本 |
| 改变已有输入的解析结果 | 主版本 | 主版本 |

包版本与规范版本**不必相同**，但每次改规范都要同步更新
`spec/fixtures/cases.json` 的 `version` 与三个包里的 `SPEC_VERSION`——
`release:check` 会挡住不一致的情况。

1.0 之前按 0.x 处理：次版本位承担破坏性改动。

## 5. 发错了怎么办

* **72 小时内**可以撤回：`npm unpublish @open-guji/markdown-web@0.1.0`。
  撤回后同一个版本号**不能再发**，得跳到下一个版本。
* 超过 72 小时只能标记弃用：
  `npm deprecate @open-guji/markdown-web@0.1.0 "请改用 0.1.1"`。
* 三个包发到一半失败：已经成功的那几个不会回滚。
  修好问题后用 `pnpm publish -r` 重跑即可，已发布的版本会被跳过。
