export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type StreamStatus = "idle" | "loading" | "done" | "error" | "aborted";

export interface StreamState {
  status: StreamStatus;
  /** 已下载字节数 */
  loaded: number;
  /** 总字节数，来自 Content-Length，未知时为 null */
  total: number | null;
  /** 解析得到的根数据，流式构建过程中实时更新 */
  data: JsonValue | undefined;
  /** NDJSON 模式下逐行解析得到的对象数组 */
  ndjson: JsonValue[] | null;
  /** 错误信息 */
  error: string | null;
  /** 解析完成的节点计数（用于进度提示） */
  nodeCount: number;
}
