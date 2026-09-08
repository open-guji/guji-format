#!/usr/bin/env node
/** guji-pdf —— 把古籍 Markdown 转成 PDF 或可打印 HTML。 */

import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { checkBackend, gujiToPdf, gujiToPrintHtml } from './index.js'
import type { PdfOptions } from './options.js'

const USAGE = `用法：guji-pdf <输入.gmd> [选项]

选项：
  -o, --out <文件>       输出路径（默认与输入同名，改扩展名）
      --html             只生成可打印 HTML，不调用排版后端
      --size <纸张>      A4 | A5 | B5 | Letter，默认 A5
      --margin <边距>    CSS margin 语法，默认 "20mm 18mm"
      --font-size <值>   正文字号，默认 11pt
      --line-height <值> 正文行距倍数，默认 1.85
      --horizontal       横排（默认竖排）
      --banks            加版框与界行
      --title <标题>     文档标题
      --check            检查排版后端是否可用
  -h, --help             显示本帮助
`

function parseArgs(argv: string[]): { input?: string; out?: string; html: boolean; check: boolean; options: PdfOptions } {
  const options: PdfOptions = {}
  let input: string | undefined
  let out: string | undefined
  let html = false
  let check = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = (): string => {
      const value = argv[++i]
      if (value === undefined) throw new Error(`选项 ${arg} 缺少参数`)
      return value
    }
    switch (arg) {
      case '-h':
      case '--help':
        process.stdout.write(USAGE)
        process.exit(0)
        break
      case '--check':
        check = true
        break
      case '--html':
        html = true
        break
      case '-o':
      case '--out':
        out = next()
        break
      case '--size':
        options.pageSize = next()
        break
      case '--margin':
        options.pageMargin = next()
        break
      case '--font-size':
        options.fontSize = next()
        break
      case '--line-height':
        options.lineHeight = Number(next())
        break
      case '--horizontal':
        options.vertical = false
        break
      case '--banks':
        options.banks = true
        break
      case '--title':
        options.title = next()
        break
      default:
        if (arg.startsWith('-')) throw new Error(`未知选项 ${arg}`)
        input = arg
    }
  }

  return { input, out, html, check, options }
}

async function main(): Promise<void> {
  const { input, out, html, check, options } = parseArgs(process.argv.slice(2))

  if (check) {
    const backend = await checkBackend()
    process.stdout.write(
      `playwright: ${backend.playwright ? '可用' : '未安装'}\n` +
        `pagedjs:    ${backend.pagedjs ? '可用' : '未安装（将由 Chromium 自行分页）'}\n`
    )
    return
  }

  if (!input) {
    process.stderr.write(USAGE)
    process.exitCode = 1
    return
  }

  const source = await readFile(input, 'utf8')
  const stem = basename(input, extname(input))
  options.title ??= stem

  if (html) {
    const target = out ?? `${stem}.html`
    await writeFile(target, gujiToPrintHtml(source, options))
    process.stdout.write(`${target}\n`)
    return
  }

  const target = out ?? `${stem}.pdf`
  await writeFile(target, await gujiToPdf(source, options))
  process.stdout.write(`${target}\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
