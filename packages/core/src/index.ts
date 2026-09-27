/**
 * `@open-guji/markdown-core`
 *
 * 古籍 Markdown 扩展的平台无关内核：
 * 短记号 → Directive 的规范化器、指令注册表、remark 插件与 mdast 变换。
 *
 * 规范见仓库 `spec/` 目录。
 */

export { default as remarkGuji, default } from './plugin.js'

export {
  gujiToDirective,
  gujiToDirectiveWithReport,
  transformInline,
  buildMask,
  escapeDirectiveLabel,
  type NormalizeReport
} from './normalize.js'

export { gujiProcessor, parseGuji, formatDirective } from './parse.js'

export { applyLineScope, normalizeDirectiveNames, groupTableRows } from './transform.js'

export {
  DIRECTIVES,
  lookupDirective,
  resolveDirectiveName,
  isGujiDirective,
  parseLevel,
  type DirectiveSpec,
  type DirectiveShape
} from './directives.js'

export {
  DEFAULT_SYNTAX_OPTIONS,
  DEFAULT_MAX_SPAN_LENGTH,
  SPAN_MARKS,
  resolveSyntaxOptions,
  resolveMaxSpanLength,
  resolveOptions,
  type SpanMarkName,
  type MaxSpanLengthByMark,
  type MaxSpanLengthOption,
  type OverflowEvent,
  type GujiToggles,
  type GujiSyntaxOptions,
  type ResolvedSyntaxOptions,
  type GujiOptions,
  type ResolvedGujiOptions
} from './options.js'

/** 本包实现的规范版本。 */
export const SPEC_VERSION = '0.2.0'
