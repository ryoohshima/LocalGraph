/** 顧問先ごとの作業単位。データセットの所属先となる。 */
export type Workspace = {
  id: string;
  name: string;
  createdAt: number;
};

export type ColumnMeta = {
  name: string;
  index: number;
  inferred: "date" | "number" | "category" | "text";
};

export type Dataset = {
  id: string;
  workspaceId: string;
  name: string;
  sourceFileName: string;
  columns: ColumnMeta[];
  rowCount: number;
  createdAt: number;
};

export type ColumnMapping = {
  dateColumn: number | null;
  valueColumn: number | null;
  categoryColumns: number[];
  filterColumns: number[];
};

export type MappingPreset = {
  id: string;
  name: string;
  /** ヘッダー列名の連結ハッシュ。同一フォーマットの再投入時に自動適用する */
  headerFingerprint: string;
  mapping: ColumnMapping;
};

/**
 * 行データはデータセットごと 1 レコードで丸ごと保持する。
 * ponytail: 数万行までを想定した単純化。10 万行超で体感が落ちたら
 * チャンク分割（{ datasetId, chunkIndex, rows }）へ移行する。
 */
export type DatasetRows = {
  datasetId: string;
  rows: unknown[][];
};
