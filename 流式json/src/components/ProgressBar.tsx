import type { StreamState } from "../types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const statusText: Record<StreamState["status"], string> = {
  idle: "等待输入",
  loading: "正在流式获取…",
  done: "完成",
  error: "出错",
  aborted: "已取消"
};

export function ProgressBar({ state }: { state: StreamState }) {
  const { status, loaded, total, nodeCount } = state;
  const hasPercent =
    total !== null && total > 0 && loaded <= total;
  const percent = hasPercent ? Math.min(100, (loaded / total) * 100) : null;
  const indeterminate = status === "loading" && percent === null;

  return (
    <div className="progress">
      <div className="progress-track">
        <div
          className={`progress-fill${indeterminate ? " indeterminate" : ""}`}
          style={percent !== null ? { width: `${percent}%` } : undefined}
        />
      </div>
      <div className="progress-meta">
        <span className={`badge badge-${status}`}>{statusText[status]}</span>
        <span>
          {formatBytes(loaded)}
          {total !== null && ` / ${formatBytes(total)}`}
          {percent !== null && `（${percent.toFixed(0)}%）`}
        </span>
        <span>{nodeCount.toLocaleString()} 个节点</span>
      </div>
    </div>
  );
}
