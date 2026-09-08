#!/usr/bin/env node
/** 把 examples/sample/*.gmd 渲染成 examples/web-demo 下的静态页面。 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gujiToDirective } from '@open-guji/markdown-core'
import { gujiToHtml, gujiCss, gujiVerticalCss } from '@open-guji/markdown-web'

const here = dirname(fileURLToPath(import.meta.url))
const sampleDir = join(here, 'sample')
const outDir = join(here, 'web-demo')
mkdirSync(outDir, { recursive: true })

const template = readFileSync(join(here, 'web-demo', 'template.html'), 'utf8')

const files = readdirSync(sampleDir).filter((f) => f.endsWith('.gmd')).sort()
const pages = []

for (const file of files) {
  const stem = basename(file, '.gmd')
  const source = readFileSync(join(sampleDir, file), 'utf8')
  const title = /^#\s+(.+)$/m.exec(source)?.[1] ?? stem

  const html = template
    .replace(/\{\{title\}\}/g, escapeHtml(title))
    .replace('{{css}}', `${gujiCss}\n${gujiVerticalCss}`)
    .replace('{{content}}', gujiToHtml(source))
    .replace('{{source}}', escapeHtml(source))
    .replace('{{directive}}', escapeHtml(gujiToDirective(source)))
    .replace('{{nav}}', '<a href="./index.html">← 全部示例</a>')

  writeFileSync(join(outDir, `${stem}.html`), html)
  pages.push({ stem, title })
}

const index = template
  .replace(/\{\{title\}\}/g, 'guji-markdown 示例')
  .replace('{{css}}', gujiCss)
  .replace('{{content}}', `<ul>${pages
    .map((p) => `<li><a href="./${p.stem}.html">${escapeHtml(p.title)}</a></li>`)
    .join('')}</ul>`)
  .replace('{{source}}', '')
  .replace('{{directive}}', '')
  .replace('{{nav}}', '<a href="https://github.com/open-guji/guji-markdown">仓库</a>')

writeFileSync(join(outDir, 'index.html'), index)
console.log(`build-demo: ${pages.length + 1} 个页面 → ${resolve(outDir)}`)

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
