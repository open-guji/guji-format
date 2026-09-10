/**
 * 古籍 Markdown 的选项定义。
 *
 * 语法层（{@link GujiSyntaxOptions}）控制"哪些短记号被识别"，
 * 只影响规范化；树层（{@link GujiOptions}）控制 remark 插件的行为。
 */

/** 每个扩展记号的开关。默认全开。 */
export interface GujiToggles {
  /** 夹注 `<…>` → `:jz[…]` */
  jz?: boolean
  /** 补字 `((…))` → `:bz[…]` */
  bz?: boolean
  /** 删字 `{{…}}` → `:sz[…]` */
  sz?: boolean
  /** 改字 `[…]` → `:gz[…]` */
  gz?: boolean
  /** 抬头 行首 `^` → `:tt{n}` */
  tt?: boolean
  /** 空格 行首 `.` → `:kg{n}` */
  kg?: boolean
  /** 专名号 `/…/` → `:zm[…]` */
  zm?: boolean
  /** 书名号 `《…》` → `:sm[…]` */
  sm?: boolean
}

/** 六种成对行内记号的名字。抬头 `tt`、空格 `kg` 是行首标记，不受长度上限约束。 */
export type SpanMarkName = 'jz' | 'bz' | 'sz' | 'gz' | 'zm' | 'sm'

export const SPAN_MARKS: readonly SpanMarkName[] = ['jz', 'bz', 'sz', 'gz', 'zm', 'sm']

/**
 * 按记号分设的长度上限。缺项落到 `default`。
 *
 * 之所以要分记号，是因为**上限的收益与代价按记号而异**：
 *
 * - 书名号、专名号、改字的内容天然短（实测存量 p99.9 ≤ 20 字），
 *   而它们的起止记号同形或极常见，误配对风险高——上限是有效的防呆。
 * - 夹注 `<…>` 恰好相反：古籍的双行小字注天然可以很长（实测存量最长
 *   3,212 字），而它的起始条件极严（`<` 之后不得是 ASCII 字母、`/`、
 *   `!`、`?`、`>`、空白），实测两万余处夹注零误配对——
 *   上限对它只有代价，没有收益。
 *
 * 详见 spec/syntax.md §0.4。
 */
export interface MaxSpanLengthByMark extends Partial<Record<SpanMarkName, number>> {
  /** 未单列的记号用这个值。@default 64 */
  default?: number
}

/**
 * 长度上限：给一个数则**六种记号一律用它**（不留隐藏例外）；
 * 给一个表则按记号分设，缺项落到 `default`。
 */
export type MaxSpanLengthOption = number | MaxSpanLengthByMark

/** 因超过长度上限而被降级为普通文本的记号。见 {@link GujiSyntaxOptions.onOverflow}。 */
export interface OverflowEvent {
  /** 哪一种记号 */
  mark: SpanMarkName
  /** 行号，1 起 */
  line: number
  /** 起始记号所在列，1 起 */
  column: number
  /** 内容的实际长度（与上限同一口径，按 UTF-16 码元计） */
  length: number
  /** 当时生效的上限 */
  limit: number
  /** 内容开头一小段，供人核对 */
  preview: string
}

/** 默认上限：夹注 4096，其余 64。改动理由见 {@link MaxSpanLengthByMark}。 */
export const DEFAULT_MAX_SPAN_LENGTH: Required<MaxSpanLengthByMark> = {
  default: 64,
  jz: 4096,
  bz: 64,
  sz: 64,
  gz: 64,
  zm: 64,
  sm: 64
}

