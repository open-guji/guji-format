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

/**
 * 找 `children` 里第一个含字面 `|` 的顶层文本子节点，在那里切成两半。
 * 只看顶层（不下探嵌套指令自己的子节点）——嵌套指令内部的 `|` 属于它自己
 * 的语义（如果那也是个 jz，它会在渲染它自己时再切一次），见
 * spec/syntax.md §1「分行」。转义 `\|` 在这一步已经被 CommonMark 反斜杠
 * 转义解成字面 `|`，与未转义的 `|` 不再可分——夹注内不支持"字面竖线"，
 * 这是本特性认下的唯一已知局限。
 */
function splitJzChildren(children: ElementContent[]): [ElementContent[], ElementContent[]] | undefined {
  for (let idx = 0; idx < children.length; idx++) {
    const child = children[idx]
    if (child.type !== 'text' || !child.value.includes('|')) continue
    const at = child.value.indexOf('|')
    const before = children.slice(0, idx)
    if (at > 0) before.push(textNode(child.value.slice(0, at)))
    const after = children.slice(idx + 1)
    if (at + 1 < child.value.length) after.unshift(textNode(child.value.slice(at + 1)))
    return [before, after]
  }
  return undefined
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
      case 'jz': {
        // 分行 `|`：横排默认忽略（不产生可见的换行，见 guji.css），
        // 竖排 / 原书分行主题按 `.guji-jz-break` 换行，见 spec/syntax.md §1。
        const split = splitJzChildren(children)
        const content = split
          ? [
              { type: 'element', tagName: 'span', properties: { className: [cls('jz-line')] }, children: split[0] } as Element,
              { type: 'element', tagName: 'span', properties: { className: [cls('jz-break')] }, children: [] } as Element,
              { type: 'element', tagName: 'span', properties: { className: [cls('jz-line')] }, children: split[1] } as Element
            ]
          : children
        return element(
          state,
          node,
          'span',
          { className: [cls('jz')], 'data-guji-type': attributes.type },
          content
        )
      }

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

      // 阙文／缺字猜测：默认只显示 □，label／猜测字藏在 `.guji-qw-label`／
      // `.guji-qz-guess` 里，校对模式（`.guji-doc--proofing`）切换显示哪个，
      // 见 spec/ast.md §2.6。
      case 'qw':
        return element(state, node, 'span', { className: [cls('qw')] }, [
          { type: 'element', tagName: 'span', properties: { className: [cls('qw-box')] }, children: [textNode('□')] },
          { type: 'element', tagName: 'span', properties: { className: [cls('qw-label')] }, children }
        ])

      case 'qz': {
        const guess = attributes.guess ?? ''
        return element(state, node, 'span', { className: [cls('qz')], 'data-guji-guess': guess }, [
          { type: 'element', tagName: 'span', properties: { className: [cls('qz-box')] }, children: [textNode('□')] },
          { type: 'element', tagName: 'span', properties: { className: [cls('qz-guess')] }, children: [textNode(guess)] }
        ])
      }

      // 组字：内容是 IDS（含 U+2FF0-U+2FFB 描述符）或部件方位描述文字，
      // 两种都原样显示，靠 CSS/字体自行决定能不能把 IDS 合成出字形，
      // 见 spec/syntax.md §16。
      case 'zi':
        return element(state, node, 'span', { className: [cls('zi')] }, children)

      case 'table':
        return element(state, node, 'table', { className: [cls('table')] }, children)

      case 'th':
      case 'td': {
        const properties: Properties = {}
        const colspan = Number.parseInt(attributes.colspan ?? '', 10)
        const rowspan = Number.parseInt(attributes.rowspan ?? '', 10)
        if (Number.isFinite(colspan) && colspan > 1) properties.colSpan = colspan
        if (Number.isFinite(rowspan) && rowspan > 1) properties.rowSpan = rowspan
        return element(state, node, name, properties, children)
      }

      default:
        return children
    }
  }

  const handler: Handler = (state, node) => render(state, node as DirectiveNode)

  /** `:::table` 规范化产生的合成行节点（不是指令），见 transform.ts groupTableRows。 */
  const tableRowHandler: Handler = (state, node) => {
    const children = state.all(node as unknown as AnyMdastNode) as ElementContent[]
    const result: Element = { type: 'element', tagName: 'tr', properties: {}, children }
    state.patch(node as unknown as AnyMdastNode, result)
    return state.applyData(node as unknown as AnyMdastNode, result) as Element
  }

  return {
    textDirective: handler,
    leafDirective: handler,
    containerDirective: handler,
    gujiTableRow: tableRowHandler
  }
}
