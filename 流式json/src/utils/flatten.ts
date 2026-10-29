import type { JsonValue } from "../types";

export type ValueKind =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "object"
  | "array";

export interface FlatRow {
  id: number;
  index: number;
  name: string | number | null;
  value: JsonValue;
  kind: ValueKind;
  depth: number;
  isContainer: boolean;
  childCount: number;
  hasChildren: boolean;
  expanded: boolean;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeMatch: boolean;
}

export function kindOf(value: JsonValue): ValueKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as ValueKind;
}

export interface Entry {
  name: string | number | null;
  value: JsonValue;
}

/**
 * 预编译的树节点（按先序排列）。相比早期版本移除了：
 *   - path 字段（改由 getPath 按需回溯生成，节省 O(N * depth) 字符串内存）
 *   - keyText / valueText / keyLower / valueLower 字段
 *     （搜索时按需读取 name / value，避免为每个节点保留 2~4 份字符串副本，
 *      在百万级节点场景可节省数百 MB 内存，防止渲染进程 OOM 被杀。）
 * 只保留结构信息，值本身直接引用原始 JSON，不再额外分配。
 */
export interface TreeNode {
  name: string | number | null;
  value: JsonValue;
  kind: ValueKind;
  depth: number;
  parent: number;
  isContainer: boolean;
  childCount: number;
  /** 子孙节点数量（不含自身），先序下子树为 [i+1, i+descendantCount] */
  descendantCount: number;
}

export interface BuildResult {
  nodes: TreeNode[];
  rootIndices: number[];
}

/**
 * 迭代式先序遍历构建节点表，避免深层嵌套 JSON 导致递归栈溢出。
 * 使用显式栈：每个容器进入时先压入 exit 帧再倒序压入子帧，
 * 待所有子孙节点入表后 exit 帧回填 descendantCount。
 */
export function buildNodes(roots: Entry[]): BuildResult {
  const nodes: TreeNode[] = [];
  const rootIndices: number[] = [];

  type EnterFrame = {
    t: 0;
    name: string | number | null;
    value: JsonValue;
    depth: number;
    parent: number;
  };
  type ExitFrame = { t: 1; index: number; startCount: number };
  const stack: (EnterFrame | ExitFrame)[] = [];

  for (let i = roots.length - 1; i >= 0; i--) {
    stack.push({
      t: 0,
      name: roots[i].name,
      value: roots[i].value,
      depth: 0,
      parent: -1
    });
  }

  while (stack.length > 0) {
    const frame = stack.pop()!;
    if (frame.t === 1) {
      nodes[frame.index].descendantCount = nodes.length - frame.startCount;
      continue;
    }

    const { name, value, depth, parent } = frame;
    const kind = kindOf(value);
    const isContainer = kind === "object" || kind === "array";
    const index = nodes.length;

    const node: TreeNode = {
      name,
      value,
      kind,
      depth,
      parent,
      isContainer,
      childCount: 0,
      descendantCount: 0
    };
    nodes.push(node);
    if (parent === -1) rootIndices.push(index);

    if (!isContainer) continue;

    if (kind === "array") {
      const arr = value as JsonValue[];
      node.childCount = arr.length;
      if (arr.length === 0) continue;
      stack.push({ t: 1, index, startCount: nodes.length });
      for (let i = arr.length - 1; i >= 0; i--) {
        stack.push({
          t: 0,
          name: i,
          value: arr[i],
          depth: depth + 1,
          parent: index
        });
      }
    } else {
      const obj = value as Record<string, JsonValue>;
      const keys = Object.keys(obj);
      node.childCount = keys.length;
      if (keys.length === 0) continue;
      stack.push({ t: 1, index, startCount: nodes.length });
      for (let i = keys.length - 1; i >= 0; i--) {
        const k = keys[i];
        stack.push({
          t: 0,
          name: k,
          value: obj[k],
          depth: depth + 1,
          parent: index
        });
      }
    }
  }

  return { nodes, rootIndices };
}

/**
 * 按需回溯生成节点的 JSONPath。仅在用户复制路径 / React key 需要时才调用，
 * 单节点 O(depth) 一次性拼接，避免全量预生成的巨额字符串内存开销。
 */
export function getPath(nodes: TreeNode[], index: number): string {
  if (index < 0 || index >= nodes.length) return "";
  const chain: number[] = [];
  let i = index;
  while (i >= 0) {
    chain.push(i);
    i = nodes[i].parent;
  }
  chain.reverse();

  const root = nodes[chain[0]];
  let path = root.name === null ? "$" : `$[${root.name}]`;
  for (let k = 1; k < chain.length; k++) {
    const cur = nodes[chain[k]];
    const parent = nodes[cur.parent];
    if (parent.kind === "array") {
      path += `[${cur.name}]`;
    } else {
      path += `.${cur.name}`;
    }
  }
  return path;
}

