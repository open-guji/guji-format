/**
 * `@open-guji/markdown-web`
 *
 * 古籍 Markdown 的网页解析器：源文 → HTML。
 *
 * ```js
 * import { gujiToHtml } from '@open-guji/markdown-web'
 * import '@open-guji/markdown-web/styles/guji.css'
 *
 * gujiToHtml('《論語》曰<孔子所述>：學而時習之。')
 * ```
 *
 * 规范见仓库 `spec/` 目录。
 */

import remarkGuji from '@open-guji/markdown-core'
import type { Root as HastRoot } from 'hast'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified, type Processor } from 'unified'
import { gujiHandlers } from './handlers.js'
import { resolveHtmlOptions, type GujiHtmlOptions } from './options.js'

export { gujiHandlers } from './handlers.js'
export {
  DEFAULT_HTML_OPTIONS,
  resolveHtmlOptions,
  type GujiHtmlOptions,
  type ResolvedHtmlOptions,
  type UnknownDirectivePolicy
} from './options.js'
export { gujiCss, gujiVerticalCss, STYLE_FILES } from './styles.generated.js'
export {
  renderDocument,
  gujiToDocument,
  type DocumentOptions
} from './document.js'

/** 本包实现的规范版本。 */
export const SPEC_VERSION = '0.1.0'

/** 创建一个「古籍 Markdown → HTML」的 unified processor，便于再接自己的插件。 */
export function createGujiProcessor(options?: GujiHtmlOptions) {
  const resolved = resolveHtmlOptions(options)
  return unified()
    .use(remarkParse)
    .use(remarkGuji, resolved)
    .use(remarkRehype, {
      handlers: gujiHandlers(resolved),
      allowDangerousHtml: resolved.allowDangerousHtml
    })
    .use(rehypeStringify, { allowDangerousHtml: resolved.allowDangerousHtml })
}

/**
 * 古籍 Markdown → HTML 片段。
 *
 * 返回的是片段而不是整页，请把它放进一个带 `guji-doc` 类的容器里，
 * 并引入 `@open-guji/markdown-web/styles/guji.css`。
 */
export function gujiToHtml(source: string, options?: GujiHtmlOptions): string {
  return String(createGujiProcessor(options).processSync(source))
}

/** 古籍 Markdown → hast，供自定义后续处理。 */
export function gujiToHast(source: string, options?: GujiHtmlOptions): HastRoot {
  const resolved = resolveHtmlOptions(options)
  const processor = unified()
    .use(remarkParse)
    .use(remarkGuji, resolved)
    .use(remarkRehype, {
      handlers: gujiHandlers(resolved),
      allowDangerousHtml: resolved.allowDangerousHtml
    }) as unknown as Processor
  return processor.runSync(processor.parse(source)) as unknown as HastRoot
}
