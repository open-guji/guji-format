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
  /** 抬头 行首 `^` → `:tt{n}` */
  tt?: boolean
  /** 空格 行首 `.` → `:kg{n}` */
  kg?: boolean
  /** 专名号 `/…/` → `:zm[…]` */
  zm?: boolean
  /** 书名号 `《…》` → `:sm[…]` */
  sm?: boolean
}

export interface GujiSyntaxOptions extends GujiToggles {
  /**
   * 行内记号内容的最大字符数，超出即视为未闭合。
   * 用来避免误匹配吞掉整行。
   * @default 64
   */
  maxSpanLength?: number
  /**
   * `n` 类属性（抬头级数、空格数）的上限。
   * @default 9
   */
  maxLevel?: number
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

export type ResolvedSyntaxOptions = Required<GujiSyntaxOptions>

export const DEFAULT_SYNTAX_OPTIONS: ResolvedSyntaxOptions = {
  jz: true,
  bz: true,
  sz: true,
  tt: true,
  kg: true,
  zm: true,
  sm: true,
  maxSpanLength: 64,
  maxLevel: 9,
  zmRequireCjk: true,
  indentedCode: true
}

export function resolveSyntaxOptions(options?: GujiSyntaxOptions): ResolvedSyntaxOptions {
  return { ...DEFAULT_SYNTAX_OPTIONS, ...options }
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
    ...options
  }
}
