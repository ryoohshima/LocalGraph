# プロジェクト固有の Claude Code 指示

このファイルは本プロジェクトに固有のルール・コンテキストを Claude Code に伝えるためのものでござる。
全プロジェクト共通のガイドラインは `~/.claude/CLAUDE.md` に記載されており、本ファイルはそれを補完する形で記述するでござる。

## プロジェクト概要

CSV / Excel をブラウザ内だけで可視化する、士業・税理士事務所向けのローカル完結型データ可視化ツール。
利用者のデータをサーバーへ送信しないことが製品価値の中核である。

企画・戦略・課金設計は [docs/](./docs/README.md) 配下にまとまっている。**実装方針の判断で迷ったら先に docs を読むこと。**

## 技術スタック

- 言語: TypeScript
- UI: React 19
- ビルド: Vite（静的出力・バックエンドなし）
- Lint / Format: Biome
- パッケージマネージャ: pnpm

## ディレクトリ構成

```
.
├── docs/          # 企画・設計ドキュメント
├── src/           # ソースコード
├── tasks/         # Claude Code 作業記録（todo.md / lessons.md）
├── index.html     # CSP をここで定義
└── vite.config.ts
```

## 開発コマンド

```sh
pnpm dev        # 開発サーバー起動
pnpm build      # dist/ へ静的ビルド
pnpm preview    # ビルド成果物の確認

pnpm lint       # Biome check
pnpm lint:fix   # Biome check --write
pnpm typecheck  # tsc --noEmit
```

## このリポジトリ固有の注意事項

### 絶対に破ってはならない制約

詳細は [docs/02-security-policy.md](./docs/02-security-policy.md)。これらを崩す変更は提案しないこと。

1. **通信先は 1 ドメインのみ。** `index.html` の CSP `connect-src` を緩めない
2. **利用者データを送信しない。** ファイル名・列名・セル値・集計結果をネットワークに乗せない
3. **パース処理は Web Worker 内で完結させる。** 送信経路とコード構造で分離する
4. **外部 CDN・外部フォントを使わない。** 依存はすべて自ホストしバンドルする

### 依存追加の方針

- 依存を 1 つ増やすたびに「通信先一覧・送信内容保証書」の監査面積が増える。安易に追加しない
- **DuckDB-Wasm は初期採用しない**（判断理由は [docs/04-architecture.md](./docs/04-architecture.md)）。集計は素の JS または Arquero で始め、実測で不足した時点で再検討する

### 実装上の注意

- 文字コード判定（Shift-JIS の誤判定）、Excel の日付シリアル値、銀行 CSV の方言（ヘッダー行位置・金額の符号・全角数字）は工数を食う箇所ゆえ見積もりから漏らさない

## 参照ドキュメント

- [README.md](./README.md)
- [docs/](./docs/README.md)
