/** 把渲染结果包成一张可以直接打开（或交给排版后端）的完整 HTML 页面。 */

import { gujiToHtml } from './index.js'
import type { GujiHtmlOptions } from './options.js'
import { gujiCss, gujiVerticalCss } from './styles.generated.js'

export interface DocumentOptions extends GujiHtmlOptions {
  /** `<title>`，同时用作 `<h1>` 之外的文档标识 */
  title?: string
  /** `<html lang>` @default 'zh-Hant' */
  lang?: string
  /** 竖排（右起直行） @default false */
  vertical?: boolean
  /** 内联本包自带的样式 @default true */
  inlineStyles?: boolean
  /** 追加的 CSS，置于内联样式之后 */
  extraCss?: string
  /** 追加到 `<head>` 的原始 HTML，例如字体 `<link>` */
  extraHead?: string
  /** 容器元素上追加的类名 */
  className?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 已经渲染好的 HTML 片段 → 完整页面。 */
export function renderDocument(fragment: string, options: DocumentOptions = {}): string {
  const {
    title = '古籍',
    lang = 'zh-Hant',
    vertical = false,
    inlineStyles = true,
    extraCss = '',
    extraHead = '',
    className = ''
  } = options

  const css = [
    inlineStyles ? gujiCss : '',
    inlineStyles && vertical ? gujiVerticalCss : '',
    extraCss
  ]
    .filter(Boolean)
    .join('\n')

  const classes = ['guji-doc', vertical ? 'guji-vertical' : '', className]
    .filter(Boolean)
    .join(' ')

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${css ? `<style>\n${css}\n</style>` : ''}
${extraHead}
</head>
<body>
<article class="${classes}">
${fragment}
</article>
</body>
</html>
`
}

/** 古籍 Markdown → 完整 HTML 页面。 */
export function gujiToDocument(source: string, options: DocumentOptions = {}): string {
  return renderDocument(gujiToHtml(source, options), options)
}
