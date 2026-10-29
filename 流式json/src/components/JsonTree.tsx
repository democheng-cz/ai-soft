import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { JsonValue } from "../types";
import {
  buildNodes,
  buildRows,
  getFieldVisibility,
  getPath,
  getSelectableFieldPaths,
  search,
} from "../utils/flatten";
import type { Entry } from "../utils/flatten";
import { useVirtualList } from "../hooks/useVirtualList";
import { JsonRow, ROW_HEIGHT } from "./JsonRow";

interface Props {
  data: JsonValue | undefined;
  ndjson: JsonValue[] | null;
  onToast: (msg: string) => void;
}

export function JsonTree({ data, ndjson, onToast }: Props) {
  const [filter, setFilter] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [fieldPathInput, setFieldPathInput] = useState("");
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [fieldPickerQuery, setFieldPickerQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeMatch, setWholeMatch] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));
  const [isPending, startTransition] = useTransition();
  const [debouncing, setDebouncing] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const fieldPickerRef = useRef<HTMLDivElement | null>(null);

  const applyFilter = useCallback(
    (next: string) => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setDebouncing(false);
      startTransition(() => setAppliedFilter(next));
    },
    [startTransition]
  );

  const onFilterChange = (next: string) => {
    setFilter(next);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    if (next.trim() === "") {
      applyFilter("");
      return;
    }
    setDebouncing(true);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      setDebouncing(false);
      startTransition(() => setAppliedFilter(next));
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!fieldPickerOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        fieldPickerRef.current &&
        !fieldPickerRef.current.contains(event.target as Node)
      ) {
        setFieldPickerOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFieldPickerOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [fieldPickerOpen]);

  const searchOpts = useMemo(
    () => ({ caseSensitive, wholeMatch }),
    [caseSensitive, wholeMatch]
  );

  // 先保留解析后的白名单，后续接入筛选引擎时可直接使用。
  const fieldPaths = useMemo(
    () =>
      fieldPathInput
        .split(/[,\n]/)
        .map((path) => path.trim())
        .filter((path) => path.length > 0),
    [fieldPathInput]
  );

  const roots = useMemo<Entry[]>(() => {
    if (ndjson) {
      return ndjson.map((item, i) => ({ name: i, value: item }));
    }
    if (data !== undefined) {
      return [{ name: null, value: data }];
    }
    return [];
  }, [data, ndjson]);

  // 仅在数据变化时编译一次树节点（先序、含子树范围信息）
  const { nodes, rootIndices } = useMemo(() => buildNodes(roots), [roots]);

  const selectablePaths = useMemo<string[]>(
    () => getSelectableFieldPaths(nodes),
    [nodes]
  );

  const visibleSelectablePaths = useMemo(() => {
    const query = fieldPickerQuery.trim().toLowerCase();
    if (!query) return selectablePaths;
    return selectablePaths.filter((path) => path.toLowerCase().includes(query));
  }, [fieldPickerQuery, selectablePaths]);

  const selectedSelectableCount = useMemo(
    () => selectablePaths.filter((path) => fieldPaths.includes(path)).length,
    [fieldPaths, selectablePaths]
  );

  // 搜索：O(n) 线性扫描，复用预编译文本
  const searchResult = useMemo(
    () => search(nodes, appliedFilter, searchOpts),
    [nodes, appliedFilter, searchOpts]
  );

  const searching = appliedFilter.trim().length > 0;

  // 字段路径白名单可见性
  const fieldVisible = useMemo(
    () => getFieldVisibility(nodes, fieldPaths),
    [nodes, fieldPaths]
  );

  const fieldFiltering = fieldVisible !== null;

  const rows = useMemo(
    () => buildRows(nodes, expanded, searching, searchResult.visible, fieldVisible),
    [nodes, expanded, searching, searchResult, fieldVisible]
  );

  const matchCount = searchResult.count;

  const { setContainer, onScroll, startIndex, endIndex, padTop, padBottom } =
    useVirtualList({ itemCount: rows.length, itemHeight: ROW_HEIGHT });

  const toggle = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const expandAll = () => {
    const all = new Set<number>();
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.isContainer && node.childCount > 0) all.add(i);
    }
    setExpanded(all);
  };

  const collapseAll = () => {
    setExpanded(new Set(rootIndices));
  };

  const copyValue = useCallback(
    (value: JsonValue, isContainer: boolean) => {
      const text = isContainer
        ? JSON.stringify(value, null, 2)
        : typeof value === "string"
          ? value
          : String(value);
      navigator.clipboard?.writeText(text);
      onToast("已复制值");
    },
    [onToast]
  );

  const copyPath = useCallback(
    (index: number) => {
      const path = getPath(nodes, index);
      navigator.clipboard?.writeText(path);
      onToast("已复制路径");
    },
    [nodes, onToast]
  );

  const toggleCase = () =>
    startTransition(() => setCaseSensitive((v) => !v));
  const toggleWhole = () =>
    startTransition(() => setWholeMatch((v) => !v));

  const clearFilter = () => {
    setFilter("");
    applyFilter("");
  };

  const toggleFieldPath = (path: string, checked: boolean) => {
    const next = fieldPaths.filter((currentPath) => currentPath !== path);
    if (checked) next.push(path);
    setFieldPathInput(next.join("\n"));
  };

  const selectAllFields = () => {
    const next = [...fieldPaths];
    for (const path of selectablePaths) {
      if (!next.includes(path)) next.push(path);
    }
    setFieldPathInput(next.join("\n"));
  };

  const clearSelectedFields = () => setFieldPathInput("");

  const hasData = roots.length > 0;
  if (!hasData) {
    return <div className="empty">暂无数据，等待解析…</div>;
  }

  const visible = rows.slice(startIndex, endIndex);

  return (
    <div className="json-tree">
      <div className="tree-toolbar">
        <div className="search-wrap">
          <input
            className="filter-input"
            type="text"
            placeholder="搜索 key 或 value…"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          />
          <span className="search-opts">
            {(isPending || debouncing) && <span className="search-spinner" />}
            <button
              className={`opt-btn${caseSensitive ? " active" : ""}`}
              title="区分大小写"
              onClick={toggleCase}
            >
              Aa
            </button>
            <button
              className={`opt-btn${wholeMatch ? " active" : ""}`}
              title="全字匹配"
              onClick={toggleWhole}
            >
              Ab|
            </button>
          </span>
        </div>
        {appliedFilter && (
          <span className="match-count">{matchCount} 处匹配</span>
        )}
        {filter && (
          <button className="mini-btn" onClick={clearFilter}>
            清除
          </button>
        )}
        <span className="toolbar-spacer" />
        <button className="mini-btn" onClick={expandAll}>
          全部展开
        </button>
        <button className="mini-btn" onClick={collapseAll}>
          全部折叠
        </button>
      </div>
      <div className="field-filter-bar">
        <div className="field-filter-label">
          <strong>字段筛选</strong>
          <span>保留层级</span>
        </div>
        <div className="field-filter-editor">
          <textarea
            className="field-filter-input"
            rows={1}
            placeholder="$.data.items[*].id, $.data.items[*].name"
            aria-label="字段筛选路径"
            value={fieldPathInput}
            onChange={(e) => setFieldPathInput(e.target.value)}
          />
          <span className="field-filter-count" aria-live="polite">
            {fieldPaths.length > 0 ? `${fieldPaths.length} 条路径` : "未启用"}
          </span>
          <div className="field-picker" ref={fieldPickerRef}>
            <button
              className={`mini-btn field-picker-toggle${fieldPickerOpen ? " active" : ""}`}
              type="button"
              aria-expanded={fieldPickerOpen}
              onClick={() => setFieldPickerOpen((open) => !open)}
            >
              选择字段
            </button>
            {fieldPickerOpen && (
              <div className="field-picker-panel" role="dialog" aria-label="选择字段">
                <div className="field-picker-heading">
                  <strong>叶子字段路径</strong>
                  <span>
                    {selectedSelectableCount}/{selectablePaths.length}
                  </span>
                </div>
                <input
                  className="field-picker-search"
                  type="search"
                  placeholder="搜索字段路径…"
                  aria-label="搜索字段路径"
                  value={fieldPickerQuery}
                  onChange={(e) => setFieldPickerQuery(e.target.value)}
                />
                <div className="field-picker-actions">
                  <button className="mini-btn" type="button" onClick={selectAllFields}>
                    全选
                  </button>
                  <button className="mini-btn" type="button" onClick={clearSelectedFields}>
                    清空
                  </button>
                </div>
                <div className="field-picker-list">
                  {visibleSelectablePaths.length > 0 ? (
                    visibleSelectablePaths.map((path) => (
                      <label className="field-picker-option" key={path}>
                        <input
                          type="checkbox"
                          checked={fieldPaths.includes(path)}
                          onChange={(e) => toggleFieldPath(path, e.target.checked)}
                        />
                        <span title={path}>{path}</span>
                      </label>
                    ))
                  ) : (
                    <span className="field-picker-empty">没有匹配的字段</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            className="mini-btn field-filter-clear"
            type="button"
            onClick={() => setFieldPathInput("")}
            disabled={!fieldPathInput}
          >
            清除
          </button>
        </div>
        <span className="field-filter-hint">多个路径用逗号或换行分隔</span>
      </div>
      <div className="tree-body" ref={setContainer} onScroll={onScroll}>
        <div style={{ height: padTop }} />
        {visible.map((row) => (
          <JsonRow
            key={row.id}
            row={row}
            query={appliedFilter}
            searchOpts={searchOpts}
            onToggle={toggle}
            onCopyValue={copyValue}
            onCopyPath={copyPath}
          />
        ))}
        <div style={{ height: padBottom }} />
        {rows.length === 0 && (appliedFilter || fieldFiltering) && (
          <div className="empty">无匹配结果</div>
        )}
      </div>
    </div>
  );
}
