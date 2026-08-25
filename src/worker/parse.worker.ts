/// <reference lib="webworker" />
import { respondTo } from "./parse";
import type { ParseRequest } from "./protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", async (event: MessageEvent<ParseRequest>) => {
  ctx.postMessage(await respondTo(event.data));
});
