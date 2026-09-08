/**
 * mdast → hast：把古籍指令翻译成 HTML 元素。
 * 元素与类名的约定见 spec/ast.md §2。
 */

import { lookupDirective, parseLevel, resolveDirectiveName } from '@open-guji/markdown-core'
import type { Element, ElementContent, Properties } from 'hast'
import type { Handler, State } from 'mdast-util-to-hast'
import type { ResolvedHtmlOptions } from './options.js'

interface DirectiveNode {
  type: 'textDirective' | 'leafDirective' | 'containerDirective'
  name: string
  attributes?: Record<string, string | null | undefined> | null
}

/** state.patch / state.all 的形参类型按 mdast 收窄，指令节点要先放宽。 */
type AnyMdastNode = Parameters<State['all']>[0]

function element(
  state: State,
  node: DirectiveNode,
  tagName: string,
  properties: Properties,
  children: ElementContent[]
): Element {
  const cleaned: Properties = {}
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value === null || value === '') continue
    cleaned[key] = value
  }
  const result: Element = { type: 'element', tagName, properties: cleaned, children }
  const source = node as unknown as AnyMdastNode
  state.patch(source, result)
  return state.applyData(source, result) as Element
}

function textNode(value: string): ElementContent {
  return { type: 'text', value }
}

/** 创建 remark-rehype 的 handlers。 */
export function gujiHandlers(options: ResolvedHtmlOptions): Record<string, Handler> {
  const cls = (suffix: string): string => options.classPrefix + suffix

  const render = (state: State, node: DirectiveNode): Element | ElementContent[] => {
    const name = resolveDirectiveName(node.name)
    const attributes = node.attributes ?? {}
    const container = node.type === 'containerDirective'
    const children = state.all(node as unknown as AnyMdastNode) as ElementContent[]

    if (!lookupDirective(name)) {
      if (options.unknown === 'error') {
        throw new Error(`未注册的指令 :${node.name}（见 spec/directives.md）`)
      }
      if (options.unknown === 'children') return children
      return element(
        state,
        node,
        container ? 'div' : 'span',
        { className: [cls('unknown')], 'data-guji-directive': node.name },
        children
      )
    }

    switch (name) {
      case 'jz':
        return element(
          state,
          node,
          'span',
          { className: [cls('jz')], 'data-guji-type': attributes.type },
          children
        )

      case 'bz':
        return element(
          state,
          node,
          'ins',
          { className: [cls('bz')], 'data-guji-src': attributes.src },
          children
        )

      case 'sz':
        return element(
          state,
          node,
          'del',
          { className: [cls('sz')], 'data-guji-src': attributes.src },
          children
        )

      // 改字与补字同为 <ins>：都是定本有而底本无的字，靠 class 区分
      case 'gz':
        return element(
          state,
          node,
          'ins',
          { className: [cls('gz')], 'data-guji-src': attributes.src },
          children
        )

      case 'tt': {
        const n = parseLevel(attributes.n, options.maxLevel)
        return element(
          state,
          node,
          container ? 'div' : 'span',
          {
            className: container ? [cls('tt'), cls('tt-block')] : [cls('tt')],
            'data-guji-n': String(n)
          },
          children
        )
      }

      case 'kg': {
        const n = parseLevel(attributes.n, options.maxLevel)
        return element(
          state,
          node,
          'span',
          { className: [cls('kg')], 'data-guji-n': String(n) },
          [textNode(options.spaceChar.repeat(n))]
        )
      }

      case 'zm':
        return element(
          state,
          node,
          'span',
          { className: [cls('zm')], 'data-guji-type': attributes.type },
          children
        )

      case 'sm': {
        const mark = (value: string): ElementContent => ({
          type: 'element',
          tagName: 'span',
          properties: { className: [cls('sm-mark')] },
          children: [textNode(value)]
        })
        const content =
          options.bookTitleMarks === 'keep' ? [mark('《'), ...children, mark('》')] : children
        return element(
          state,
          node,
          'span',
          { className: [cls('sm')], 'data-guji-part': attributes.part },
          content
        )
      }

      default:
        return children
    }
  }

  const handler: Handler = (state, node) => render(state, node as DirectiveNode)

  return {
    textDirective: handler,
    leafDirective: handler,
    containerDirective: handler
  }
}
