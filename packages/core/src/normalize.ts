/**
 * 规范化器：古籍 Markdown 短记号 → Directive Markdown。
 *
 * 规范见 spec/syntax.md 与 spec/directives.md。三条硬性保证：
 *
 * 1. 逐行处理，输出行数与行序不变；
 * 2. 幂等：`normalize(normalize(x)) === normalize(x)`；
 * 3. 不生效区（代码块、代码片段、链接目标、HTML、转义）逐字保留。
 */

import {
  resolveSyntaxOptions,
  type GujiSyntaxOptions,
  type OverflowEvent,
  type ResolvedSyntaxOptions,
  type SpanMarkName
} from './options.js'

/** 掩码串中代表「此字符不参与记号识别」的哨兵。 */
const NUL = '\u0000'

const ASCII_PUNCT = new Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")

/** CJK 统一表意文字（含扩展 A、兼容区，以及代理对表示的扩展 B 以上）。 */
const CJK_RE = /[㐀-䶿一-鿿豈-﫿]|[\ud840-\ud8ff][\udc00-\udfff]/

/** 原始 HTML 标签、注释、声明、自动链接、邮件自动链接。 */
const RAW_ANGLE_RE =
  /^<(?:!--[\s\S]*?--|![A-Za-z][^<>]*|\?[^<>]*\?|\/[A-Za-z][A-Za-z0-9-]*[ \t]*|[A-Za-z][A-Za-z0-9-]*(?:[ \t][^<>]*?)?\/?|[A-Za-z][A-Za-z0-9+.-]*:[^<>\s]*|[^\s<>@]+@[^\s<>@]+)>/

