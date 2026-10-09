#!/usr/bin/env python3
"""对照 schemas/ 校验规范样例（CI 用）。

  python3 scripts/check-schemas.py

查三类东西：
1. examples/spec-samples/*.json：每份都必须通过它对应的 schema；
2. spec/*.md 里的 ```json 代码块：能认出对应 schema 的都必须通过（认不出的只计数）；
3. examples/spec-samples/invalid/*.json：每份都必须**不通过**——用来证明 schema 真的拦得住
   （例：manifest 的 versions[0] 写了 license: null，曾因 prefixItems 盖过 items 而漏检）。

对应哪份 schema：看顶层 `$schema` URL（等于 schema 的 `$id`）；norm 看 `"schema": "guji-norm/0.2"`；
有 `id` 和 `versions` 的是 book-text manifest。
"""
import glob
import json
import os
import re
import sys

try:
    import jsonschema
except ImportError:
    sys.exit("缺 jsonschema：pip install jsonschema")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHEMAS = {}
for p in sorted(glob.glob(os.path.join(ROOT, "schemas", "*.schema.json"))):
    s = json.load(open(p, encoding="utf-8"))
    jsonschema.Draft202012Validator.check_schema(s)
    SCHEMAS[s["$id"]] = (os.path.basename(p), jsonschema.Draft202012Validator(s))
NORM_ID = "https://open-guji.org/schema/norm/v0.2.json"
MANIFEST_ID = "https://open-guji.org/schema/book-text/manifest/v1.json"


def pick(doc):
    if not isinstance(doc, dict):
        return None
    if doc.get("$schema") in SCHEMAS:
        return doc["$schema"]
    if doc.get("schema") == "guji-norm/0.2":
        return NORM_ID
    if "id" in doc and "versions" in doc:
        return MANIFEST_ID
    return None


def errors(sid, doc):
    return [f"{'/'.join(map(str, e.absolute_path)) or '<top>'}: {e.message[:120]}"
            for e in SCHEMAS[sid][1].iter_errors(doc)]


problems, n_ok, n_skip = [], 0, 0

for p in sorted(glob.glob(os.path.join(ROOT, "examples", "spec-samples", "*.json"))):
    rel = os.path.relpath(p, ROOT)
    doc = json.load(open(p, encoding="utf-8"))
    sid = pick(doc)
    if sid is None:
        problems.append(f"{rel}: 认不出对应哪份 schema")
        continue
    errs = errors(sid, doc)
    if errs:
        problems += [f"{rel}（{SCHEMAS[sid][0]}）: {e}" for e in errs]
    else:
        n_ok += 1

BLOCK = re.compile(r"```json\n(.*?)```", re.S)
for p in sorted(glob.glob(os.path.join(ROOT, "spec", "*.md"))):
    rel = os.path.relpath(p, ROOT)
    for i, blk in enumerate(BLOCK.findall(open(p, encoding="utf-8").read()), 1):
        try:
            doc = json.loads(blk)
        except ValueError:
            n_skip += 1
            continue
        sid = pick(doc)
        if sid is None:
            n_skip += 1
            continue
        errs = errors(sid, doc)
        if errs:
            problems += [f"{rel} 第 {i} 个 json 块（{SCHEMAS[sid][0]}）: {e}" for e in errs]
        else:
            n_ok += 1

n_neg = 0
for p in sorted(glob.glob(os.path.join(ROOT, "examples", "spec-samples", "invalid", "*.json"))):
    rel = os.path.relpath(p, ROOT)
    doc = json.load(open(p, encoding="utf-8"))
    sid = pick(doc)
    if sid is None:
        problems.append(f"{rel}: 认不出对应哪份 schema")
    elif not errors(sid, doc):
        problems.append(f"{rel}: 应当不通过 {SCHEMAS[sid][0]}，却通过了（schema 没拦住）")
    else:
        n_neg += 1

print(f"schema {len(SCHEMAS)} 份；通过 {n_ok} 份样例／示例；反例 {n_neg} 份按预期被拦；跳过认不出的 json 块 {n_skip} 个")
if problems:
    print("\n".join("✗ " + x for x in problems))
    sys.exit(1)
print("✓ 全部符合")
