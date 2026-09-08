/** 开箱即用的解析入口。 */

import type { Root } from 'mdast'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified, type Processor } from 'unified'
import { resolveOptions, type GujiOptions } from './options.js'
import remarkGuji from './plugin.js'

/** 创建一个「古籍 Markdown → mdast」的 processor。 */
export function gujiProcessor(options?: GujiOptions): Processor<Root> {
  return unified().use(remarkParse).use(remarkGuji, options) as unknown as Processor<Root>
}

/** 古籍 Markdown → mdast（已完成指令名归一与抬头行作用域归并）。 */
export function parseGuji(source: string, options?: GujiOptions): Root {
  const processor = gujiProcessor(options)
  return processor.runSync(processor.parse(source)) as unknown as Root
}

/** mdast → Directive Markdown，供格式化与调试使用。 */
export function formatDirective(tree: Root, options?: GujiOptions): string {
  const settings = resolveOptions({ ...options, shorthand: false })
  const processor = unified()
    .use(remarkStringify)
    .use(remarkGuji, settings) as unknown as Processor<Root>
  return String(processor.stringify(tree))
}