/** 行首块结构前缀：缩进、块引用、列表标记、ATX 标题标记。 */
const BLOCK_PREFIX_RE = /^([ \t]*(?:>[ \t]?)*[ \t]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+|#{1,6}[ \t]+)?[ \t]*)/

/** `:::table` 容器块的开闭行（见 spec/syntax.md §15）。 */
const TABLE_OPEN_RE = /^ {0,3}:::table(?:\{[^\n]*\})?[ \t]*$/
const TABLE_CLOSE_RE = /^ {0,3}:::[ \t]*$/

/** `□{guess=…}`：只认紧接在 □ 后面的、不含空白与花括号的取值。 */
const QZ_GUESS_RE = /^\{guess=([^\s{}]+)\}/

/**
 * `render_notation()` 单元格结尾后缀：可选 `{colspan}` 再可选 `^rowspan`；
 * 裸续格标记 `^`（无数字）落进 body 分支，colspan 按默认值 1 处理——
 * 与 book-text `validate_text_format.py` 的 `_TABLE_TOKEN_SUFFIX_RE`
 * 同一条正则、同一个语义（T22，见 2026-09-表格记法方案.md §二）。
 */
const TABLE_CELL_SUFFIX_RE = /^(.*?)(?:\{(\d+)\})?(?:\^(\d+))?$/

interface Fence {
  char: string
  len: number
}

/**
 * 一行的扫描上下文：用来把超限事件定位回源文，并把它报出去。
 *
 * `colBase` 是本次扫描的 `src` 在原行中的起始列（0 起）——行首的块结构前缀
 * 与抬头／空格标记会先被剥掉，剥掉多少就记在这里，否则报出的列号是错的。
 */
interface ScanContext {
  line: number
  colBase: number
  onOverflow?: (event: OverflowEvent) => void
}

/**
 * 记一次「因超长而被降级为普通文本」。
 *
 * 这是长度上限唯一的可观测出口：spec §0.3 规定未闭合不报错，
 * 所以降级本身必须是静默的——但**降级发生了几次不能也是静默的**。
 */
function reportOverflow(
  ctx: ScanContext,
  mark: SpanMarkName,
  src: string,
  open: number,
  from: number,
  to: number,
  limit: number
): void {
  if (!ctx.onOverflow) return
  const content = src.slice(from, to)
  ctx.onOverflow({
    mark,
    line: ctx.line,
    // 报起始记号本身的位置，不是内容起点——这样才指得回源文
    column: ctx.colBase + open + 1,
    length: content.length,
    limit,
    preview: content.slice(0, 40)
  })
}

function isAsciiAlnum(c: string | undefined): boolean {
  if (c === undefined) return false
  return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

function isSpace(c: string | undefined): boolean {
  return c !== undefined && /\s/.test(c)
}

function hasCjk(s: string): boolean {
  return CJK_RE.test(s)
}

function matchFence(line: string): (Fence & { info: string }) | undefined {
  const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
  if (!m) return undefined
  const info = m[2]
  // 反引号围栏的 info string 不得含反引号
  if (m[1][0] === '`' && info.includes('`')) return undefined
  return { char: m[1][0], len: m[1].length, info: info.trim() }
}

/** 去掉块引用标记后，剩余内容的缩进量（tab 记 4）。 */
function contentIndent(line: string): number {
  const rest = line.replace(/^(?:[ \t]*(?:>[ \t]?)+)/, '')
  let n = 0
  for (const c of rest) {
    if (c === ' ') n += 1
    else if (c === '\t') n += 4
    else break
  }
  return n
}

/**
 * 构造与 `s` 等长的掩码串：不生效区的字符置为 NUL。
 * 之后所有记号匹配都在掩码串上做、输出时取原串，索引天然对齐。
 */
export function buildMask(s: string): string {
  const mask = s.split('')
  const blank = (from: number, to: number): void => {
    for (let k = from; k < to; k++) mask[k] = NUL
  }

  let i = 0
  while (i < s.length) {
    const c = s[i]

    // 反斜杠转义
    if (c === '\\' && i + 1 < s.length && ASCII_PUNCT.has(s[i + 1])) {
      blank(i, i + 2)
      i += 2
      continue
    }

    // 代码片段：等长反引号串配对
    if (c === '`') {
      let n = 0
      while (s[i + n] === '`') n++
      let j = i + n
      let close = -1
      while (j < s.length) {
        if (s[j] === '`') {
          let m = 0
          while (s[j + m] === '`') m++
          if (m === n) {
            close = j
            break
          }
          j += m
        } else {
          j++
        }
      }
      if (close >= 0) {
        blank(i, close + n)
        i = close + n
      } else {
        blank(i, i + n)
        i += n
      }
      continue
    }

    // 原始 HTML / 自动链接
    if (c === '<') {
      const m = RAW_ANGLE_RE.exec(s.slice(i))
      if (m) {
        blank(i, i + m[0].length)
        i += m[0].length
        continue
      }
    }

    // 行内链接 / 图片的目标部分：`](` … `)`
    if (c === '(' && i > 0 && s[i - 1] === ']') {
      let depth = 1
      let j = i + 1
      while (j < s.length && depth > 0) {
        const d = s[j]
        if (d === '\\') j++
        else if (d === '(') depth++
        else if (d === ')') depth--
        j++
      }
      if (depth === 0) {
        blank(i, j)
        i = j
        continue
      }
    }

    i++
  }

  return mask.join('')
}

function canOpenJz(mask: string, i: number, end: number): boolean {
  if (i + 1 >= end) return false
  const next = mask[i + 1]
  if (next === undefined || next === NUL) return false
  // 避开 HTML 标签、闭合标签、注释/声明、自动链接、空夹注
  return !/[A-Za-z/!?>\s]/.test(next)
}

/**
 * 改字 `[…]` 的起始条件。方括号在 Markdown 里用得很多，
 * 这里逐项排除：指令 label（`:jz[`）、图片（`![`）、引用式链接（`][`）、
 * 脚注（`[^`）、任务列表（`[ ]`）、以及预留给阙文的 `[[…]]`。
 */
function canOpenGz(src: string, mask: string, i: number, end: number): boolean {
  const prev = i > 0 ? src[i - 1] : undefined
  if (prev !== undefined && (isAsciiAlnum(prev) || prev === '!' || prev === '[' || prev === ']')) {
    return false
  }
  if (i + 1 >= end) return false
  const next = mask[i + 1]
  if (next === undefined || next === NUL) return false
  return !isSpace(next) && next !== ']' && next !== '[' && next !== '^'
}

/**
 * 改字的结束条件：内容不得含 `[`，且结束的 `]` 之后不能是
 * `(`（行内链接）、`[`（引用式链接）或 `:`（链接定义）。
 */
function findGzClose(
  src: string,
  mask: string,
  from: number,
  end: number,
  o: ResolvedSyntaxOptions,
  ctx: ScanContext
): number {
  let i = from
  // 先不管长度找配对，找到之后再判长度——否则「超限」与「本来就没有配对」
  // 会混成同一个 -1，降级就数不出来了。
  while (i < end) {
    if (mask[i] === NUL) {
      i++
      continue
    }
    if (mask[i] === '[') return -1
    if (mask[i] !== ']') {
      i++
      continue
    }
    const prev = src[i - 1]
    const next = src[i + 1]
    if (isSpace(prev)) return -1
    if (next === '(' || next === '[' || next === ':') return -1
    const content = src.slice(from, i)
    if (content.length === 0) return -1
    if (o.gzRequireCjk && !hasCjk(content)) return -1
    const limit = o.maxSpanLength.gz
    if (content.length > limit) {
      reportOverflow(ctx, 'gz', src, from - 1, from, i, limit)
      return -1
    }
    return i
  }
  return -1
}

function canOpenZm(src: string, mask: string, i: number, end: number): boolean {
  const prev = i > 0 ? src[i - 1] : undefined
  if (prev !== undefined && (isAsciiAlnum(prev) || prev === ':' || prev === '/')) return false
  if (i + 1 >= end) return false
  const next = mask[i + 1]
  if (next === undefined || next === NUL) return false
  return !isSpace(next) && next !== '/'
}

/** 找配对的结束记号，支持同类嵌套；找不到返回 -1。 */
function findPair(mask: string, from: number, end: number, open: string, close: string): number {
  let depth = 1
  let i = from
  while (i < end) {
    if (mask[i] === NUL) {
      i++
      continue
    }
    if (i + close.length <= end && mask.startsWith(close, i)) {
      depth--
      if (depth === 0) return i
      i += close.length
      continue
    }
    if (i + open.length <= end && mask.startsWith(open, i)) {
      depth += 1
      i += open.length
      continue
    }
    i++
  }
  return -1
}

/** 夹注的配对：嵌套的 `<` 也须通过起始条件才计数。 */
function findJzClose(mask: string, from: number, end: number): number {
  let depth = 1
  let i = from
  while (i < end) {
    const c = mask[i]
    if (c === NUL) {
      i++
      continue
    }
    if (c === '>') {
      depth--
      if (depth === 0) return i
      i++
      continue
    }
    if (c === '<' && canOpenJz(mask, i, end)) depth++
    i++
  }
  return -1
}

/** 专名号的结束条件较特殊：内容不得含 `/`，且默认必须含 CJK。 */
function findZmClose(
  src: string,
  mask: string,
  from: number,
  end: number,
  o: ResolvedSyntaxOptions,
  ctx: ScanContext
): number {
  let i = from
  // 同 findGzClose：长度判在最后，好把「超限」单独数出来
  while (i < end) {
    if (mask[i] === NUL) {
      i++
      continue
    }
    if (mask[i] !== '/') {
      i++
      continue
    }
    // 遇到的第一个 `/` 要么合法收尾，要么整体作废
    const prev = src[i - 1]
    const next = src[i + 1]
    if (isSpace(prev) || next === '/') return -1
    const content = src.slice(from, i)
    if (content.length === 0) return -1
    if (o.zmRequireCjk && !hasCjk(content)) return -1
    const limit = o.maxSpanLength.zm
    if (content.length > limit) {
      reportOverflow(ctx, 'zm', src, from - 1, from, i, limit)
      return -1
    }
    return i
  }
  return -1
}

/**
 * 转义 label 中不配对的方括号，否则指令会被提前截断。
 * 配对的方括号（例如 label 内含链接）保持原样。
 */
export function escapeDirectiveLabel(s: string): string {
  const open: number[] = []
  const bad = new Set<number>()
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '\\') {
      i++
      continue
    }
    if (c === '[') open.push(i)
    else if (c === ']') {
      if (open.length > 0) open.pop()
      else bad.add(i)
    }
  }
  for (const i of open) bad.add(i)
  if (bad.size === 0) return s
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (bad.has(i)) out += '\\'
    out += s[i]
  }
  return out
}

