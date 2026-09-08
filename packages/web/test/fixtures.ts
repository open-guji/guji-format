import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface GujiCase {
  name: string
  note?: string
  guji: string
  directive: string
  html?: string
  options?: Record<string, unknown>
}

const doc = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../spec/fixtures/cases.json', import.meta.url)), 'utf8')
) as { version: string; cases: GujiCase[] }

export const SPEC_FIXTURE_VERSION = doc.version
export const cases = doc.cases