export interface GujiSyntaxOptions extends GujiToggles {
  /**
   * 行内记号内容的长度上限，超出即视为未闭合（按字面输出）。
   * 用来避免误匹配把整行吞掉。
   *
   * 给一个数则六种记号一律用它；给一个表则按记号分设。
   * 默认 `{ default: 64, jz: 4096 }`——夹注放宽的理由见
   * {@link MaxSpanLengthByMark}。
   *
   * ⚠️ 超限是**静默**的（spec §0.3 规定未闭合不报错）。凡是靠本库做批量
   * 转换的，都应当接上 {@link onOverflow} 或改用
   * `gujiToDirectiveWithReport`，否则被吞掉的记号无声无息地变成正文。
   *
   * @default { default: 64, jz: 4096 }
   */
  maxSpanLength?: MaxSpanLengthOption
  /**
   * 每有一个记号因超过长度上限而被降级为普通文本时调用。
   *
   * 这是长度上限唯一的**可观测出口**：规范要求超限「视为未闭合」且
   * 「不报错」，若不接这个回调，降级就完全无声。批量转换务必接上并计数。
   */
  onOverflow?: (event: OverflowEvent) => void
  /**
   * `n` 类属性（抬头级数、空格数）的上限。
   * @default 9
   */
  maxLevel?: number
  /**
   * 改字内容必须至少含一个 CJK 字符。
   * 关闭后 `[x]`、`[TODO]` 之类会被误判为改字，务必谨慎。
   * @default true
   */
  gzRequireCjk?: boolean
  /**
   * 专名号内容必须至少含一个 CJK 字符。
   * 关闭后 `/path/like/this` 会被误判为专名，仅在纯中文语料中才建议关闭。
   * @default true
   */
  zmRequireCjk?: boolean
  /**
   * 把"空行之后缩进 ≥ 4 空格"的行按缩进代码块处理（其中不做任何转换）。
   * 若文档大量使用深层列表，可关闭。
   * @default true
   */
  indentedCode?: boolean
}

export type ResolvedSyntaxOptions = Omit<
  Required<GujiSyntaxOptions>,
  'maxSpanLength' | 'onOverflow'
> & {
  /** 已展开成「每个记号一个数」的形式。 */
  maxSpanLength: Required<MaxSpanLengthByMark>
  onOverflow?: (event: OverflowEvent) => void
}

export const DEFAULT_SYNTAX_OPTIONS: ResolvedSyntaxOptions = {
  jz: true,
  bz: true,
  sz: true,
  gz: true,
  tt: true,
  kg: true,
  zm: true,
  sm: true,
  maxSpanLength: DEFAULT_MAX_SPAN_LENGTH,
  maxLevel: 9,
  gzRequireCjk: true,
  zmRequireCjk: true,
  indentedCode: true
}

/** 把 `number | 表` 两种写法都展开成「每个记号一个数」。 */
export function resolveMaxSpanLength(
  option: MaxSpanLengthOption | undefined
): Required<MaxSpanLengthByMark> {
  if (option === undefined) return DEFAULT_MAX_SPAN_LENGTH
  // 给一个数就是「六种记号一律用它」——不留隐藏例外，调用方说了算
  if (typeof option === 'number') {
    return {
      default: option,
      jz: option,
      bz: option,
      sz: option,
      gz: option,
      zm: option,
      sm: option
    }
  }
  const fallback = option.default ?? DEFAULT_MAX_SPAN_LENGTH.default
  const out = { default: fallback } as Required<MaxSpanLengthByMark>
  for (const m of SPAN_MARKS) out[m] = option[m] ?? fallback
  return out
}

export function resolveSyntaxOptions(options?: GujiSyntaxOptions): ResolvedSyntaxOptions {
  return {
    ...DEFAULT_SYNTAX_OPTIONS,
    ...options,
    maxSpanLength: resolveMaxSpanLength(options?.maxSpanLength)
  }
}

export interface GujiOptions extends GujiSyntaxOptions {
  /**
   * 解析前先把短记号规范化为指令。
   * 关闭后只支持显式的 `:jz[…]` 写法。
   * @default true
   */
  shorthand?: boolean
  /**
   * 把 `:tt{n}` 空标记之后、直到行尾的兄弟节点收进该指令。
   * 见 spec/ast.md §1.1。
   * @default true
   */
  lineScope?: boolean
  /**
   * 把指令别名（`note`、`add` …）归一到规范名（`jz`、`bz` …）。
   * @default true
   */
  normalizeNames?: boolean
}

export type ResolvedGujiOptions = ResolvedSyntaxOptions &
  Required<Pick<GujiOptions, 'shorthand' | 'lineScope' | 'normalizeNames'>>

export function resolveOptions(options?: GujiOptions): ResolvedGujiOptions {
  return {
    ...DEFAULT_SYNTAX_OPTIONS,
    shorthand: true,
    lineScope: true,
    normalizeNames: true,
    ...options,
    maxSpanLength: resolveMaxSpanLength(options?.maxSpanLength)
  }
}
