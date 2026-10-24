import { describe, expect, it } from 'vitest'
import { gujiCss, gujiToDocument, gujiToHtml, SPEC_VERSION } from '../src/index.js'
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

describe('图 tu', () => {
  const figs: Record<string, { src: string; width?: number; height?: number }> = {
    'f148-2-14': { src: 'fig/005/f148-2-14.png', width: 40, height: 40 },
    'p52-fig1': { src: 'fig/005/p52-fig1.webp' }
  }
  const resolveFigure = (id: string) => figs[id]

  it('图片格查到图：span 里放 img，alt 取说明', () => {
    expect(gujiToHtml('圖作:tu[左半圈连一实点]{id=f148-2-14}形', { resolveFigure })).toBe(
      '<p>圖作<span class="guji-tu" data-guji-id="f148-2-14"><img class="guji-tu-img" src="fig/005/f148-2-14.png" alt="左半圈连一实点" width="40" height="40"></span>形</p>'
    )
  })

  it('插图块查到图：figure 里放 img，没给尺寸就不写', () => {
    expect(gujiToHtml('::tu[河圖]{id=p52-fig1}', { resolveFigure })).toBe(
      '<figure class="guji-tu guji-tu-block" data-guji-id="p52-fig1"><img class="guji-tu-img" src="fig/005/p52-fig1.webp" alt="河圖"></figure>'
    )
  })

  it('id 查不到、没写 id：退回〔图：说明〕', () => {
    expect(gujiToHtml(':tu[卦]{id=nope}', { resolveFigure })).toContain('〔图：卦〕')
    expect(gujiToHtml(':tu[卦]', { resolveFigure })).toContain('〔图：卦〕')
  })

  it('说明里有别的指令：alt 只取文字', () => {
    expect(gujiToHtml('::tu[九宫[图]]{id=p52-fig1}', { resolveFigure })).toContain('alt="九宫图"')
  })

  it('样式表有图的规则', () => {
    expect(gujiCss).toContain('.guji-tu-img')
    expect(gujiCss).toContain('.guji-tu-block')
  })
})

describe('校勘三式互相区分', () => {
  const html = gujiToHtml('改：[甲]{{乙}}；刪：{{丙}}；補：((丁))。')

  it('改字是 ins.guji-gz，删字是 del.guji-sz', () => {
    expect(html).toContain('<ins class="guji-gz">甲</ins><del class="guji-sz">乙</del>')
  })

  it('单纯删字只出 del', () => {
    expect(html).toContain('刪：<del class="guji-sz">丙</del>')
  })

  it('单纯补字是 ins.guji-bz，与改字的 class 不同', () => {
    expect(html).toContain('補：<ins class="guji-bz">丁</ins>')
  })

  it('三种记号各出现一次，互不混淆', () => {
    expect(html.match(/guji-gz/g)).toHaveLength(1)
    expect(html.match(/guji-bz/g)).toHaveLength(1)
    expect(html.match(/guji-sz/g)).toHaveLength(2)
  })

  it('样式表给三者不同的颜色，且清掉了 ins 的默认下划线', () => {
    expect(gujiCss).toContain('--guji-bz-color')
    expect(gujiCss).toContain('--guji-sz-color')
    expect(gujiCss).toContain('--guji-gz-color')
    expect(/\.guji-bz,\s*\n\.guji-gz \{\s*\n\s*text-decoration: none;/.test(gujiCss)).toBe(true)
  })
})

describe('指令别名', () => {
  it.each([
    [':note[注]', 'guji-jz'],
    [':add[補]', 'guji-bz'],
    [':del[刪]', 'guji-sz'],
    [':sub[改]', 'guji-gz'],
    [':amend[改]', 'guji-gz'],
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
