/**
 * Chromium 排版后端。
 *
 * PDF 复用网页渲染的结果，理由见 README「为什么用浏览器排版」。
 * playwright 是可选依赖，只有真的要出 PDF 时才需要。
 */

import { gujiToPrintHtml, loadPagedPolyfill } from './print-html.js'
import { DEFAULT_PRINT_OPTIONS, type PdfOptions } from './options.js'

interface ChromiumLike {
  launch(options?: { args?: string[]; executablePath?: string }): Promise<BrowserLike>
}

interface BrowserLike {
  newPage(): Promise<PageLike>
  close(): Promise<void>
}

interface PageLike {
  setContent(html: string, options?: { waitUntil?: string; timeout?: number }): Promise<void>
  evaluate<T>(fn: string | (() => T)): Promise<T>
  emulateMedia(options: { media?: string }): Promise<void>
  pdf(options?: Record<string, unknown>): Promise<Uint8Array>
}

async function loadChromium(): Promise<ChromiumLike> {
  try {
    const mod = (await import('playwright')) as unknown as { chromium: ChromiumLike }
    return mod.chromium
  } catch {
    throw new Error(
      '生成 PDF 需要 playwright：\n' +
        '  npm i -D playwright && npx playwright install chromium\n' +
        '若只需要可打印的 HTML，请改用 gujiToPrintHtml()。'
    )
  }
}

/** 等待 Paged.js 完成分页；没有 Paged.js 时立即返回。 */
const WAIT_FOR_PAGED = `new Promise((resolve) => {
  if (!window.PagedPolyfill) return resolve('native')
  if (window.PagedPolyfill.rendered) return resolve('paged')
  window.addEventListener('pagedjs:rendered', () => resolve('paged'), { once: true })
  setTimeout(() => resolve('timeout'), 20000)
})`

/** 源文 → PDF 字节流。 */
export async function gujiToPdf(source: string, options: PdfOptions = {}): Promise<Uint8Array> {
  const o = { ...DEFAULT_PRINT_OPTIONS, timeout: 30_000, ...options }
  const html = gujiToPrintHtml(source, o)
  const chromium = await loadChromium()
  const browser = await chromium.launch({
    ...(o.executablePath ? { executablePath: o.executablePath } : {}),
    ...(o.browserArgs ? { args: o.browserArgs } : {})
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: o.timeout })
    await page.evaluate(WAIT_FOR_PAGED)
    await page.emulateMedia({ media: 'print' })
    // Paged.js 已经把内容切成了固定尺寸的页盒，此时再让 Chromium 分页会重复分页；
    // 没有 Paged.js 时则交给 Chromium 自己按 @page 规则分页。
    return await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false
    })
  } finally {
    await browser.close()
  }
}

/** 当前环境是否具备出 PDF 的条件。 */
export async function checkBackend(): Promise<{
  playwright: boolean
  pagedjs: boolean
}> {
  let playwright = false
  try {
    await import('playwright')
    playwright = true
  } catch {
    playwright = false
  }
  return { playwright, pagedjs: loadPagedPolyfill() !== undefined }
}