function emit(name: string, label: string): string {
  return ':' + name + '[' + escapeDirectiveLabel(label) + ']'
}

/**
 * 在 [start, end) 范围内扫描行内记号，递归处理内容。
 * 起始记号的优先级：`((` > `{{` > `《` > `[` > `<` > `/`（见 spec/syntax.md §11.1）。
 */
function transformRange(
  src: string,
  mask: string,
  start: number,
  end: number,
  o: ResolvedSyntaxOptions,
  ctx: ScanContext
): string {
  let out = ''
  let i = start

  while (i < end) {
    const c = mask[i]
    if (c === NUL) {
      out += src[i]
      i++
      continue
    }

    if (o.bz && c === '(' && mask[i + 1] === '(') {
      const close = findPair(mask, i + 2, end, '((', '))')
      if (close > i + 2) {
        if (close - (i + 2) <= o.maxSpanLength.bz) {
          out += emit('bz', transformRange(src, mask, i + 2, close, o, ctx))
          i = close + 2
          continue
        }
        reportOverflow(ctx, 'bz', src, i, i + 2, close, o.maxSpanLength.bz)
      }
    }

    if (o.sz && c === '{' && mask[i + 1] === '{') {
      const close = findPair(mask, i + 2, end, '{{', '}}')
      if (close > i + 2) {
        if (close - (i + 2) <= o.maxSpanLength.sz) {
          out += emit('sz', transformRange(src, mask, i + 2, close, o, ctx))
          i = close + 2
          continue
        }
        reportOverflow(ctx, 'sz', src, i, i + 2, close, o.maxSpanLength.sz)
      }
    }

    if (o.sm && c === '《') {
      const close = findPair(mask, i + 1, end, '《', '》')
      if (close > i + 1) {
        if (close - (i + 1) <= o.maxSpanLength.sm) {
          out += emit('sm', transformRange(src, mask, i + 1, close, o, ctx))
          i = close + 1
          continue
        }
        reportOverflow(ctx, 'sm', src, i, i + 1, close, o.maxSpanLength.sm)
      }
    }

    // 阙文 `[[…]]`：先于改字 `[…]` 判定，避免被单个 `[` 抢先打开（spec §11.1）。
    // 与 bz/sz 不同，内容允许为空——`[[]]` 是"阙文说明未知"的合法写法。
    if (o.qw && c === '[' && mask[i + 1] === '[') {
      const close = findPair(mask, i + 2, end, '[[', ']]')
      if (close >= i + 2) {
        if (close - (i + 2) <= o.maxSpanLength.qw) {
          out += emit('qw', transformRange(src, mask, i + 2, close, o, ctx))
          i = close + 2
          continue
        }
        reportOverflow(ctx, 'qw', src, i, i + 2, close, o.maxSpanLength.qw)
      }
    }

    // 缺字猜测 `□{guess=X}`：只认紧接在 □ 后面的这一种写法，不开放通用属性后缀
    // （任务书 T26 §3）。裸 □（后面不跟 `{guess=…}`）按字面处理，落到本函数末尾的默认分支。
    if (o.qz && c === '□') {
      const m = QZ_GUESS_RE.exec(src.slice(i + 1, end))
      if (m) {
        out += ':qz{guess=' + m[1] + '}'
        i += 1 + m[0].length
        continue
      }
    }

    if (o.gz && c === '[' && canOpenGz(src, mask, i, end)) {
      const close = findGzClose(src, mask, i + 1, end, o, ctx)
      if (close > i + 1) {
        out += emit('gz', transformRange(src, mask, i + 1, close, o, ctx))
        i = close + 1
        continue
      }
    }

    if (o.jz && c === '<' && canOpenJz(mask, i, end)) {
      const close = findJzClose(mask, i + 1, end)
      if (close > i + 1) {
        if (close - (i + 1) <= o.maxSpanLength.jz) {
          out += emit('jz', transformRange(src, mask, i + 1, close, o, ctx))
          i = close + 1
          continue
        }
        reportOverflow(ctx, 'jz', src, i, i + 1, close, o.maxSpanLength.jz)
      }
    }

    if (o.zm && c === '/' && canOpenZm(src, mask, i, end)) {
      const close = findZmClose(src, mask, i + 1, end, o, ctx)
      if (close > i + 1) {
        out += emit('zm', transformRange(src, mask, i + 1, close, o, ctx))
        i = close + 1
        continue
      }
    }

    out += src[i]
    i++
  }

  return out
}

