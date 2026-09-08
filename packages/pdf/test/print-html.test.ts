import { describe, expect, it } from 'vitest'
import { gujiToPrintHtml } from '../src/index.js'

const source = '^惟我\n.太祖高皇帝。《明太祖實錄》卷一<諱元璋>'

describe('gujiToPrintHtml', () => {
  it('输出完整页面并带上 @page 规则', () => {
    const html = gujiToPrintHtml(source, { title: '實錄' })
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<title>實錄</title>')
    expect(html).toContain('@page')
  })

  it('默认竖排', () => {
    expect(gujiToPrintHtml(source)).toContain('class="guji-doc guji-vertical"')
  })

  it('--horizontal 时不加竖排类名', () => {
    expect(gujiToPrintHtml(source, { vertical: false })).toContain('class="guji-doc"')
  })

  it('纸张与边距写进自定义属性', () => {
    const html = gujiToPrintHtml(source, { pageSize: 'A4', pageMargin: '10mm' })
    expect(html).toContain('--guji-page-size: A4;')
    expect(html).toContain('--guji-page-margin: 10mm;')
  })

  it('banks 加上版框类名', () => {
    expect(gujiToPrintHtml(source, { banks: true })).toContain('guji-banks')
  })

  it('正文照常渲染古籍扩展', () => {
    const html = gujiToPrintHtml(source)
    expect(html).toContain('class="guji-tt" data-guji-n="1"')
    expect(html).toContain('class="guji-jz"')
    expect(html).toContain('class="guji-sm"')
  })

  it("paged: 'always' 在缺少 pagedjs 时明确报错", () => {
    expect(() => gujiToPrintHtml(source, { paged: 'always' })).toThrow(/pagedjs/)
  })
})
