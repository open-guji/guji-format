/**
 * mdast 层的两个变换：指令名归一、抬头的行作用域归并。
 * 规范见 spec/ast.md §1。
 */

import type { Nodes, Root } from 'mdast'
import { visit } from 'unist-util-visit'
import { resolveDirectiveName } from './directives.js'

const DIRECTIVE_TYPES = new Set(['textDirective', 'leafDirective', 'containerDirective'])

/**
 * 指令节点的结构性视图。这里刻意不复用 mdast 的 `Parent`：
 * `children` 在 mdast 里按父节点种类收窄，而本文件的搬运是跨种类的。
 */
interface DirectiveLike {
  type: string
  name: string
  attributes?: Record<string, string | null | undefined> | null
  children?: unknown[]
}

function isDirective(node: unknown): node is DirectiveLike {
  return (
    typeof node === 'object' &&
    node !== null &&
    DIRECTIVE_TYPES.has((node as { type?: string }).type ?? '')
  )
}

/** 把别名（`note`、`add` …）改写为规范名（`jz`、`bz` …）。 */
export function normalizeDirectiveNames(tree: Root): void {
  visit(tree, (node) => {
    if (isDirective(node)) node.name = resolveDirectiveName(node.name)
  })
}

/** `:tt{n}` 空标记：无 label 的抬头行内指令。 */
function isTaitouMarker(node: unknown): node is DirectiveLike {
  return (
    isDirective(node) &&
    node.type === 'textDirective' &&
    resolveDirectiveName(node.name) === 'tt' &&
    (!node.children || node.children.length === 0)
  )
}

/**
 * 把 `:tt{n}` 之后、直到本行结束（下一个 `break`、文本中的换行，
 * 或父节点结束）的兄弟节点，移入该指令的 children。
 *
 * 变换后 `tt` 与其他行内指令形态一致，渲染器只需处理一种情况。
 */
export function applyLineScope(tree: Root): void {
  visit(tree, (node) => {
    if (!('children' in node) || !Array.isArray(node.children)) return
    const children = node.children as Nodes[]
    if (!children.some(isTaitouMarker)) return
    ;(node as unknown as { children: unknown[] }).children = scopeChildren(children)
  })
}

function scopeChildren(children: Nodes[]): Nodes[] {
  const out: Nodes[] = []

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (!isTaitouMarker(child)) {
      out.push(child)
      continue
    }

    const collected: Nodes[] = []
    let j = i + 1
    for (; j < children.length; j++) {
      const next = children[j]
      if (next.type === 'break') break
      if (next.type === 'text' && next.value.includes('\n')) {
        const at = next.value.indexOf('\n')
        if (at > 0) collected.push({ type: 'text', value: next.value.slice(0, at) })
        children[j] = { type: 'text', value: next.value.slice(at) }
        break
      }
      collected.push(next)
    }

    ;(child as unknown as DirectiveLike).children = collected
    out.push(child as unknown as Nodes)
    i = j - 1
  }

  return out
}