/** 只做行内记号的转换，供测试与其他实现参考。 */
export function transformInline(text: string, options?: GujiSyntaxOptions): string {
  if (text === '') return text
  const o = resolveSyntaxOptions(options)
  const ctx: ScanContext = { line: 1, colBase: 0, onOverflow: o.onOverflow }
  return transformRange(text, buildMask(text), 0, text.length, o, ctx)
}

/** `:::table` 行内一个单元格的原始记号，附带它在本行内的起始偏移（供超限定位）。 */
interface TableCellToken {
  text: string
  start: number
}

/**
 * 按字面 ` | `（空格-竖线-空格）切分一行的单元格，`\|` 视为转义、不切分。
 *
 * 与 book-text `validate_text_format.py` 的 `_table_row_cols` 同一条规则：
 * 这一步在任何行内记号转换**之前**做，纯粹是原始文本切分——所以格内如果
 * 要写夹注的分行 `<a|b>`，其中的 `|` 必须转义成 `<a\|b>`，否则会被这一步
 * 误判成分格符，把一格拆成两格（任务书 T26 §1，CV 对照单已订正为此写法）。
 */
function splitTableCells(content: string): TableCellToken[] {
  const tokens: TableCellToken[] = []
  let buf = ''
  let start = 0
  let i = 0
  while (i < content.length) {
    if (content[i] === '\\' && content[i + 1] === '|') {
      buf += '\\|'
      i += 2
      continue
    }
    if (content.startsWith(' | ', i)) {
      tokens.push({ text: buf, start })
      buf = ''
      i += 3
      start = i
      continue
    }
    buf += content[i]
    i++
  }
  tokens.push({ text: buf, start })
  return tokens
}

