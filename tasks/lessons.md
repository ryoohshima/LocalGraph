# 教訓

## rtk フックが `pnpm lint` の結果を偽装する

**症状**: ローカルで `pnpm lint` / `pnpm exec biome check .` を実行すると `Lint: No issues found`
と表示されるが、CI では同じコマンドが format エラーで落ちた。rtk フックがコマンドを書き換え、
出力をフィルタしていたため、フォーマット差分が握り潰されていた。

**ルール**: push 前の lint / format 確認は必ず `./node_modules/.bin/biome check .` のように
バイナリを直接叩いて exit code を確認する。`pnpm` 経由の結果を信用しない。
`tsc` / `vitest` も同様に `./node_modules/.bin/` から実行する。

## claude-review ワークフローは常に失敗する（環境要因）

`CLAUDE_CODE_OAUTH_TOKEN` シークレットがリポジトリに未設定のため、全 PR で `claude-review` が
失敗する。コードの問題ではないので調査を繰り返さない。マージ可否は `check` ジョブで判断する。
