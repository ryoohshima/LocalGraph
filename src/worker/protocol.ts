import type { ColumnMeta } from "../data/types";

/** メイン → Worker */
export type ParseRequest = {
  type: "parse";
  id: string;
  file: File;
  kind: "csv" | "xlsx";
};

/** Worker → メイン */
export type ParseProgress = { type: "progress"; id: string; rows: number };
export type ParseResult = {
  type: "result";
  id: string;
  columns: ColumnMeta[];
  rows: unknown[][];
};
export type ParseError = { type: "error"; id: string; message: string };

export type ParseResponse = ParseProgress | ParseResult | ParseError;
