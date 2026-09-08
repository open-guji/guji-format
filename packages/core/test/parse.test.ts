import { describe, expect, it } from 'vitest'
import { formatDirective, parseGuji } from '../src/index.js'

function firstParagraph(source: string): any {
  const tree = parseGuji(source)
  return tree.children[0]
}

describe('parseGuji', () => {
  it('把夹注解析成 textDirective', () => {
    const p = firstParagraph('子曰<孔子也>。')
    expect(p.children[1]).toMatchObject({
      type: 'textDirective',
      name: 'jz',
      children: [{ type: 'text', value: '孔子也' }]
    })
  })

  it('把别名归一到规范名', () => {
    const p = firstParagraph(':note[小注]')
    expect(p.children[0]).toMatchObject({ type: 'textDirective', name: 'jz' })
  })

  it('抬头标记吸收到行尾的内容', () => {
    const p = firstParagraph('臣某言。\n^陛下嗣位')
    expect(p.children[0]).toMatchObject({ type: 'text', value: '臣某言。\n' })
    expect(p.children[1]).toMatchObject({
      type: 'textDirective',
      name: 'tt',
      attributes: { n: '1' },
      children: [{ type: 'text', value: '陛下嗣位' }]
    })
    expect(p.children).toHaveLength(2)
  })

  it('抬头只吸收本行，硬换行后的内容留在外面', () => {
    const p = firstParagraph('^陛下嗣位  \n臣某言。')
    expect(p.children[0]).toMatchObject({ name: 'tt' })
    expect(p.children[0].children).toHaveLength(1)
    expect(p.children[1]).toMatchObject({ type: 'break' })
    expect(p.children[2]).toMatchObject({ type: 'text', value: '臣某言。' })
  })

  it('抬头吸收同一行内的其他指令', () => {
    const p = firstParagraph('^.文')
    expect(p.children[0].name).toBe('tt')
    expect(p.children[0].children[0]).toMatchObject({ name: 'kg', attributes: { n: '1' } })
  })

  it('空格是自足标记，不吸收后续内容', () => {
    const p = firstParagraph('.皇上聖明')
    expect(p.children[0]).toMatchObject({ name: 'kg', children: [] })
    expect(p.children[1]).toMatchObject({ type: 'text', value: '皇上聖明' })
  })

  it('代码块内不做转换', () => {
    const tree = parseGuji('```\n<注>\n```')
    expect(tree.children[0]).toMatchObject({ type: 'code', value: '<注>' })
  })

  it('shorthand: false 时只认显式指令', () => {
    const tree = parseGuji('子曰<孔子也>。', { shorthand: false })
    const p: any = tree.children[0]
    expect(p.children.every((c: any) => c.type !== 'textDirective')).toBe(true)
  })
})

describe('formatDirective', () => {
  it('mdast 回写为 Directive Markdown', () => {
    const tree = parseGuji('子曰<孔子也>。', { lineScope: false })
    expect(formatDirective(tree).trim()).toBe('子曰:jz[孔子也]。')
  })
})