export interface SearchResult {
  /** 与 nodes 同长度，1 表示该节点在搜索结果中可见 */
  visible: Uint8Array | null;
  /** 命中节点数量 */
  count: number;
}

/* ------------------------------------------------------------------ */
/*  字段路径白名单                                                      */
/* ------------------------------------------------------------------ */

type FieldSegment =
  | { type: "key"; value: string }
  | { type: "index"; value: number }
  | { type: "wildcard" };

/**
 * 将用户输入的 JSONPath 片段解析为分段列表。
 * 仅支持 `$`、`.key`、`[0]`、`[*]` 四个原语；非法/不以 $ 开头的路径返回 null。
 */
function parseFieldPath(path: string): FieldSegment[] | null {
  if (path === "$") return [];
  if (!path.startsWith("$")) return null;

  const segments: FieldSegment[] = [];
  let i = 1;

  while (i < path.length) {
    if (path[i] === ".") {
      i++;
      let key = "";
      while (i < path.length && path[i] !== "." && path[i] !== "[") {
        key += path[i];
        i++;
      }
      if (key.length === 0) return null;
      segments.push({ type: "key", value: key });
    } else if (path[i] === "[") {
      i++;
      let content = "";
      while (i < path.length && path[i] !== "]") {
        content += path[i];
        i++;
      }
      if (i >= path.length || content.length === 0) return null;
      i++; // skip ]
      if (content === "*") {
        segments.push({ type: "wildcard" });
      } else if (/^\d+$/.test(content)) {
        segments.push({ type: "index", value: parseInt(content, 10) });
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  return segments;
}

function getDirectChildren(nodes: TreeNode[], parentIdx: number): number[] {
  const parent = nodes[parentIdx];
  if (!parent.isContainer || parent.childCount === 0) return [];
  const children: number[] = [];
  const end = parentIdx + parent.descendantCount + 1;
  for (let i = parentIdx + 1; i < end; i++) {
    if (nodes[i].parent === parentIdx) {
      children.push(i);
    }
  }
  return children;
}

function matchesSegment(node: TreeNode, seg: FieldSegment): boolean {
  if (seg.type === "wildcard") return true;
  if (seg.type === "index") return node.name === seg.value;
  return String(node.name) === seg.value;
}

function markAncestors(nodes: TreeNode[], idx: number, arr: Uint8Array): void {
  let i = idx;
  while (i >= 0) {
    arr[i] = 1;
    i = nodes[i].parent;
  }
}

function markSubtree(nodes: TreeNode[], idx: number, arr: Uint8Array): void {
  const end = idx + nodes[idx].descendantCount;
  for (let i = idx; i <= end; i++) {
    arr[i] = 1;
  }
}

/**
 * 根据字段路径白名单计算节点可见性。
 * - 路径必须与 getPath 输出兼容：单根 `$` 起始、对象用 `.key`、数组用 `[0]`、
 *   NDJSON 根用 `$[0]`、数组通配 `[*]`。
 * - 路径命中节点时标记该节点及所有祖先可见；若命中容器则整个子树可见。
 * - 无有效路径（或全不合法）时返回 null。
 *
 * 复杂度 O(nodes * paths)，不引入第三方 JSONPath 库。
 */
export function getFieldVisibility(
  nodes: TreeNode[],
  paths: string[]
): Uint8Array | null {
  const parsed: FieldSegment[][] = [];
  for (const p of paths) {
    const segs = parseFieldPath(p);
    if (segs !== null) parsed.push(segs);
  }
  if (parsed.length === 0) return null;

  const n = nodes.length;
  const visible = new Uint8Array(n);

  const rootIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (nodes[i].parent === -1) rootIndices.push(i);
  }

  for (const segments of parsed) {
    // 仅 "$" → 整棵树可见
    if (segments.length === 0) {
      for (const ri of rootIndices) {
        visible[ri] = 1;
        markSubtree(nodes, ri, visible);
      }
      continue;
    }

    let current: number[];
    let segIdx: number;
    const first = segments[0];

    if (first.type === "index") {
      current = rootIndices.filter((ri) => nodes[ri].name === first.value);
      segIdx = 1;
    } else {
      current = [...rootIndices];
      segIdx = 0;
    }

    for (let s = segIdx; s < segments.length; s++) {
      const seg = segments[s];
      const next: number[] = [];
      for (const ci of current) {
        if (seg.type === "wildcard" && nodes[ci].kind !== "array") continue;
        const children = getDirectChildren(nodes, ci);
        for (const child of children) {
          if (matchesSegment(nodes[child], seg)) {
            next.push(child);
          }
        }
      }
      current = next;
      if (current.length === 0) break;
    }

    for (const mi of current) {
      markAncestors(nodes, mi, visible);
      if (nodes[mi].isContainer) {
        markSubtree(nodes, mi, visible);
      }
    }
  }

  return visible;
}

/**
 * 遍历整棵树的叶子（标量值）节点，返回去重后的通配路径列表。
 * - 所有数组下标 `[0]`/`[1]` 统一归并为 `[*]`，同类路径仅保留第一条。
 * - 顺序与节点先序遍历的首次出现一致。
 * - 若根节点本身即为标量（无子节点），返回 `["$"]`。
 * - 路径格式与 getFieldVisibility 完全兼容（`$`、`.key`、`[*]`）。
 */
export function getSelectableFieldPaths(nodes: TreeNode[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    // 仅收集标量值节点（非 object/array）
    if (node.isContainer) continue;

    const raw = getPath(nodes, i);
    // 将所有 [数字] 替换为通配 [*]
    const normalized = raw.replace(/\[\d+\]/g, "[*]");

    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

/**
 * O(n) 搜索：
 *  1) 线性扫描判定每个节点自身是否命中（name / value 就地读取 + 小写化，
 *     不再依赖预存的 lower 字段，牺牲极小 CPU 换取显著内存下降）。
 *  2) 命中向上传播使祖先链可见，保持树结构。
 *  3) 容器节点因自身 key 命中时，其整个子树强制可见。
 */
export function search(
  nodes: TreeNode[],
  query: string,
  opts: SearchOptions
): SearchResult {
  const q = query.trim();
  if (!q) return { visible: null, count: 0 };

  const n = nodes.length;
  const self = new Uint8Array(n);
  const visible = new Uint8Array(n);

  const cs = opts.caseSensitive;
  const whole = opts.wholeMatch;
  const needle = cs ? q : q.toLowerCase();

  let count = 0;
  let forcedEnd = -1;

  for (let i = 0; i < n; i++) {
    const node = nodes[i];

    let keyStr = "";
    if (node.name !== null) {
      keyStr = typeof node.name === "string" ? node.name : String(node.name);
    }
    let valStr = "";
    if (!node.isContainer) {
      const v = node.value;
      valStr = typeof v === "string" ? v : String(v);
    }

    const key = cs ? keyStr : keyStr.toLowerCase();
    const val = cs ? valStr : valStr.toLowerCase();

    let hit = false;
    if (whole) {
      hit =
        (node.name !== null && key === needle) ||
        (!node.isContainer && val === needle);
    } else {
      hit =
        (node.name !== null && key.indexOf(needle) !== -1) ||
        (!node.isContainer && val.indexOf(needle) !== -1);
    }

    const forced = i <= forcedEnd;
    if (hit) {
      self[i] = 1;
      count += 1;
      if (node.isContainer) {
        const end = i + node.descendantCount;
        if (end > forcedEnd) forcedEnd = end;
      }
    }
    if (forced) visible[i] = 1;
  }

  const any = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (self[i]) any[i] = 1;
  for (let i = n - 1; i >= 0; i--) {
    if (any[i]) {
      const p = nodes[i].parent;
      if (p >= 0) any[p] = 1;
    }
  }
  for (let i = 0; i < n; i++) if (any[i]) visible[i] = 1;

  return { visible, count };
}

/**
 * 将预编译节点扁平化为渲染行。
 * - 搜索/字段筛选时跳过不可见子树（整段跳过，O(可见节点)）。
 * - 二者同时启用时取交集。
 * - 折叠的容器整段跳过其子孙。
 * - 筛选激活时可见容器的祖先自动展开以保证匹配值可见。
 */
export function buildRows(
  nodes: TreeNode[],
  expanded: Set<number>,
  searching: boolean,
  visible: Uint8Array | null,
  fieldVisible: Uint8Array | null = null
): FlatRow[] {
  const fieldFiltering = fieldVisible !== null;
  const searchActive = searching && visible !== null;
  const filterActive = searchActive || fieldFiltering;

  let combined: Uint8Array | null = null;
  if (searchActive && fieldFiltering) {
    combined = new Uint8Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      combined[i] = visible![i] & fieldVisible[i];
    }
  } else if (searchActive) {
    combined = visible;
  } else if (fieldFiltering) {
    combined = fieldVisible;
  }

  const rows: FlatRow[] = [];
  const n = nodes.length;
  let i = 0;

  while (i < n) {
    const node = nodes[i];

    if (filterActive && combined && !combined[i]) {
      i += node.descendantCount + 1;
      continue;
    }

    const hasChildren = node.isContainer && node.childCount > 0;
    const isExpanded = hasChildren && (filterActive || expanded.has(i));

    rows.push({
      id: i,
      index: i,
      name: node.name,
      value: node.value,
      kind: node.kind,
      depth: node.depth,
      isContainer: node.isContainer,
      childCount: node.childCount,
      hasChildren,
      expanded: isExpanded
    });

    if (node.isContainer && !isExpanded) {
      i += node.descendantCount + 1;
    } else {
      i += 1;
    }
  }

  return rows;
}
