/**
 * 源文 → 可打印 HTML。
 *
 * 这一步是纯函数、无外部依赖，浏览器里也能跑；
 * 真正生成 PDF 的排版后端只是把它喂给一个排版引擎。
 */

import { gujiToHtml, renderDocument } from '@open-guji/markdown-web'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { DEFAULT_PRINT_OPTIONS, type PrintOptions } from './options.js'
import { printCss } from './styles.generated.js'

/** 解析 `pagedjs` 的 polyfill 脚本；没装则返回 undefined。 */
export function loadPagedPolyfill(): string | undefined {
  try {
    const require = createRequire(import.meta.url)
    const entry = require.resolve('pagedjs/dist/paged.polyfill.js')
    return readFileSync(entry, 'utf8')
  } catch {
    return undefined
  }
}

function pageVariables(options: Required<Pick<PrintOptions,
  'pageSize' | 'pageMargin' | 'fontSize' | 'lineHeight'>>): string {
  return `:root {
  --guji-page-size: ${options.pageSize};
  --guji-page-margin: ${options.pageMargin};
  --guji-print-font-size: ${options.fontSize};
  --guji-print-line-height: ${options.lineHeight};
}`
}

/** 源文 → 一张带 `@page` 规则、可以直接打印的 HTML 页面。 */
export function gujiToPrintHtml(source: string, options: PrintOptions = {}): string {
  const o = { ...DEFAULT_PRINT_OPTIONS, ...options }

  const polyfill = o.paged === 'never' ? undefined : loadPagedPolyfill()
  if (o.paged === 'always' && !polyfill) {
    throw new Error(
      "paged: 'always' 需要安装 pagedjs（npm i pagedjs），或改用 paged: 'auto'。"
    )
  }

  return renderDocument(gujiToHtml(source, o), {
    ...o,
    className: [o.banks ? 'guji-banks' : '', o.className ?? ''].filter(Boolean).join(' '),
    extraCss: [pageVariables(o), printCss, o.extraCss ?? ''].filter(Boolean).join('\n'),
    extraHead: [o.extraHead ?? '', polyfill ? `<script>\n${polyfill}\n</script>` : ''].
      filter(Boolean).join('\n')
  })
}
