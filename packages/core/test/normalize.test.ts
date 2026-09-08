import { describe, expect, it } from 'vitest'
import { gujiToDirective, SPEC_VERSION } from '../src/index.js'
import { cases, SPEC_FIXTURE_VERSION } from './fixtures.js'

describe('规范化语料', () => {
  it('实现的规范版本与语料一致', () => {
    expect(SPEC_VERSION).toBe(SPEC_FIXTURE_VERSION)
  })

  for (const c of cases) {
    it(`${c.name}${c.note ? ' — ' + c.note : ''}`, () => {
      expect(gujiToDirective(c.guji, c.options)).toBe(c.directive)
    })
  }
})

describe('幂等', () => {
  for (const c of cases) {
    it(c.name, () => {
      expect(gujiToDirective(c.directive, c.options)).toBe(c.directive)
    })
  }
})

describe('行数守恒', () => {
  for (const c of cases) {
    it(c.name, () => {
      const before = c.guji.split('\n').length
      const after = gujiToDirective(c.guji, c.options).split('\n').length
      expect(after).toBe(before)
    })
  }
})
