import { describe, expect, it } from 'vitest'
import { gujiToDocument, gujiToHtml, SPEC_VERSION } from '../src/index.js'
import { cases, SPEC_FIXTURE_VERSION } from './fixtures.js'

describe('渲染语料', () => {
  it('实现的规范版本与语料一致', () => {
    expect(SPEC_VERSION).toBe(SPEC_FIXTURE_VERSION)
  })

  for (const c of cases) {
    if (c.html === undefined) continue
    it(`${c.name}${c.note ? ' — ' + c.note : ''}`, () => {
      expect(gujiToHtml(c.guji, c.options).trimEnd()).toBe(c.html)
    })
  }
})

describe('选项', () => {
  it('classPrefix 可替换', () => {
    expect(gujiToHtml('/孔子/', { classPrefix: 'gj-' })).toContain('class="gj-zm"')
  })

  it('bookTitleMarks: drop 去掉《》', () => {
    const html = gujiToHtml('《論語》', { bookTitleMarks: 'drop' })
    expect(html).toBe('<p><span class="guji-sm">論語</span></p>')
  })

  it('spaceChar 可替换', () => {
    expect(gujiToHtml('..文', { spaceChar: '_' })).toContain('>__<')
  })

  it('unknown: children 丢弃未知指令的包装', () => {
    expect(gujiToHtml(':foo[文]', { unknown: 'children' })).toBe('<p>文</p>')
  })

  it('unknown: error 抛出', () => {
    expect(() => gujiToHtml(':foo[文]', { unknown: 'error' })).toThrow(/未注册的指令/)
  })

  it('默认丢弃原始 HTML', () => {
    expect(gujiToHtml('<b>粗</b>')).toBe('<p>粗</p>')
  })

  it('allowDangerousHtml 放行原始 HTML', () => {
    expect(gujiToHtml('<b>粗</b>', { allowDangerousHtml: true })).toBe('<p><b>粗</b></p>')
  })

  it('n 超过上限时被钳制', () => {
    expect(gujiToHtml(':tt[文]{n=99}')).toContain('data-guji-n="9"')
  })

  it('n 非法时按 1 处理', () => {
    expect(gujiToHtml(':tt[文]{n=abc}')).toContain('data-guji-n="1"')
  })
})

describe('指令别名', () => {
  it.each([
    [':note[注]', 'guji-jz'],
    [':add[補]', 'guji-bz'],
    [':del[刪]', 'guji-sz'],
    [':name[孔子]', 'guji-zm'],
    [':book[論語]', 'guji-sm'],
    [':space{n=1}', 'guji-kg'],
    [':raise[文]{n=1}', 'guji-tt']
  ])('%s → %s', (source, className) => {
    expect(gujiToHtml(source)).toContain(`class="${className}"`)
  })
})

describe('gujiToDocument', () => {
  const html = gujiToDocument('《論語》', { title: '論語', vertical: true })

  it('输出完整页面', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<title>論語</title>')
  })

  it('竖排时带上竖排样式与类名', () => {
    expect(html).toContain('class="guji-doc guji-vertical"')
    expect(html).toContain('writing-mode: vertical-rl')
  })

  it('转义标题中的尖括号', () => {
    expect(gujiToDocument('文', { title: '<script>' })).toContain('<title>&lt;script&gt;</title>')
  })
})