/** 单元格解析结果：内容、跨列、跨行，以及两种特殊格（空格 `_`、续格 `^`）。 */
interface TableCell {
  body: string
  colspan: number
  rowspan: number
  empty: boolean
  continuation: boolean
}

function parseTableCell(token: string): TableCell {
  const m = TABLE_CELL_SUFFIX_RE.exec(token)!
  const body = m[1]
  const colspan = m[2] ? Number.parseInt(m[2], 10) : 1
  const rowspan = m[3] ? Number.parseInt(m[3], 10) : 1
  return {
    body,
    colspan,
    rowspan,
    empty: body === '_',
    continuation: body === '^'
  }
}

const TABLE_DIRECTIVE_START_RE = /^:(?:td|th)\[/

/**
 * 一行是否已经是规范化之后的 `:td[…]{…}`/`:th[…]{…}` 序列——
 * `gujiToDirective` 必须幂等（spec/directives.md「规范化的保证」），
 * 而表格行的规范化结果不再含字面 ` | `，没法复用 {@link splitTableCells}
 * 来判断"已经转过"，所以单独扫一遍：整行必须是零个以上首尾相接的
 * `:td[…]`/`:th[…]`（可选跟 `{…}`），`[…]` 允许嵌套（格内可能嵌 `:jz[…]` 等）。
 */
function isNormalizedTableRow(line: string): boolean {
  if (line === '') return true
  const mask = buildMask(line)
  const end = line.length
  let i = 0
  let matchedAny = false
  while (i < end) {
    const m = TABLE_DIRECTIVE_START_RE.exec(line.slice(i))
    if (!m) return false
    i += m[0].length
    let depth = 1
    while (i < end && depth > 0) {
      if (mask[i] === '[') depth++
      else if (mask[i] === ']') depth--
      i++
    }
    if (depth !== 0) return false
    if (line[i] === '{') {
      const close = line.indexOf('}', i + 1)
      if (close === -1) return false
      i = close + 1
    }
    matchedAny = true
  }
  return matchedAny
}

/**
 * 把一行 `:::table` 数据规范化为一串 `:th[…]{…}` / `:td[…]{…}`
 * （表头行整行用 `!` 前缀，见 spec/syntax.md §15）。
 *
 * 每个格各自独立跑一遍行内记号扫描（jz/bz/sz/gz/zm/sm 等在格内原样嵌套），
 * 续格标记 `^`（本格被上方跨行格占住）不产生任何指令——HTML 表格里被
 * rowspan 占住的格本来就不需要单元格，少写的这一个 `<td>` 就是正确表达。
 */
function transformTableRow(line: string, lineNo: number, o: ResolvedSyntaxOptions): string {
  if (isNormalizedTableRow(line)) return line

  const isHeader = line.startsWith('!')
  const content = isHeader ? line.slice(1) : line
  const colOffset = isHeader ? 1 : 0
  const name = isHeader ? 'th' : 'td'

  let out = ''
  for (const token of splitTableCells(content)) {
    const cell = parseTableCell(token.text)
    if (cell.continuation) continue

    const ctx: ScanContext = { line: lineNo, colBase: colOffset + token.start, onOverflow: o.onOverflow }
    const label = cell.empty
      ? ''
      : transformRange(cell.body, buildMask(cell.body), 0, cell.body.length, o, ctx)

    let attrs = ''
    if (cell.colspan > 1) attrs += ' colspan=' + cell.colspan
    if (cell.rowspan > 1) attrs += ' rowspan=' + cell.rowspan

    out += ':' + name + '[' + escapeDirectiveLabel(label) + ']' + (attrs ? '{' + attrs.trim() + '}' : '')
  }
  return out
}

/**
 * 古籍 Markdown → Directive Markdown。
 *
 * @example
 * gujiToDirective('^惟我\n.皇上<聖躬>')
 * // ':tt{n=1}惟我\n:kg{n=1}皇上:jz[聖躬]'
 */
export function gujiToDirective(source: string, options?: GujiSyntaxOptions): string {
  const o = resolveSyntaxOptions(options)
  const lines = source.split('\n')
  const out: string[] = new Array<string>(lines.length)

  let fence: Fence | undefined
  let inIndentedCode = false
  let inTable = false
  let prevBlank = true

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]

    // 0. :::table 容器块：开闭行原样输出，块内的每一行都是数据行，
    //    格式是行列小语法而不是普通段落文本——必须在缩进代码块／行首标记
    //    （抬头 `^`、空格 `.`）判定之前拦下来，否则续格标记 `^` 落在行首时
    //    会被误当成抬头指令，见 spec/syntax.md §15。
    if (!fence && o.table) {
      if (!inTable && TABLE_OPEN_RE.test(line)) {
        inTable = true
        out[li] = line
        prevBlank = false
        continue
      }
      if (inTable) {
        if (TABLE_CLOSE_RE.test(line)) {
          inTable = false
          out[li] = line
          prevBlank = false
          continue
        }
        // 空行：原样保留，不当成一格（校验器 check_table_block_cols 同样先滤掉空行）
        const rowBlank = line.trim() === ''
        out[li] = rowBlank ? line : transformTableRow(line, li + 1, o)
        prevBlank = rowBlank
        continue
      }
    }

    // 1. 围栏代码块
    if (fence) {
      out[li] = line
      const f = matchFence(line)
      if (f && f.char === fence.char && f.len >= fence.len && f.info === '') fence = undefined
      prevBlank = false
      continue
    }
    const f = matchFence(line)
    if (f) {
      fence = { char: f.char, len: f.len }
      out[li] = line
      prevBlank = false
      continue
    }

    // 2. 空行
    if (line.trim() === '') {
      out[li] = line
      prevBlank = true
      continue
    }

    // 3. 缩进代码块
    if (o.indentedCode) {
      const indent = contentIndent(line)
      if (inIndentedCode) {
        if (indent >= 4) {
          out[li] = line
          prevBlank = false
          continue
        }
        inIndentedCode = false
      } else if (prevBlank && indent >= 4) {
        inIndentedCode = true
        out[li] = line
        prevBlank = false
        continue
      }
    }
    prevBlank = false

    // 4. 行首标记：抬头、空格
    const prefix = BLOCK_PREFIX_RE.exec(line)![1]
    let rest = line.slice(prefix.length)
    let markers = ''
    let k = 0
    if (o.tt) {
      let n = 0
      while (rest[k] === '^' && n < o.maxLevel) {
        n++
        k++
      }
      if (n > 0) markers += ':tt{n=' + n + '}'
    }
    if (o.kg) {
      let n = 0
      while (rest[k] === '.' && n < o.maxLevel) {
        n++
        k++
      }
      if (n > 0) markers += ':kg{n=' + n + '}'
    }
    rest = rest.slice(k)

    // 5. 行内记号
    const ctx: ScanContext = {
      line: li + 1,
      // 前缀与行首标记已被剥掉，列号要把它们加回去
      colBase: prefix.length + k,
      onOverflow: o.onOverflow
    }
    out[li] =
      prefix +
      markers +
      (rest === '' ? rest : transformRange(rest, buildMask(rest), 0, rest.length, o, ctx))
  }

  return out.join('\n')
}

