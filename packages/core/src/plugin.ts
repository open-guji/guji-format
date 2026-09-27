/**
 * remark 插件：一次性接上古籍扩展。
 *
 * ```js
 * unified().use(remarkParse).use(remarkGuji).use(remarkRehype)
 * ```
 *
 * 插件做三件事：
 * 1. 注册 directive 的 micromark / mdast 扩展（不必再单独 use remark-directive）；
 * 2. 包裹 parser，在解析前把短记号规范化为指令；
 * 3. 解析后归一指令名、并做抬头的行作用域归并。
 */

import type { Root } from 'mdast'
import { directiveFromMarkdown, directiveToMarkdown } from 'mdast-util-directive'
import { directive } from 'micromark-extension-directive'
import type { Plugin, Processor } from 'unified'
import { gujiToDirective } from './normalize.js'
import { resolveOptions, type GujiOptions } from './options.js'
import { applyLineScope, groupTableRows, normalizeDirectiveNames } from './transform.js'

/** 同一个 processor 上避免重复注册 directive 扩展。 */
const installed = new WeakSet<object>()

const remarkGuji: Plugin<[GujiOptions?], Root> = function remarkGuji(options) {
  const settings = resolveOptions(options)
  const self = this as unknown as Processor
  const data = self.data()

  if (!installed.has(self as unknown as object)) {
    installed.add(self as unknown as object)
    const micromarkExtensions = data.micromarkExtensions ?? (data.micromarkExtensions = [])
    const fromMarkdownExtensions =
      data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = [])
    const toMarkdownExtensions = data.toMarkdownExtensions ?? (data.toMarkdownExtensions = [])
    micromarkExtensions.push(directive())
    fromMarkdownExtensions.push(directiveFromMarkdown())
    toMarkdownExtensions.push(directiveToMarkdown())
  }

  if (settings.shorthand) {
    const parser = self.parser
    if (typeof parser !== 'function') {
      throw new Error(
        'remark-guji: 需要先注册 remark-parse，例如 unified().use(remarkParse).use(remarkGuji)。' +
          '若只做序列化，请传 { shorthand: false }。'
      )
    }
    self.parser = (document, file) => parser(gujiToDirective(String(document), settings), file)
  }

  return (tree: Root) => {
    if (settings.normalizeNames) normalizeDirectiveNames(tree)
    if (settings.lineScope) applyLineScope(tree)
    if (settings.tableRows) groupTableRows(tree)
  }
}

export default remarkGuji
