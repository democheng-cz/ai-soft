import { useCallback, useRef, useState, startTransition } from "react";
import { JSONParser } from "@streamparser/json";
import type { JsonValue, StreamState } from "../types";

const initialState: StreamState = {
  status: "idle",
  loaded: 0,
  total: null,
  data: undefined,
  ndjson: null,
  error: null,
  nodeCount: 0
};

const UPDATE_INTERVAL = 80;

export function useStreamJson() {
  const [state, setState] = useState<StreamState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(initialState);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const start = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...initialState, status: "loading" });

    let building: JsonValue | undefined;
    const topLevel: JsonValue[] = [];
    let loaded = 0;
    let total: number | null = null;
    let nodeCount = 0;
    let lastFlush = 0;

    const flush = (force = false) => {
      const now = Date.now();
      if (!force && now - lastFlush < UPDATE_INTERVAL) return;
      lastFlush = now;
      if (force) {
        // 完成时一次性提交解析后的数据。
        // 使用 startTransition 将大数据渲染标记为低优先级更新，
        // 避免主线程同步阻塞过久导致 Electron 判定渲染进程无响应而被杀。
        const isNdjson = topLevel.length > 1;
        const finalData: JsonValue | undefined = isNdjson
          ? undefined
          : building ?? topLevel[0];
        const finalNdjson: JsonValue[] | null = isNdjson
          ? topLevel.slice()
          : null;
        startTransition(() => {
          setState((prev) => ({
            ...prev,
            loaded,
            total,
            nodeCount,
            data: finalData,
            ndjson: finalNdjson
          }));
        });
      } else {
        // 流式过程中只更新轻量进度，避免克隆大数据导致主线程卡顿
        setState((prev) => ({ ...prev, loaded, total, nodeCount }));
      }
    };

    const parser = new JSONParser({ separator: "", paths: undefined });

    parser.onValue = ({ value, stack }) => {
      nodeCount += 1;
      if (stack.length >= 1) {
        building = stack[0].value as JsonValue;
      } else {
        topLevel.push(value as JsonValue);
        building = undefined;
      }
      flush();
    };

    try {
      const response = await fetch(trimmed, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`请求失败：HTTP ${response.status} ${response.statusText}`);
      }
      const len = response.headers.get("Content-Length");
      const encoding = response.headers.get("Content-Encoding");
      // 响应被压缩时（gzip/br/deflate），Content-Length 是压缩后大小，
      // 而读取到的是解压后的字节，二者不可比，故进度按未知处理。
      const compressed = !!encoding && encoding.toLowerCase() !== "identity";
      const parsedLen = len ? Number(len) : NaN;
      total = !compressed && Number.isFinite(parsedLen) ? parsedLen : null;

      if (!response.body) {
        const text = await response.text();
        loaded = new TextEncoder().encode(text).length;
        parser.write(text);
        parser.end();
        flush(true);
        startTransition(() => {
          setState((prev) => ({ ...prev, status: "done" }));
        });
        return;
      }

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.byteLength;
        // 若实际读取字节超过声明的总大小，说明 Content-Length 不可靠
        // （如透明解压），退化为未知总量，避免进度超过 100%。
        if (total !== null && loaded > total) {
          total = null;
        }
        parser.write(value);
        flush();
      }
      parser.end();
      flush(true);
      startTransition(() => {
        setState((prev) => ({ ...prev, status: "done" }));
      });
    } catch (err) {
      if (controller.signal.aborted) {
        setState((prev) => ({ ...prev, status: "aborted" }));
        return;
      }
      const message =
        err instanceof Error ? err.message : "未知错误，请检查链接是否有效";
      setState((prev) => ({ ...prev, status: "error", error: message }));
    }
  }, []);

  return { state, start, abort, reset };
}
