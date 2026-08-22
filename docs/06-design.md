# 全体設計

実装着手前の設計。ここで決めた制約と構造を前提に [07-roadmap.md](./07-roadmap.md) のフェーズを進める。

## 1. 設計の前提

| 前提 | 内容 |
| --- | --- |
| バックエンド | ライセンス検証エンドポイント 1 本のみ。アプリ本体は静的配信 |
| 想定データ量 | 明細 CSV で数万行 / 1 ファイル |
| 対応ブラウザ | Chrome / Edge の直近 2 年程度。ロックダウンされた企業端末が対象のため、最新機能に依存しない |
| 実装者 | 1 名。抽象化より読みやすさと削除しやすさを優先する |

## 2. 画面フロー

```
[1] ファイル投入        ドラッグ&ドロップ / ファイル選択
      ↓
[2] プレビュー & マッピング   先頭 N 行の表示、列の型推定、軸の割り当て
      ↓                      （ヘッダーが既知ならプリセットを自動適用して [3] へ直行）
[3] ダッシュボード        集計・グラフ・フィルタ
```

保存済みデータセットの一覧からは [3] へ直接入る。

## 3. ディレクトリ構成

```
src/
├── main.tsx
├── App.tsx
├── worker/
│   ├── parse.worker.ts   # パース・型推定。ネットワーク API を持ち込まない
│   └── protocol.ts       # メインスレッドとの型付きメッセージ定義
├── data/
│   ├── types.ts          # ドメイン型
│   ├── db.ts             # Dexie スキーマ
│   ├── encoding.ts       # 文字コード判定
│   └── infer.ts          # 列の型推定
├── mapping/              # 列マッピング UI とプリセット
├── aggregate/            # 集計（素の JS）
├── charts/               # ECharts ラッパ
├── license/              # 署名検証・エディション判定（メインスレッド専用）
└── ui/                   # 共通コンポーネント
```

## 4. ドメインモデル

```ts
type Workspace = {
  id: string;
  name: string;        // 顧問先名
  createdAt: number;
};

type ColumnMeta = {
  name: string;
  index: number;
  inferred: "date" | "number" | "category" | "text";
};

type Dataset = {
  id: string;
  workspaceId: string;
  name: string;
  sourceFileName: string;
  columns: ColumnMeta[];
  rowCount: number;
  createdAt: number;
};

type ColumnMapping = {
  dateColumn: number | null;
  valueColumn: number | null;
  categoryColumns: number[];
  filterColumns: number[];
};

type MappingPreset = {
  id: string;
  name: string;
  headerFingerprint: string;  // ヘッダー列名の連結ハッシュ。同一フォーマットの再投入時に自動適用する
  mapping: ColumnMapping;
};
```

### 4.1 行データの保持方針

行データは `Dataset` とは別テーブルに、**データセットごと 1 レコードで丸ごと保存**する。

```ts
type DatasetRows = { datasetId: string; rows: unknown[][] };
```

> `ponytail:` 数万行までを想定した単純化。1 レコードに全行を持つため、読み込みは常に全件になる。10 万行超で体感が落ちたらチャンク分割（`{ datasetId, chunkIndex, rows }`）へ移行する。

列指向ストレージや DuckDB-Wasm は現時点で採用しない（[04-architecture.md](./04-architecture.md) §3.1）。

## 5. Worker 境界

「パース処理を Worker 内で完結させる」（[02-security-policy.md](./02-security-policy.md) 条件 3）をコード構造で担保する。

### 5.1 メッセージプロトコル

```ts
// メイン → Worker
type ParseRequest = {
  type: "parse";
  id: string;
  file: File;
  kind: "csv" | "xlsx";
};

// Worker → メイン
type ParseProgress = { type: "progress"; id: string; rows: number };
type ParseResult = {
  type: "result";
  id: string;
  columns: ColumnMeta[];
  rows: unknown[][];
};
type ParseError = { type: "error"; id: string; message: string };
```

### 5.2 遵守事項

