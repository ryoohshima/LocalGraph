import Dexie, { type EntityTable } from "dexie";
import type { Dataset, DatasetRows, MappingPreset, Workspace } from "./types";

export const db = new Dexie("localgraph") as Dexie & {
  workspaces: EntityTable<Workspace, "id">;
  datasets: EntityTable<Dataset, "id">;
  datasetRows: EntityTable<DatasetRows, "datasetId">;
  mappingPresets: EntityTable<MappingPreset, "id">;
};

db.version(1).stores({
  workspaces: "id",
  datasets: "id, workspaceId",
  datasetRows: "datasetId",
  // headerFingerprint は同一フォーマット再投入時の引き当てキー。重複させない
  mappingPresets: "id, &headerFingerprint",
});

/**
 * データセットと行データをまとめて保存する。
 *
 * ponytail: 行データはデータセットごと 1 レコードで丸ごと保持する。想定上限は 10 万行程度で、
 * それを超えて読み込みが重くなったら datasetRows を { datasetId, chunkIndex, rows } の
 * チャンク分割へ移行する。
 */
export function saveDataset(
  dataset: Dataset,
  rows: unknown[][],
): Promise<void> {
  return db.transaction("rw", db.datasets, db.datasetRows, async () => {
    await db.datasets.put(dataset);
    await db.datasetRows.put({ datasetId: dataset.id, rows });
  });
}

/** 見つからなければ null を返す。 */
export function getDataset(
  id: string,
): Promise<{ dataset: Dataset; rows: unknown[][] } | null> {
  return db.transaction("r", db.datasets, db.datasetRows, async () => {
    const dataset = await db.datasets.get(id);
    if (!dataset) return null;
    const stored = await db.datasetRows.get(id);
    return { dataset, rows: stored?.rows ?? [] };
  });
}

/** 行データも併せて削除する。 */
export function deleteDataset(id: string): Promise<void> {
  return db.transaction("rw", db.datasets, db.datasetRows, async () => {
    await db.datasets.delete(id);
    await db.datasetRows.delete(id);
  });
}
