#!/usr/bin/env node
/**
 * 发布前自检。跑真实的 `pnpm pack`，然后检查产物本身——
 * 而不是检查源码里"应该"是什么样。
 *
 *   node scripts/release-check.mjs
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = ['core', 'web', 'pdf']

const problems = []
const notes = []

function fail(message) {
  problems.push(message)
}

function read(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function sh(command, args, cwd = root) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

// ---------------------------------------------------------------- 版本一致

const manifests = Object.fromEntries(
  PACKAGES.map((name) => [name, read(join(root, 'packages', name, 'package.json'))])
)
const versions = new Set(Object.values(manifests).map((m) => m.version))
if (versions.size !== 1) {
  fail(`三个包的版本不一致：${PACKAGES.map((n) => `${n}=${manifests[n].version}`).join(' ')}`)
}
const version = manifests.core.version

// 规范版本：各包声明的 SPEC_VERSION 必须与语料一致
const specVersion = read(join(root, 'spec/fixtures/cases.json')).version
for (const name of PACKAGES) {
  const source = readFileSync(join(root, 'packages', name, 'src/index.ts'), 'utf8')
  const declared = /SPEC_VERSION\s*=\s*'([^']+)'/.exec(source)?.[1]
  if (declared !== specVersion) {
    fail(`packages/${name} 的 SPEC_VERSION=${declared}，与语料的 ${specVersion} 不一致`)
  }
}

// ------------------------------------------------------------ 清单必备字段

for (const name of PACKAGES) {
  const m = manifests[name]
  const at = `packages/${name}/package.json`
  if (m.private) fail(`${at}: private 为真，不会被发布`)
  if (m.publishConfig?.access !== 'public') {
    fail(`${at}: 作用域包首次发布默认私有，需要 publishConfig.access = "public"`)
  }
  for (const field of ['description', 'license', 'repository', 'exports', 'files']) {
    if (!m[field]) fail(`${at}: 缺少 ${field}`)
  }
  if (!m.scripts?.prepack) {
    fail(`${at}: 缺少 prepack，pack 时不会重新构建`)
  }
}

// -------------------------------------------------------- 工作区与仓库状态

const status = sh('git', ['status', '--porcelain']).trim()
if (status) notes.push(`工作区有未提交的改动（pnpm publish 默认会拒绝）：\n${status}`)

const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim()
// pnpm 的默认发布分支是 master，本仓库在 .npmrc 里改成了 main
let publishBranch = 'master'
try {
  publishBranch = sh('pnpm', ['config', 'get', 'publish-branch']).trim() || 'master'
} catch {
  /* 取不到就按 pnpm 的默认值判断 */
}
if (publishBranch === 'undefined') publishBranch = 'master'
if (branch !== publishBranch) {
  notes.push(`当前分支是 ${branch}，pnpm publish 只允许在 ${publishBranch} 上发布`)
}

for (const name of PACKAGES) {
  const tag = `v${version}`
  try {
    sh('git', ['rev-parse', '--verify', `refs/tags/${tag}`])
    notes.push(`标签 ${tag} 已存在——${version} 可能已经发过`)
    break
  } catch {
    /* 标签不存在，正常 */
  }
}

// ------------------------------------------------------------- 真实打包检查

const out = mkdtempSync(join(tmpdir(), 'guji-pack-'))
try {
  for (const name of PACKAGES) {
    const cwd = join(root, 'packages', name)
    sh('pnpm', ['pack', '--pack-destination', out], cwd)

    const tarball = join(out, `${manifests[name].name.replace('@', '').replace('/', '-')}-${version}.tgz`)
    if (!existsSync(tarball)) {
      fail(`packages/${name}: 没有生成 ${tarball}`)
      continue
    }

    const entries = sh('tar', ['tzf', tarball])
      .split('\n')
      .filter(Boolean)
      .map((line) => line.replace(/^package\//, ''))

    // 产物里的 package.json 才是真正发布出去的那份
    const published = JSON.parse(sh('tar', ['xzOf', tarball, 'package/package.json']))

    for (const [dep, range] of Object.entries({
      ...published.dependencies,
      ...published.peerDependencies
    })) {
      if (String(range).startsWith('workspace:')) {
        fail(`packages/${name}: 产物里残留 workspace 协议 ${dep}@${range}——请用 pnpm 而不是 npm 发布`)
      }
    }

    // exports 指到的每个文件都得真在包里
    const targets = []
    const walk = (value) => {
      if (typeof value === 'string') targets.push(value)
      else if (value && typeof value === 'object') Object.values(value).forEach(walk)
    }
    walk(published.exports)
    if (published.bin) walk(published.bin)
    for (const target of targets) {
      const relative = target.replace(/^\.\//, '')
      if (!entries.includes(relative)) {
        fail(`packages/${name}: exports/bin 指向 ${target}，但产物里没有这个文件`)
      }
    }

    for (const required of ['README.md', 'LICENSE']) {
      if (!entries.includes(required)) fail(`packages/${name}: 产物缺少 ${required}`)
    }
    if (entries.some((e) => e.startsWith('src/') || e.startsWith('test/'))) {
      notes.push(`packages/${name}: 产物包含 src/ 或 test/，确认是有意为之`)
    }

    const bytes = readFileSync(tarball).length
    console.log(
      `  ${published.name.padEnd(28)} ${String(version).padEnd(8)} ` +
        `${entries.length} 个文件  ${(bytes / 1024).toFixed(1)} KiB`
    )
  }
} finally {
  rmSync(out, { recursive: true, force: true })
}

// ------------------------------------------------------------------- 汇总

console.log()
for (const note of notes) console.log(`注意  ${note}`)
if (problems.length === 0) {
  console.log(`\n通过。可以发布 ${version}。`)
} else {
  console.log()
  for (const problem of problems) console.error(`错误  ${problem}`)
  console.error(`\n${problems.length} 项未通过，先修好再发布。`)
  process.exitCode = 1
}