/** {@link gujiToDirectiveWithReport} 的结果。 */
export interface NormalizeReport {
  /** 规范化之后的 Directive Markdown，与 {@link gujiToDirective} 的输出一字不差。 */
  text: string
  /**
   * 因超过长度上限而被降级为普通文本的记号，按出现顺序。
   *
   * **这个数组不空就意味着有内容悄悄变成了正文。**批量转换应当把它当作
   * 失败条件，或至少逐条核对——spec §0.3 规定超限不报错，
   * 所以除了这里，别处再也看不出来。
   */
  overflows: OverflowEvent[]
  /** 各记号的降级处数，`overflows` 的计数视图。 */
  overflowCounts: Record<SpanMarkName, number>
}

/**
 * 与 {@link gujiToDirective} 做同一件事，另外报告有多少记号因超长被降级。
 *
 * 长度上限是本规范里唯一「静默改变输出」的机制（§0.4 视为未闭合、
 * §0.3 未闭合不报错）。凡是批量转换存量文本的，都该走这个函数：
 *
 * ```ts
 * const { text, overflows } = gujiToDirectiveWithReport(src)
 * if (overflows.length) throw new Error(`有 ${overflows.length} 处记号被降级为正文`)
 * ```
 */
export function gujiToDirectiveWithReport(
  source: string,
  options?: GujiSyntaxOptions
): NormalizeReport {
  const overflows: OverflowEvent[] = []
  const 外部回调 = options?.onOverflow
  const text = gujiToDirective(source, {
    ...options,
    onOverflow: (ev) => {
      overflows.push(ev)
      外部回调?.(ev)
    }
  })
  const overflowCounts = { jz: 0, bz: 0, sz: 0, gz: 0, zm: 0, sm: 0, qw: 0 }
  for (const ev of overflows) overflowCounts[ev.mark]++
  return { text, overflows, overflowCounts }
}
