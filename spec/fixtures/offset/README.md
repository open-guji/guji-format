# 字下标用例（00 §4.2）

`char.json` 是一章的 char；`expected.json` 是每个格位 key 的字下标。各端的 `offset_of(anchor, char)` 必须逐条对上，并对 `missing` 里的 key 报「查不到」。
