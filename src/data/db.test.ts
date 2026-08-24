import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import { db, deleteDataset, getDataset, saveDataset } from "./db";
import type { Dataset } from "./types";

const dataset: Dataset = {
  id: "ds-1",
  workspaceId: "ws-1",
  name: "2026年8月 明細",
  sourceFileName: "meisai.csv",
  columns: [
    { name: "日付", index: 0, inferred: "date" },
    { name: "金額", index: 1, inferred: "number" },
  ],
  rowCount: 2,
  createdAt: 0,
};
const rows: unknown[][] = [
  ["2026-08-01", 1234],
  ["2026-08-02", -567],
];

beforeEach(async () => {
  await db.open();
  await Promise.all([db.datasets.clear(), db.datasetRows.clear()]);
});

it("保存したデータセットを行データごと読み出し、削除で両方消える", async () => {
  await saveDataset(dataset, rows);

  expect(await getDataset("ds-1")).toEqual({ dataset, rows });

  await deleteDataset("ds-1");

  expect(await getDataset("ds-1")).toBeNull();
  expect(await db.datasetRows.count()).toBe(0);
});
