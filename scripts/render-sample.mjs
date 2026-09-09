#!/usr/bin/env node
/**
 * 重新生成 README 里的渲染样张 docs/images/sample-render.png。
 *
 *   pnpm build && node scripts/render-sample.mjs
 *
 * 改了 packages/web/styles/*.css 之后记得跑一次，否则图片会悄悄过期。
 *
 * 需要 playwright（packages/pdf 的可选 peer 依赖）。
 * 浏览器路径可用 GUJI_CHROMIUM 覆盖，方便复用环境里已有的 Chromium。
 *
 * 还需要装了 CJK 衬线字体（样式表的字体栈首选思源宋体 / Noto Serif CJK），
 * 否则会拍到 fallback 字形，图片跟线上效果对不上：
 *   apt-get install -y fonts-noto-cjk
 */

import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 与 README「一分钟看懂」里的源文保持一致
const SOURCE = `^惟我
.太祖高皇帝，起自布衣。/朱元璋/克/金陵/，遂有天下。

《明太祖實錄》卷一<太祖，諱元璋，字國瑞>載其事[甚詳]{{未詳}}，((今))從之。`

const OUT = join(root, 'docs/images/sample-render.png')

// playwright 装在 packages/pdf 下，从那里解析。
// 它是 CJS，动态 import 后具名导出落在 default 上。
async function loadChromium() {
  let mod
  try {
    const require = createRequire(join(root, 'packages/pdf/package.json'))
    mod = await import(pathToFileURL(require.resolve('playwright')).href)
  } catch {
    throw new Error(
      '需要 playwright：\n' +
        '  pnpm --filter @open-guji/markdown-pdf add -D playwright\n' +
        '  npx playwright install chromium'
    )
  }
  const chromium = mod.chromium ?? mod.default?.chromium
  if (!chromium) throw new Error('解析到了 playwright，但没找到 chromium 导出')
  return chromium
}

async function loadWeb() {
  try {
    const require = createRequire(join(root, 'packages/web/package.json'))
    return await import(require.resolve('@open-guji/markdown-web'))
  } catch {
    throw new Error('先构建：pnpm build')
  }
}

const { gujiToHtml, gujiCss } = await loadWeb()

const page = `<!doctype html><meta charset="utf-8"><style>
${gujiCss}
html, body { margin: 0; background: transparent; }
body { padding: 28px; }
.card {
  inline-size: 640px;
  background: #fffdf8;
  border: 1px solid #e6dfd0;
  border-radius: 10px;
  padding: 30px 38px;
  box-shadow: 0 1px 3px rgba(60, 45, 20, 0.07);
}
.guji-doc { font-size: 17px; color: #241f1a; }
.guji-doc p { margin: 0 0 0.85em; }
.guji-doc p:last-child { margin-bottom: 0; }
</style>
<div class="card"><article class="guji-doc">
${gujiToHtml(SOURCE)}
</article></div>`

const chromium = await loadChromium()
const browser = await chromium.launch(
  process.env.GUJI_CHROMIUM ? { executablePath: process.env.GUJI_CHROMIUM } : {}
)

try {
  const tab = await browser.newPage({
    viewport: { width: 760, height: 400 },
    deviceScaleFactor: 2
  })
  await tab.setContent(page)
  // 等字体加载完，否则会拍到 fallback 字形
  await tab.evaluate(() => document.fonts.ready)
  const card = await tab.$('.card')
  mkdirSync(dirname(OUT), { recursive: true })
  await card.screenshot({ path: OUT, omitBackground: true })
  console.log(OUT)
} finally {
  await browser.close()
}
