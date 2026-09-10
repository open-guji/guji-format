import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAX_SPAN_LENGTH,
  gujiToDirective,
  gujiToDirectiveWithReport,
  resolveMaxSpanLength,
  type OverflowEvent
} from '../src/index.js'

/** 造一条 n 字的纯 CJK 内容。 */
const 造 = (n: number): string => '甲'.repeat(n)

describe('长度上限的解析', () => {
  it('不传则用默认：夹注 4096，其余 64', () => {
    expect(resolveMaxSpanLength(undefined)).toEqual(DEFAULT_MAX_SPAN_LENGTH)
    expect(DEFAULT_MAX_SPAN_LENGTH.jz).toBe(4096)
    for (const m of ['bz', 'sz', 'gz', 'zm', 'sm'] as const) {
      expect(DEFAULT_MAX_SPAN_LENGTH[m]).toBe(64)
    }
  })

  it('给一个数就是六种记号一律用它，夹注不留隐藏例外', () => {
    const r = resolveMaxSpanLength(100)
    for (const m of ['jz', 'bz', 'sz', 'gz', 'zm', 'sm', 'default'] as const) {
      expect(r[m]).toBe(100)
    }
  })

  it('给表则缺项落到 default，default 缺则 64', () => {
    expect(resolveMaxSpanLength({ jz: 999 })).toMatchObject({
      jz: 999, bz: 64, sz: 64, gz: 64, zm: 64, sm: 64
    })
    expect(resolveMaxSpanLength({ default: 8, sm: 3 })).toMatchObject({
      jz: 8, bz: 8, sz: 8, gz: 8, zm: 8, sm: 3
    })
  })
})

describe('默认上限下的实际行为', () => {
  it('夹注 4096 字以内照常识别——古籍夹注天然长', () => {
    for (const n of [65, 364, 1000, 3212, 4096]) {
      expect(gujiToDirective(`正文<${造(n)}>`)).toBe(`正文:jz[${造(n)}]`)
    }
  })

  it('夹注超过 4096 才按字面', () => {
    const s = `正文<${造(4097)}>`
    expect(gujiToDirective(s)).toBe(s)
  })

  it('书名号仍守 64——书名天然短，放宽会放掉误配对的防线', () => {
    expect(gujiToDirective(`《${造(64)}》`)).toBe(`:sm[${造(64)}]`)
    expect(gujiToDirective(`《${造(65)}》`)).toBe(`《${造(65)}》`)
  })

  it('改字、专名号、补字、删字同样仍守 64', () => {
    expect(gujiToDirective(`[${造(65)}]`)).toBe(`[${造(65)}]`)
    expect(gujiToDirective(`甲 /${造(65)}/ 乙`)).toBe(`甲 /${造(65)}/ 乙`)
    expect(gujiToDirective(`((${造(65)}))`)).toBe(`((${造(65)}))`)
    expect(gujiToDirective(`{{${造(65)}}}`)).toBe(`{{${造(65)}}}`)
  })
})

describe('降级必须可数——这是上限唯一的可观测出口', () => {
  it('未超限时 overflows 为空，text 与 gujiToDirective 一字不差', () => {
    const src = '子曰<孔子也>，見《論語》。'
    const r = gujiToDirectiveWithReport(src)
    expect(r.overflows).toEqual([])
    expect(r.text).toBe(gujiToDirective(src))
    expect(r.overflowCounts).toEqual({ jz: 0, bz: 0, sz: 0, gz: 0, zm: 0, sm: 0 })
  })

  it('超限时按字面输出，同时记一条事件', () => {
    const r = gujiToDirectiveWithReport(`《${造(70)}》`)
    expect(r.text).toBe(`《${造(70)}》`)
    expect(r.overflows).toHaveLength(1)
    expect(r.overflows[0]).toMatchObject({ mark: 'sm', line: 1, column: 1, length: 70, limit: 64 })
    expect(r.overflows[0].preview).toBe(造(40))
    expect(r.overflowCounts.sm).toBe(1)
  })

  it('六种记号都报得出来', () => {
    const 样 = {
      jz: `<${造(70)}>`,
      bz: `((${造(70)}))`,
      sz: `{{${造(70)}}}`,
      gz: `[${造(70)}]`,
      zm: `甲 /${造(70)}/ 乙`,
      sm: `《${造(70)}》`
    }
    for (const [mark, src] of Object.entries(样)) {
      const r = gujiToDirectiveWithReport(src, { maxSpanLength: 64 })
      expect(r.text, mark).toBe(src)
      expect(r.overflowCounts[mark as keyof typeof r.overflowCounts], mark).toBe(1)
    }
  })

  it('行号与列号指得回源文', () => {
    const src = ['头一行', '正文正文《' + 造(70) + '》尾', '末一行'].join('\n')
    const r = gujiToDirectiveWithReport(src)
    expect(r.overflows).toHaveLength(1)
    const ev = r.overflows[0]
    expect(ev.line).toBe(2)
    // column 是 1 起，指向起始记号本身
    expect(src.split('\n')[ev.line - 1][ev.column - 1]).toBe('《')
  })

  it('行首前缀与抬头标记被剥掉后，列号仍指得准', () => {
    const src = '> - ^^..正文《' + 造(70) + '》'
    const r = gujiToDirectiveWithReport(src)
    expect(r.overflows).toHaveLength(1)
    expect(src[r.overflows[0].column - 1]).toBe('《')
  })

  it('一行多处、多行多处都逐一记账', () => {
    const 行 = `《${造(70)}》和《${造(80)}》`
    const r = gujiToDirectiveWithReport([行, 行, '干净的《論語》'].join('\n'))
    expect(r.overflows).toHaveLength(4)
    expect(r.overflowCounts.sm).toBe(4)
    expect(r.overflows.map((e) => e.line)).toEqual([1, 1, 2, 2])
    expect(r.overflows.map((e) => e.length)).toEqual([70, 80, 70, 80])
  })

  it('onOverflow 回调与 withReport 可以并用，互不吞事件', () => {
    const 收 : OverflowEvent[] = []
    const r = gujiToDirectiveWithReport(`《${造(70)}》`, { onOverflow: (e) => 收.push(e) })
    expect(收).toHaveLength(1)
    expect(r.overflows).toEqual(收)
  })

  it('未闭合、无配对的记号不算降级——只有「本可成立却因超长而作罢」才记', () => {
    // 这三条都是压根没有合法配对，与长度无关
    for (const src of ['子曰<孔子也', '《春秋', '甲 /孔子 乙']) {
      expect(gujiToDirectiveWithReport(src).overflows).toEqual([])
    }
    // 内容不含 CJK、被 requireCjk 挡掉的，也不算降级
    expect(gujiToDirectiveWithReport(`/${'a'.repeat(70)}/`).overflows).toEqual([])
  })

  it('不生效区里的记号不算降级', () => {
    expect(gujiToDirectiveWithReport('`《' + 造(70) + '》`').overflows).toEqual([])
    expect(gujiToDirectiveWithReport(['```', '《' + 造(70) + '》', '```'].join('\n')).overflows)
      .toEqual([])
  })

  it('嵌套内层超限也报得出来', () => {
    const r = gujiToDirectiveWithReport(`<注文《${造(70)}》>`)
    expect(r.overflowCounts.sm).toBe(1)
    expect(r.text).toBe(`:jz[注文《${造(70)}》]`)
  })
})
