# decision 夹具（F-OV-05）

对应 [spec/08](../../08-guji-decision.md) §七 的校验。`char.json` 是配套的最小 char（3 格），其余是 decision 样例：

| 文件 | 预期 | 触发 |
|---|---|---|
| `valid.decision.json` | 通过 | 一条 open／uncertain，一条 resolved／variant |
| `bad-current.decision.json` | F-OV-05 | `current` 与 char 该格的字不一致 |
| `bad-cell.decision.json` | F-OV-05 | `cell` 在 char 里不存在 |
| `bad-resolved-in-cands.decision.json` | F-OV-05 | `resolved` 但 `current` 仍在 `cands[].text` 里 |
| `bad-no-by.decision.json` | F-OV-05 | `rejected` 没写 `by` |

`SHA256SUMS` 是本目录文件的哈希；book-text `scripts/tests/fixtures/decision/` 保存同一份副本，单测只读副本，升 pin 时用 `sha256sum -c` 核对两边一致。
