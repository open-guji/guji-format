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
  type ResolvedSyntaxOptions
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

interface Fence {
  char: string
  len: number
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
  o: ResolvedSyntaxOptions
): number {
  let i = from
  while (i < end && i - from <= o.maxSpanLength) {
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
 * 起始记号的优先级：`((` > `{{` > `《` > `<` > `/`（见 spec/syntax.md §9.1）。
 */
function transformRange(
  src: string,
  mask: string,
  start: number,
  end: number,
  o: ResolvedSyntaxOptions
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
      if (close > i + 2 && close - (i + 2) <= o.maxSpanLength) {
        out += emit('bz', transformRange(src, mask, i + 2, close, o))
        i = close + 2
        continue
      }
    }

    if (o.sz && c === '{' && mask[i + 1] === '{') {
      const close = findPair(mask, i + 2, end, '{{', '}}')
      if (close > i + 2 && close - (i + 2) <= o.maxSpanLength) {
        out += emit('sz', transformRange(src, mask, i + 2, close, o))
        i = close + 2
        continue
      }
    }

    if (o.sm && c === '《') {
      const close = findPair(mask, i + 1, end, '《', '》')
      if (close > i + 1 && close - (i + 1) <= o.maxSpanLength) {
        out += emit('sm', transformRange(src, mask, i + 1, close, o))
        i = close + 1
        continue
      }
    }

    if (o.jz && c === '<' && canOpenJz(mask, i, end)) {
      const close = findJzClose(mask, i + 1, end)
      if (close > i + 1 && close - (i + 1) <= o.maxSpanLength) {
        out += emit('jz', transformRange(src, mask, i + 1, close, o))
        i = close + 1
        continue
      }
    }

    if (o.zm && c === '/' && canOpenZm(src, mask, i, end)) {
      const close = findZmClose(src, mask, i + 1, end, o)
      if (close > i + 1) {
        out += emit('zm', transformRange(src, mask, i + 1, close, o))
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
  return transformRange(text, buildMask(text), 0, text.length, o)
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
  let prevBlank = true

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]

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
    out[li] = prefix + markers + transformInline(rest, o)
  }

  return out.join('\n')
}
