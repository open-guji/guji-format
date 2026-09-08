// styles/*.css 是样式的唯一来源；这里把它们编译成一个 TS 模块，
// 让 gujiToDocument() 能在不依赖打包器的情况下内联样式。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const stylesDir = join(root, 'styles')

const files = readdirSync(stylesDir).filter((f) => f.endsWith('.css')).sort()
const entries = files.map((file) => {
  const name = file.replace(/\.css$/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  const css = readFileSync(join(stylesDir, file), 'utf8')
  return `export const ${name}Css = ${JSON.stringify(css)}\n`
})

const out = `// 本文件由 scripts/build-styles.mjs 从 styles/*.css 生成，请勿手改。
/* eslint-disable */

${entries.join('\n')}
export const STYLE_FILES = ${JSON.stringify(files, null, 2)} as const
`

writeFileSync(join(root, 'src', 'styles.generated.ts'), out)
console.log(`build-styles: ${files.join(', ')}`)
