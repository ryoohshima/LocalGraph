import type { ParseRequest, ParseResponse } from "./protocol";

/**
 * パース要求 1 件に対する応答を組み立てる。Worker 側の本体であり、
 * `parse.worker.ts` はこれを postMessage で包むだけの薄い殻である。
 *
 * このモジュールと `parse.worker.ts` にはネットワーク API を持ち込まず、
 * `src/license/` も import しない（docs/02-security-policy.md 条件 3）。
 * 逸脱は `client.test.ts` の走査で検出する。
 */
export async function respondTo(request: ParseRequest): Promise<ParseResponse> {
  try {
    // 構造化複製で渡るメッセージは型検査を通らない。境界で形を確かめる
    if (request.kind !== "csv" && request.kind !== "xlsx") {
      throw new Error(`未対応の形式: ${String(request.kind)}`);
    }
    // ponytail: パース本体は Phase 2（#10 CSV / #11 Excel）で実装する。
    // 現状は境界の疎通のみを担い、常に空の結果を返す。
    return { type: "result", id: request.id, columns: [], rows: [] };
  } catch (error) {
    return {
      type: "error",
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
