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

/** `:::table` 容器：整表，名字已归一为 `table`（见 spec/syntax.md §15）。 */
function isTableContainer(node: unknown): node is DirectiveLike {
  return (
    isDirective(node) && node.type === 'containerDirective' && resolveDirectiveName(node.name) === 'table'
  )
}

/** 表格里的一格：`td`（数据格）或 `th`（表头格），由 `gujiToDirective` 规范化产生。 */
function isTableCell(node: unknown): node is DirectiveLike {
  if (!isDirective(node) || node.type !== 'textDirective') return false
  const name = resolveDirectiveName(node.name)
  return name === 'td' || name === 'th'
}

interface TextLike {
  type: string
  value?: string
}

function isTextNode(node: unknown): node is TextLike & { value: string } {
  return typeof node === 'object' && node !== null && (node as TextLike).type === 'text' && typeof (node as TextLike).value === 'string'
}

/**
 * 把 `:::table` 容器的段落内容（td/th 指令与换行文本混在一起，
 * 换行保留机制同 `:::tt`，见 [ast.md §2.3](./ast.md#23-抬头的排版)）
 * 按源文换行切成"行"，每行收进一个合成的 `gujiTableRow` 节点。
 *
 * 一行里如果所有格都是续格（`^`，被上方 rowspan 占住）会一个 td/th 都不剩，
 * 这一行就从输出里消失——已知局限，见 spec/syntax.md §15「已知局限」。
 */
function groupTableChildren(blockChildren: unknown[]): unknown[] {
  const flat: unknown[] = []
  for (const block of blockChildren) {
    const inner = (block as { children?: unknown[] }).children
    if (Array.isArray(inner)) flat.push(...inner)
    else flat.push(block)
  }

  let rows: unknown[][] = [[]]
  for (const child of flat) {
    if (isTextNode(child) && child.value.includes('\n')) {
      const segments = child.value.split('\n')
      segments.forEach((segment, idx) => {
        if (idx > 0) rows.push([])
        if (segment !== '') rows[rows.length - 1].push({ type: 'text', value: segment })
      })
      continue
    }
    rows[rows.length - 1].push(child)
  }

  rows = rows.map((row) => row.filter(isTableCell)).filter((row) => row.length > 0)
  return rows.map((cells) => ({ type: 'gujiTableRow', children: cells }))
}

/** 把 `:::table` 容器从"一个大段落"重组成 `table > gujiTableRow > td/th`。 */
export function groupTableRows(tree: Root): void {
  visit(tree, (node) => {
    if (!isTableContainer(node)) return
    const container = node as unknown as { children: unknown[] }
    container.children = groupTableChildren(container.children ?? [])
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
