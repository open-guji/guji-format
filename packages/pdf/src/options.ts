import type { DocumentOptions } from '@open-guji/markdown-web'

/** 纸张。字符串会原样写进 `@page { size: … }`。 */
export type PageSize = 'A4' | 'A5' | 'B5' | 'Letter' | (string & {})

export interface PrintOptions extends DocumentOptions {
  /**
   * 纸张尺寸。
   * @default 'A5'
   */
  pageSize?: PageSize
  /**
   * 页边距，CSS `margin` 语法。
   * @default '20mm 18mm'
   */
  pageMargin?: string
  /**
   * 正文字号。
   * @default '11pt'
   */
  fontSize?: string
  /**
   * 正文行距（无单位倍数）。
   * @default 1.85
   */
  lineHeight?: number
  /**
   * 加版框与界行（线装书版式）。
   * @default false
   */
  banks?: boolean
  /**
   * 是否内联 Paged.js。
   * `auto` 表示能解析到 `pagedjs` 依赖时才内联，否则交给排版引擎自己分页。
   * @default 'auto'
   */
  paged?: 'auto' | 'always' | 'never'
}

export interface PdfOptions extends PrintOptions {
  /**
   * 渲染超时（毫秒）。
   * @default 30000
   */
  timeout?: number
  /**
   * 浏览器可执行文件路径。留空则用 playwright 自带的 Chromium；
   * CI 里常有一份预装的浏览器，指过去可以省掉一次下载。
   */
  executablePath?: string
  /** 传给 Chromium 的额外命令行参数。 */
  browserArgs?: string[]
}

export const DEFAULT_PRINT_OPTIONS = {
  pageSize: 'A5',
  pageMargin: '20mm 18mm',
  fontSize: '11pt',
  lineHeight: 1.85,
  banks: false,
  paged: 'auto',
  vertical: true
} as const satisfies Partial<PrintOptions>
