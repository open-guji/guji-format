/**
 * `@open-guji/markdown-pdf`
 *
 * 古籍 Markdown 的 PDF 生成器。分两层：
 *
 * - {@link gujiToPrintHtml} —— 纯函数，源文 → 带 `@page` 规则的可打印 HTML；
 * - {@link gujiToPdf} —— 把上面的 HTML 交给 Chromium 出 PDF（需要 playwright）。
 *
 * 规范见仓库 `spec/` 目录，排版决策见本包 README。
 */

export { gujiToPrintHtml, loadPagedPolyfill } from './print-html.js'
export { gujiToPdf, checkBackend } from './pdf.js'
export { DEFAULT_PRINT_OPTIONS, type PageSize, type PrintOptions, type PdfOptions } from './options.js'
export { printCss } from './styles.generated.js'

/** 本包实现的规范版本。 */
export const SPEC_VERSION = '0.1.0'
