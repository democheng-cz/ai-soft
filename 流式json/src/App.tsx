import { useCallback, useEffect, useState } from "react";
import { useStreamJson } from "./hooks/useStreamJson";
import { UrlBar } from "./components/UrlBar";
import { ProgressBar } from "./components/ProgressBar";
import { JsonTree } from "./components/JsonTree";
import { Toast, useToast } from "./components/Toast";

declare global {
  interface Window {
    utools?: {
      onPluginEnter?: (
        cb: (action: { code: string; type: string; payload: string }) => void
      ) => void;
    };
  }
}

const LAST_URL_KEY = "stream-json:last-url";

export default function App() {
  const { state, start, abort } = useStreamJson();
  const [initialUrl, setInitialUrl] = useState(
    () => localStorage.getItem(LAST_URL_KEY) ?? ""
  );
  const { msg, show } = useToast();

  const run = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (trimmed) localStorage.setItem(LAST_URL_KEY, trimmed);
      start(trimmed);
    },
    [start]
  );

  useEffect(() => {
    const utools = window.utools;
    if (utools?.onPluginEnter) {
      utools.onPluginEnter((action) => {
        if (action.type === "regex" && /^https?:\/\//i.test(action.payload)) {
          setInitialUrl(action.payload);
          run(action.payload);
        }
      });
    }
  }, [run]);

  const loading = state.status === "loading";

  return (
    <div className="app">
      <header className="app-header">
        <h1>流式 JSON 查看器</h1>
      </header>
      <UrlBar
        loading={loading}
        onStart={run}
        onAbort={abort}
        initialUrl={initialUrl}
      />
      {state.status !== "idle" && <ProgressBar state={state} />}
      {state.status === "error" && (
        <div className="error-box">⚠ {state.error}</div>
      )}
      <main className="app-main">
        {loading ? (
          <div className="loading-view">
            <div className="loading-spinner" />
            <div className="loading-text">正在流式获取并解析…</div>
            <div className="loading-sub">
              已解析 {state.nodeCount.toLocaleString()} 个节点
            </div>
          </div>
        ) : (
          <JsonTree data={state.data} ndjson={state.ndjson} onToast={show} />
        )}
      </main>
      <Toast msg={msg} />
    </div>
  );
}
