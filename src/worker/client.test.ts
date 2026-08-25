import { expect, it } from "vitest";
import { type ParsePort, requestParse } from "./client";
import { respondTo } from "./parse";
import type { ParseRequest, ParseResponse } from "./protocol";

/** `parse.worker.ts` の殻と同じ経路（受信 → respondTo → 送信）を辿る代役。 */
function fakeWorker(): ParsePort {
  const listeners = new Set<(event: MessageEvent<ParseResponse>) => void>();
  return {
    postMessage: (request) => {
      respondTo(request).then((response) => {
        for (const listener of listeners) {
          listener({ data: response } as MessageEvent<ParseResponse>);
        }
      });
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
  };
}

const request: ParseRequest = {
  type: "parse",
  id: "req-1",
  file: new File(["日付,金額\n"], "meisai.csv", { type: "text/csv" }),
  kind: "csv",
};

it("ParseRequest を送ると ParseResult が返る", async () => {
  const result = await requestParse(fakeWorker(), request);

  expect(result).toEqual({
    type: "result",
    id: "req-1",
    columns: [],
    rows: [],
  });
});

it("未対応の形式なら ParseError として reject する", async () => {
  const broken = { ...request, kind: "pdf" } as unknown as ParseRequest;

  await expect(requestParse(fakeWorker(), broken)).rejects.toThrow(
    "未対応の形式: pdf",
  );
});

// docs/02-security-policy.md 条件 3 の機械的チェック。
// 送信経路が Worker 側へ紛れ込んだら落ちる
it("Worker 側にネットワーク API と license/ の import が無い", () => {
  const sources = import.meta.glob("./*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  // client.ts はメインスレッド専用ゆえ対象外
  const workerOnly = Object.entries(sources).filter(
    ([path]) => !path.endsWith(".test.ts") && !path.endsWith("/client.ts"),
  );

  expect(workerOnly.map(([path]) => path)).toContain("./parse.worker.ts");
  for (const [path, source] of workerOnly) {
    expect(source, path).not.toMatch(
      /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/,
    );
    expect(source, path).not.toMatch(/from\s+["'].*license/);
  }
});
