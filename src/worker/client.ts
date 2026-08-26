import type { ParseRequest, ParseResponse, ParseResult } from "./protocol";

export function createParseWorker(): Worker {
  return new Worker(new URL("./parse.worker.ts", import.meta.url), {
    type: "module",
  });
}

/** Worker と最小限の型を共有する送受信口。Worker 実体でもテスト用の代役でも動く。 */
export type ParsePort = {
  postMessage: (request: ParseRequest) => void;
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<ParseResponse>) => void,
  ) => void;
  removeEventListener: (
    type: "message",
    listener: (event: MessageEvent<ParseResponse>) => void,
  ) => void;
};

/**
 * パースを 1 件依頼し、結果を待つ。`ParseError` が返ったら reject する。
 * 同じ Worker へ並行して投げられるよう、応答は id で選り分ける。
 */
export function requestParse(
  port: ParsePort,
  request: ParseRequest,
  onProgress?: (rows: number) => void,
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<ParseResponse>) => {
      const message = event.data;
      if (message.id !== request.id) return;
      if (message.type === "progress") {
        onProgress?.(message.rows);
        return;
      }
      port.removeEventListener("message", onMessage);
      if (message.type === "result") resolve(message);
      else reject(new Error(message.message));
    };
    port.addEventListener("message", onMessage);
    port.postMessage(request);
  });
}