- **Worker 内では `fetch` / `XMLHttpRequest` / `WebSocket` を一切使わない。** レビュー時の機械的チェック対象とする
- **`license/` はメインスレッド専用。** Worker から import しない
- File オブジェクトは structured clone で渡す。メインスレッド側でファイル内容を読み出さない

この分離により「データはネットワークに乗り得ない」ことがコードの配置で説明できる。

## 6. 文字コード判定

**PapaParse は Shift-JIS を自動判別しない。** 自前で判定してから文字列としてパースに渡す。

判定手順：

1. BOM があれば UTF-8 として確定
2. `new TextDecoder("utf-8", { fatal: true })` でデコードを試みる
3. 例外が出たら `TextDecoder("shift_jis")` でデコードする

日本の銀行・カード会社の CSV は実質 UTF-8 か CP932（Shift-JIS）のいずれかであり、この 2 択で足りる。

> `ponytail:` EUC-JP・UTF-16 は非対応。実際に持ち込まれたら判定を追加する。

## 7. 集計エンジン

素の JavaScript で実装する。

```
rows → フィルタ適用 → 日付を集計単位へ丸める（日/週/月/年）
     → カテゴリ列でグルーピング → 合計 / 平均 / 件数
     → { labels: string[], series: { name, values }[] }
```

- ライブラリ（Arquero / DuckDB-Wasm）は入れない。数万行の `groupBy` + `reduce` は素の JS で十分
- 出力形式はチャート層が直接受け取れる形に固定し、変換層を挟まない
- 金額列の型変換は集計前に一度だけ行う（`1,234` / `▲1,234` / `(1,234)` / 全角数字に対応）

## 8. 可視化ライブラリ：Apache ECharts を採用

| | ECharts | Chart.js |
| --- | --- | --- |
| ヒートマップ | 標準搭載 | 別プラグインが必要 |
| 期間の絞り込み UI（dataZoom） | 標準搭載 | 別プラグインが必要 |
| バンドルサイズ | 大きい（tree-shaking 前提） | 小さい |

要件（[04-architecture.md](./04-architecture.md) §C）にヒートマップと日付範囲絞り込みが含まれるため、Chart.js では追加プラグインが 2 つ必要になる。**依存を 1 つ増やすたびに「通信先一覧・送信内容保証書」の監査面積が増える**という自らの制約に照らせば、1 ライブラリで完結する ECharts が正しい。

- 必要なチャート・コンポーネントのみを個別 import する（`echarts/core` からの tree-shaking）
- ラッパは `charts/` に 1 枚だけ置く。**Chart.js と両対応するような抽象化は作らない**

## 9. 状態管理

React の `useReducer` + Context のみ。状態管理ライブラリは導入しない。

- 扱う状態は「現在のワークスペース」「現在のデータセット」「マッピング」「フィルタ」の 4 つ程度
- ページ遷移がなく、状態の共有範囲も浅い

## 10. ライセンス検証（Phase 6 の設計方針）

- **ECDSA P-256 + WebCrypto (`crypto.subtle.verify`)**。Ed25519 はブラウザ対応が新しく、対象である企業端末の古いブラウザで動かない可能性があるため採用しない
- 公開鍵はバンドルに埋め込む。ライセンスキーはサーバーが署名した JSON（エディション・有効期限・発行先）
- **オフライン版**は同じ検証コードを使い、キーをファイルから読む。通信経路の有無だけが違う
- 送信するのはライセンスキー・アプリバージョン・起動日時のみ（[02-security-policy.md](./02-security-policy.md) 条件 2）

## 11. 追加予定の依存

必要になったフェーズで初めて追加する。

| ライブラリ | 用途 | フェーズ |
| --- | --- | --- |
| `papaparse` | CSV パース | 2 |
| `xlsx` (SheetJS) | Excel パース | 2 |
| `dexie` | IndexedDB ラッパ | 1 |
| `echarts` | 可視化 | 4 |
| `vite-plugin-pwa` | オフライン化 | 6 |

PDF 出力（Phase 7）はブラウザの印刷機能（`window.print()` + 印刷用 CSS）で実現できないか先に検証し、駄目なら初めてライブラリを検討する。
