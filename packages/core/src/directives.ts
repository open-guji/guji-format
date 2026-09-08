/**
 * 指令注册表。规范见 spec/directives.md。
 */

export type DirectiveShape = 'text' | 'marker' | 'leaf' | 'container'

export interface DirectiveSpec {
  /** 规范名，两字拼音首字母 */
  name: string
  /** 中文名 */
  cn: string
  /** 可接受的别名，解析时归一到 name */
  aliases: readonly string[]
  /** 允许的形态 */
  shapes: readonly DirectiveShape[]
  /** 已定义的属性名 */
  attributes: readonly string[]
  /** 默认 HTML 元素（行内形态） */
  tagName: string
  /** 容器形态的 HTML 元素，未定义则不支持容器形态 */
  blockTagName?: string
  /** 对应的源文短记号，供文档与反向规范化使用 */
  shorthand?: { open: string; close: string } | { linePrefix: string }
}

export const DIRECTIVES: readonly DirectiveSpec[] = [
  {
    name: 'jz',
    cn: '夹注',
    aliases: ['note', 'jiazhu', 'xiaozhu'],
    shapes: ['text'],
    attributes: ['type'],
    tagName: 'span',
    shorthand: { open: '<', close: '>' }
  },
  {
    name: 'bz',
    cn: '补字',
    aliases: ['add', 'ins', 'buzi'],
    shapes: ['text'],
    attributes: ['src'],
    tagName: 'ins',
    shorthand: { open: '((', close: '))' }
  },
  {
    name: 'sz',
    cn: '删字',
    aliases: ['del', 'shanzi'],
    shapes: ['text'],
    attributes: ['src'],
    tagName: 'del',
    shorthand: { open: '{{', close: '}}' }
  },
  {
    name: 'gz',
    cn: '改字',
    aliases: ['sub', 'amend', 'gaizi'],
    shapes: ['text'],
    attributes: ['src'],
    tagName: 'ins',
    shorthand: { open: '[', close: ']' }
  },
  {
    name: 'tt',
    cn: '抬头',
    aliases: ['raise', 'taitou'],
    shapes: ['marker', 'text', 'container'],
    attributes: ['n'],
    tagName: 'span',
    blockTagName: 'div',
    shorthand: { linePrefix: '^' }
  },
  {
    name: 'kg',
    cn: '空格',
    aliases: ['space', 'kongge'],
    shapes: ['marker'],
    attributes: ['n'],
    tagName: 'span',
    shorthand: { linePrefix: '.' }
  },
  {
    name: 'zm',
    cn: '专名号',
    aliases: ['name', 'zhuanming'],
    shapes: ['text'],
    attributes: ['type'],
    tagName: 'span',
    shorthand: { open: '/', close: '/' }
  },
  {
    name: 'sm',
    cn: '书名号',
    aliases: ['book', 'shuming'],
    shapes: ['text'],
    attributes: ['part'],
    tagName: 'span',
    shorthand: { open: '《', close: '》' }
  }
]

const BY_NAME = new Map<string, DirectiveSpec>()
for (const spec of DIRECTIVES) {
  BY_NAME.set(spec.name, spec)
  for (const alias of spec.aliases) BY_NAME.set(alias, spec)
}

/** 取指令定义；名字可以是规范名或别名。 */
export function lookupDirective(name: string): DirectiveSpec | undefined {
  return BY_NAME.get(name)
}

/** 把别名归一到规范名；未注册的名字原样返回。 */
export function resolveDirectiveName(name: string): string {
  return BY_NAME.get(name)?.name ?? name
}

/** 是否为古籍扩展定义的指令。 */
export function isGujiDirective(name: string): boolean {
  return BY_NAME.has(name)
}

/**
 * 解析 `n` 属性：非数字、小于 1 时取 1，超过上限时钳制。
 */
export function parseLevel(value: unknown, maxLevel = 9): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(Math.trunc(n), maxLevel)
}
