import type { GujiOptions } from '@open-guji/markdown-core'

/** 未注册指令的处理方式。 */
export type UnknownDirectivePolicy = 'keep' | 'children' | 'error'

export interface GujiHtmlOptions extends GujiOptions {
  /**
   * 类名前缀。
   * @default 'guji-'
   */
  classPrefix?: string
  /**
   * 书名号 `《》` 是否作为可见标点输出。
   * `keep` 会把它们包在 `<span class="guji-sm-mark">` 里，便于竖排样式隐藏。
   * @default 'keep'
   */
  bookTitleMarks?: 'keep' | 'drop'
  /**
   * 注册表以外的指令怎么处理。
   * @default 'keep'
   */
  unknown?: UnknownDirectivePolicy
  /**
   * 空格（`kg`）实际写入的字符，默认表意空格 U+3000。
   * @default '　'
   */
  spaceChar?: string
  /**
   * 是否放行源文中的原始 HTML。古籍文本一般不需要，
   * 开启后输出不再可信，须自行消毒。
   * @default false
   */
  allowDangerousHtml?: boolean
}

export type ResolvedHtmlOptions = GujiHtmlOptions &
  Required<
    Pick<
      GujiHtmlOptions,
      'classPrefix' | 'bookTitleMarks' | 'unknown' | 'spaceChar' | 'allowDangerousHtml' | 'maxLevel'
    >
  >

export const DEFAULT_HTML_OPTIONS = {
  classPrefix: 'guji-',
  bookTitleMarks: 'keep',
  unknown: 'keep',
  spaceChar: '　',
  allowDangerousHtml: false,
  maxLevel: 9
} as const satisfies Partial<GujiHtmlOptions>

export function resolveHtmlOptions(options?: GujiHtmlOptions): ResolvedHtmlOptions {
  return { ...DEFAULT_HTML_OPTIONS, ...options }
}
