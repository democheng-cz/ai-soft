import { memo, useState } from "react";
import type { FlatRow, SearchOptions } from "../utils/flatten";
import type { JsonValue } from "../types";

const ROW_HEIGHT = 24;
const MAX_STRING = 200;

interface Props {
  row: FlatRow;
  query: string;
  searchOpts: SearchOptions;
  onToggle: (index: number) => void;
  onCopyValue: (value: JsonValue, isContainer: boolean) => void;
  onCopyPath: (index: number) => void;
}

function Highlight({
  text,
  query,
  opts
}: {
  text: string;
  query: string;
  opts: SearchOptions;
}) {
  if (!query) return <>{text}</>;

  if (opts.wholeMatch) {
    const equal = opts.caseSensitive
      ? text === query
      : text.toLowerCase() === query.toLowerCase();
    return equal ? <mark className="hl">{text}</mark> : <>{text}</>;
  }

  const hay = opts.caseSensitive ? text : text.toLowerCase();
  const needle = opts.caseSensitive ? query : query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = hay.indexOf(needle, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={key++} className="hl">
        {text.slice(idx, idx + needle.length)}
      </mark>
    );
    i = idx + needle.length;
  }
  return <>{parts}</>;
}

function preview(row: FlatRow): string {
  if (row.kind === "array") return `[ ${row.childCount} ]`;
  return `{ ${row.childCount} }`;
}

function JsonRowImpl({
  row,
  query,
  searchOpts,
  onToggle,
  onCopyValue,
  onCopyPath
}: Props) {
  const [expandStr, setExpandStr] = useState(false);
  const { name, value, kind, depth, isContainer, hasChildren, expanded } = row;

  const keyEl =
    name !== null ? (
      <span className="json-key">
        <Highlight text={String(name)} query={query} opts={searchOpts} />
      </span>
    ) : null;

  let valueEl: React.ReactNode;
  if (isContainer) {
    valueEl = (
      <span className="json-preview">
        {kind === "array" ? "Array" : "Object"} {preview(row)}
      </span>
    );
  } else if (kind === "string") {
    const str = value as string;
    const tooLong = str.length > MAX_STRING && !expandStr;
    const shown = tooLong ? str.slice(0, MAX_STRING) : str;
    valueEl = (
      <span className="json-value json-string">
        "<Highlight text={shown} query={query} opts={searchOpts} />"
        {str.length > MAX_STRING && (
          <button
            className="inline-more"
            onClick={(e) => {
              e.stopPropagation();
              setExpandStr((v) => !v);
            }}
          >
            {tooLong ? `…展开(${str.length})` : "收起"}
          </button>
        )}
      </span>
    );
  } else {
    valueEl = (
      <span className={`json-value json-${kind}`}>
        <Highlight text={String(value)} query={query} opts={searchOpts} />
      </span>
    );
  }

  return (
    <div
      className={`json-row${isContainer ? " json-row-toggle" : ""}`}
      style={{ height: ROW_HEIGHT, paddingLeft: depth * 16 + 8 }}
      onClick={isContainer && hasChildren ? () => onToggle(row.index) : undefined}
    >
      {hasChildren ? (
        <span className={`json-arrow${expanded ? " open" : ""}`}>▶</span>
      ) : (
        <span className="json-spacer" />
      )}
      {keyEl}
      {keyEl && <span className="json-colon">:</span>}
      {valueEl}
      <span className="json-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="mini-btn"
          title="复制值"
          onClick={() => onCopyValue(value, isContainer)}
        >
          复制
        </button>
        <button
          className="mini-btn"
          title="复制路径"
          onClick={() => onCopyPath(row.index)}
        >
          路径
        </button>
      </span>
    </div>
  );
}

export const JsonRow = memo(JsonRowImpl);
export { ROW_HEIGHT };
