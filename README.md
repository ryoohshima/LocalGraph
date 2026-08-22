# LocalGraph

CSV / Excel をブラウザ内だけで可視化する、士業・税理士事務所向けのローカル完結型データ可視化ツール。

**利用者のデータはサーバーへ一切送信しない。** 通信先はライセンス検証エンドポイント 1 つのみに固定する。

企画・設計の詳細は [docs/](./docs/README.md) を参照。

## 技術スタック

| 領域 | 採用 |
| --- | --- |
| ビルド | Vite（静的出力） |
| UI | React + TypeScript |
| Lint / Format | Biome |
| パッケージマネージャ | pnpm |

単一画面の対話型ツールであり、ルーティングもコンテンツページも持たないため、SSR/SSG フレームワークは採用しない。

## セットアップ

```sh
pnpm install
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

## ディレクトリ構成

```
.
├── docs/          # 企画・設計ドキュメント
├── src/           # ソースコード
├── tasks/         # Claude Code 作業記録
├── index.html     # CSP をここで定義
└── vite.config.ts
```

## 設計上の絶対制約

以下は本製品の存在意義に直結するため、変更しないこと。詳細は [docs/02-security-policy.md](./docs/02-security-policy.md)。

1. 通信先は 1 ドメインのみ（CSP で固定）
2. 送信内容はライセンスキーと起動イベントのみ。ファイルの中身は送らない
3. パース処理は Web Worker 内で完結させる
4. 外部 CDN・外部フォントを使用しない（すべて自ホスト）
