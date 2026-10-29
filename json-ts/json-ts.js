(function () {
  const sampleJson = `{
  "id": 1001,
  "user_name": "Ada",
  "status": "active",
  "created_at": "2024-03-15T10:30:00Z",
  "profile": {
    "age": 28,
    "tags": ["frontend", "typescript"],
    "address": {
      "city": "Shanghai",
      "zip-code": "200000"
    }
  }
}

{
  "id": 1002,
  "user_name": "Lin",
  "status": "inactive",
  "created_at": "2025-01-20",
  "profile": {
    "tags": [],
    "address": {
      "city": "Hangzhou"
    }
  },
  "roles": ["admin", "editor"]
}`;

  const dom = {
    input: document.querySelector("#jsonInput"),
    output: document.querySelector("#tsOutput"),
    rootName: document.querySelector("#rootName"),
    typeNameStyle: document.querySelector("#typeNameStyle"),
    propertyNameStyle: document.querySelector("#propertyNameStyle"),
    status: document.querySelector("#statusText"),
    stats: document.querySelector("#inputStats"),
    sampleBtn: document.querySelector("#sampleBtn"),
    copyBtn: document.querySelector("#copyBtn"),
    outputStyle: document.querySelector("#outputStyle"),
    detectDates: document.querySelector("#detectDates"),
    detectEnums: document.querySelector("#detectEnums"),
    detectIndexSig: document.querySelector("#detectIndexSig"),
    schemaOutput: document.querySelector("#schemaOutput"),
    tabBtns: document.querySelectorAll(".tab-btn")
  };

  function splitTopLevelJson(input) {
    const chunks = [];
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        if (start === -1) start = i;
        continue;
      }

      if (char === "{" || char === "[") {
        if (depth === 0) start = i;
        depth += 1;
        continue;
      }

      if (char === "}" || char === "]") {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          chunks.push(input.slice(start, i + 1));
          start = -1;
        }
      }
    }

    if (!chunks.length && input.trim()) return [input.trim()];
    return chunks;
  }

  function parseSamples(input) {
    const trimmed = input.trim();
    if (!trimmed) return [];

    try {
      return [JSON.parse(trimmed)];
    } catch {
      const chunks = splitTopLevelJson(trimmed);
      if (!chunks.length) throw new Error("没有找到完整的 JSON 对象或数组。");
      return chunks.map((chunk) => JSON.parse(chunk));
    }
  }

  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

  function infer(value, options) {
    options = options || {};
    if (value === null) return { kind: "null" };
    if (Array.isArray(value)) {
      return {
        kind: "array",
        element: value.length ? mergeTypes(value.map((v) => infer(v, options)), options) : { kind: "unknown" }
      };
    }
    if (typeof value === "object") {
      const props = {};
      Object.entries(value).forEach(([key, child]) => {
        props[key] = { type: infer(child, options), optional: false };
      });
      return { kind: "object", props };
    }
    if (typeof value === "string") {
      if (options.detectDates && ISO_DATE_RE.test(value)) {
        return { kind: "date" };
      }
      if (options.detectEnums) {
        return { kind: "stringLiteral", value };
      }
      return { kind: "string" };
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return { kind: typeof value };
    }
    return { kind: "unknown" };
  }

  function mergeTypes(types, options) {
    const useful = types.filter(Boolean);
    if (!useful.length) return { kind: "unknown" };

    const nonUnknown = useful.filter((type) => type.kind !== "unknown");
    if (!nonUnknown.length) return { kind: "unknown" };
    if (nonUnknown.length === 1) return nonUnknown[0];

    if (nonUnknown.every((type) => type.kind === "object")) {
      return mergeObjects(nonUnknown, options);
    }

    if (nonUnknown.every((type) => type.kind === "array")) {
      return { kind: "array", element: mergeTypes(nonUnknown.map((type) => type.element), options) };
    }

    const flattened = [];
    nonUnknown.forEach((type) => {
      if (type.kind === "union") flattened.push(...type.types);
      else flattened.push(type);
    });

    const unique = [];
    flattened.forEach((type) => {
      if (!unique.some((item) => typeSignature(item) === typeSignature(type))) unique.push(type);
    });
    if (unique.length === 1) return unique[0];

    const stringLiterals = unique.filter((t) => t.kind === "stringLiteral");
    const nonStringLiterals = unique.filter((t) => t.kind !== "stringLiteral");
    if (stringLiterals.length >= 2 && nonStringLiterals.length === 0) {
      const values = stringLiterals.map((t) => t.value);
      const deduped = [...new Set(values)];
      return { kind: "enum", values: deduped };
    }
    if (stringLiterals.length >= 1 && nonStringLiterals.length >= 1) {
      const allTypes = [...nonStringLiterals];
      if (stringLiterals.length >= 2) {
        const values = stringLiterals.map((t) => t.value);
        const deduped = [...new Set(values)];
        allTypes.push({ kind: "enum", values: deduped });
      } else {
        allTypes.push({ kind: "string" });
      }
      return allTypes.length === 1 ? allTypes[0] : { kind: "union", types: allTypes };
    }
    return { kind: "union", types: unique };
  }

  function mergeObjects(objects, options) {
    const keys = new Set();
    objects.forEach((object) => Object.keys(object.props).forEach((key) => keys.add(key)));
    const props = {};
    keys.forEach((key) => {
      const present = objects.filter((object) => Object.hasOwn(object.props, key));
      props[key] = {
        optional: present.length < objects.length,
        type: mergeTypes(present.map((object) => object.props[key].type), options)
      };
    });
    return { kind: "object", props };
  }

  function typeSignature(type) {
    if (type.kind === "date") return "date";
    if (type.kind === "stringLiteral") return `stringLiteral:${JSON.stringify(type.value)}`;
    if (type.kind === "enum") return `enum:${type.values.slice().sort().join("|")}`;
    if (type.kind === "array") return `array<${typeSignature(type.element)}>`;
    if (type.kind === "object") {
      return `object:{${Object.entries(type.props)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, prop]) => `${JSON.stringify(key)}${prop.optional ? "?" : ""}:${typeSignature(prop.type)}`)
        .join(";")}}`;
    }
    if (type.kind === "union") return `union:${type.types.map(typeSignature).sort().join("|")}`;
    return type.kind;
  }

  function wordsFrom(value) {
    return String(value)
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean);
  }

  function applyNameStyle(value, style, fallback = "generatedName") {
    const raw = String(value || "").trim();
    const words = wordsFrom(raw || fallback);
    let name = "";
    if (style === "preserve") {
      name = raw || fallback;
    } else if (style === "snake") {
      name = words.map((word) => word.toLowerCase()).join("_");
    } else if (style === "camel") {
      name = words
        .map((word, index) => {
          const lower = word.toLowerCase();
          return index ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
        })
        .join("");
    } else {
      name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
    }
    return name || fallback;
  }

  function toValidIdentifier(value, fallback, style) {
    const styled = applyNameStyle(value, style, fallback);
    const cleaned = styled.replace(/[^\w$]/g, "_");
    const name = cleaned || fallback;
    return /^[A-Za-z_$]/.test(name) ? name : `${fallback}${name}`;
  }

  function toPascalCase(value, fallback = "GeneratedType") {
    const words = String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean);
    const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("") || fallback;
    return /^\d/.test(name) ? `${fallback}${name}` : name;
  }

  function singularize(value) {
    if (/ies$/i.test(value)) return value.replace(/ies$/i, "y");
    if (/ses$/i.test(value)) return value.replace(/es$/i, "");
    if (/s$/i.test(value) && !/ss$/i.test(value)) return value.slice(0, -1);
    return value;
  }

  function propName(key, options) {
    const style = options.propertyNameStyle || "preserve";
    const transformed = style === "preserve" ? key : applyNameStyle(key, style, key);
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(transformed) ? transformed : JSON.stringify(transformed);
  }

  function createNameFactory(options) {
    const used = new Map();
    return function uniqueTypeName(rawName) {
      const base = toValidIdentifier(rawName, "GeneratedType", options.typeNameStyle || "pascal");
      const count = used.get(base) || 0;
      used.set(base, count + 1);
      return count ? `${base}${count + 1}` : base;
    };
  }

  function uniquePropertyName(name, used) {
    const count = used.get(name) || 0;
    used.set(name, count + 1);
    if (!count) return name;
    if (name.startsWith('"') && name.endsWith('"')) {
      return JSON.stringify(`${JSON.parse(name)}${count + 1}`);
    }
    return `${name}${count + 1}`;
  }

  function detectIndexSignatureGroups(props) {
    const entries = Object.entries(props);
    if (entries.length < 3) return { fixed: entries, indexGroups: [] };

    const groups = new Map();
    entries.forEach(([key, prop]) => {
      const match = key.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        if (!groups.has(prefix)) groups.set(prefix, []);
        groups.get(prefix).push([key, prop]);
      }
    });

    const indexGroups = [];
    const fixedKeys = new Set();

    for (const [prefix, group] of groups) {
      if (group.length >= 3) {
        const signatures = new Set(group.map(([, prop]) => typeSignature(prop.type)));
        if (signatures.size === 1) {
          indexGroups.push({ prefix, entries: group, type: group[0][1].type });
          group.forEach(([key]) => fixedKeys.add(key));
        }
      }
    }

    const fixed = entries.filter(([key]) => !fixedKeys.has(key));
    return { fixed, indexGroups };
  }

  function generateTypes(rootType, rootName, options = {}) {
    const nextName = createNameFactory(options);
    const declarations = [];
    const structureNames = new Map();

    function printType(type, hint) {
      if (type.kind === "date") return "Date";
      if (type.kind === "stringLiteral") return "string";
      if (type.kind === "enum") {
        const enumName = nextName(hint);
        const enumMembers = type.values.map((v) => {
          const memberName = toValidIdentifier(v, "Value", options.typeNameStyle || "pascal");
          return `  ${memberName} = ${JSON.stringify(v)}`;
        });
        declarations.push(`export enum ${enumName} {\n${enumMembers.join(",\n")}\n}`);
        return enumName;
      }
      if (type.kind === "object") {
        const signature = typeSignature(type);
        if (structureNames.has(signature)) return structureNames.get(signature);
        const interfaceName = nextName(hint);
        structureNames.set(signature, interfaceName);
        declarations.push(printInterface(interfaceName, type));
        return interfaceName;
      }
      if (type.kind === "array") {
        const childHint = singularize(hint || "Item");
        return `${wrapArrayElement(printType(type.element, childHint))}[]`;
      }
      if (type.kind === "union") {
        return type.types.map((item) => printType(item, hint)).sort().join(" | ");
      }
      return type.kind;
    }

    function wrapArrayElement(text) {
      return text.includes(" | ") ? `(${text})` : text;
    }

    function printInterface(name, type) {
      const isTypeAlias = options.outputStyle === "type";
      const lines = [isTypeAlias ? `export type ${name} = {` : `export interface ${name} {`];
      const usedProps = new Map();

      if (options.detectIndexSignatures) {
        const { fixed, indexGroups } = detectIndexSignatureGroups(type.props);
        Object.entries(fixed)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([key, prop]) => {
            const optional = prop.optional ? "?" : "";
            const outputName = uniquePropertyName(propName(key, options), usedProps);
            lines.push(`  ${outputName}${optional}: ${printType(prop.type, key)};`);
          });
        indexGroups.forEach((group) => {
          lines.push(`  [key: string]: ${printType(group.type, group.prefix || "value")};`);
        });
      } else {
        Object.entries(type.props)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([key, prop]) => {
            const optional = prop.optional ? "?" : "";
            const outputName = uniquePropertyName(propName(key, options), usedProps);
            lines.push(`  ${outputName}${optional}: ${printType(prop.type, key)};`);
          });
      }

      lines.push("};");
      return lines.join("\n");
    }

    const rootHint = toValidIdentifier(rootName || "Root", "Root", options.typeNameStyle || "pascal");
    if (rootType.kind === "object") {
      const rootInterfaceName = nextName(rootHint);
      structureNames.set(typeSignature(rootType), rootInterfaceName);
      declarations.push(printInterface(rootInterfaceName, rootType));
    } else {
      declarations.push(`export type ${rootHint} = ${printType(rootType, rootHint)};`);
    }
    return declarations.join("\n\n");
  }

  function generateSchema(rootType, rootName, options) {
    options = options || {};
    const definitions = {};
    const structureNames = new Map();
    const nextName = createNameFactory(options);

    function typeToSchema(type, hint) {
      if (type.kind === "string" || type.kind === "stringLiteral") {
        if (type.kind === "stringLiteral") {
          return { const: type.value };
        }
        return { type: "string" };
      }
      if (type.kind === "number") return { type: "number" };
      if (type.kind === "boolean") return { type: "boolean" };
      if (type.kind === "null") return { type: "null" };
      if (type.kind === "date") return { type: "string", format: "date-time" };
      if (type.kind === "unknown") return {};
      if (type.kind === "enum") {
        return {
          type: "string",
          enum: type.values
        };
      }
      if (type.kind === "array") {
        const childHint = singularize(hint || "Item");
        return {
          type: "array",
          items: typeToSchema(type.element, childHint)
        };
      }
      if (type.kind === "union") {
        return {
          anyOf: type.types.map((t) => typeToSchema(t, hint))
        };
      }
      if (type.kind === "object") {
        const sig = typeSignature(type);
        if (structureNames.has(sig)) {
          return { $ref: `#/$defs/${structureNames.get(sig)}` };
        }
        const defName = nextName(hint);
        structureNames.set(sig, defName);

        const required = [];
        const properties = {};
        Object.entries(type.props)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([key, prop]) => {
            properties[key] = typeToSchema(prop.type, key);
            if (!prop.optional) required.push(key);
          });

        const schema = { type: "object", properties };
        if (required.length) schema.required = required;

        if (options.detectIndexSignatures) {
          const { fixed, indexGroups } = detectIndexSignatureGroups(type.props);
          if (indexGroups.length) {
            schema.patternProperties = {};
            indexGroups.forEach((group) => {
              schema.patternProperties["^.*$"] = typeToSchema(group.type, group.prefix || "value");
            });
            const fixedProps = {};
            fixed.forEach(([key, prop]) => {
              fixedProps[key] = typeToSchema(prop.type, key);
            });
            schema.properties = Object.keys(fixedProps).length ? fixedProps : undefined;
            const fixedRequired = fixed.filter(([, prop]) => !prop.optional).map(([key]) => key);
            schema.required = fixedRequired.length ? fixedRequired : undefined;
          }
        }

        definitions[defName] = schema;
        return { $ref: `#/$defs/${defName}` };
      }
      return {};
    }

    const rootHint = toValidIdentifier(rootName || "Root", "Root", options.typeNameStyle || "pascal");
    const rootSchema = typeToSchema(rootType, rootHint);

    const result = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: rootHint
    };

    if (rootType.kind === "object") {
      const sig = typeSignature(rootType);
      const defName = structureNames.get(sig);
      if (defName) {
        result.$ref = `#/$defs/${defName}`;
      }
    } else {
      Object.assign(result, rootSchema);
    }

    if (Object.keys(definitions).length) {
      result.$defs = definitions;
    }

    return JSON.stringify(result, null, 2);
  }

  function convert(input, rootName, options) {
    options = options || {};
    const samples = parseSamples(input);
    if (!samples.length) return { code: "", schema: "", count: 0 };
    const rootType = mergeTypes(samples.map((v) => infer(v, options)), options);
    return {
      code: generateTypes(rootType, rootName, options),
      schema: generateSchema(rootType, rootName, options),
      count: samples.length
    };
  }

  function highlightTS(code) {
    if (!code) return "";
    const keywords = new Set(["export", "interface", "type", "enum", "readonly", "key", "string", "number", "boolean", "null", "unknown", "Date", "never", "any", "void", "undefined"]);
    let result = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const tokens = [];
    let remaining = result;
    while (remaining.length) {
      const cmtMatch = remaining.match(/^(\/\/[^\n]*)/);
      if (cmtMatch) {
        tokens.push({ type: "cmt", text: cmtMatch[0] });
        remaining = remaining.slice(cmtMatch[0].length);
        continue;
      }
      const strMatch = remaining.match(/^("(?:[^"\\]|\\.)*")/);
      if (strMatch) {
        tokens.push({ type: "str", text: strMatch[0] });
        remaining = remaining.slice(strMatch[0].length);
        continue;
      }
      const wordMatch = remaining.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);
      if (wordMatch) {
        tokens.push({ type: keywords.has(wordMatch[0]) ? "kw" : "plain", text: wordMatch[0] });
        remaining = remaining.slice(wordMatch[0].length);
        continue;
      }
      const numMatch = remaining.match(/^(\d+(?:\.\d+)?)/);
      if (numMatch) {
        tokens.push({ type: "num", text: numMatch[0] });
        remaining = remaining.slice(numMatch[0].length);
        continue;
      }
      const puncMatch = remaining.match(/^([{}[\]();,.])/);
      if (puncMatch) {
        tokens.push({ type: "punc", text: puncMatch[0] });
        remaining = remaining.slice(puncMatch[0].length);
        continue;
      }
      const opMatch = remaining.match(/^([=?:|&])/);
      if (opMatch) {
        tokens.push({ type: "op", text: opMatch[0] });
        remaining = remaining.slice(opMatch[0].length);
        continue;
      }
      tokens.push({ type: "plain", text: remaining[0] });
      remaining = remaining.slice(1);
    }
    return tokens.map((t) => {
      if (t.type === "plain") return t.text;
      return `<span class="${t.type}">${t.text}</span>`;
    }).join("");
  }

  function highlightJSON(code) {
    if (!code) return "";
    let result = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const tokens = [];
    let remaining = result;
    while (remaining.length) {
      const strMatch = remaining.match(/^("(?:[^"\\]|\\.)*")/);
      if (strMatch) {
        tokens.push({ type: "str", text: strMatch[0] });
        remaining = remaining.slice(strMatch[0].length);
        continue;
      }
      const numMatch = remaining.match(/^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
      if (numMatch) {
        tokens.push({ type: "num", text: numMatch[0] });
        remaining = remaining.slice(numMatch[0].length);
        continue;
      }
      const kwMatch = remaining.match(/^(true|false|null)\b/);
      if (kwMatch) {
        tokens.push({ type: "kw", text: kwMatch[0] });
        remaining = remaining.slice(kwMatch[0].length);
        continue;
      }
      const puncMatch = remaining.match(/^([{}[\]:,])/);
      if (puncMatch) {
        tokens.push({ type: "punc", text: puncMatch[0] });
        remaining = remaining.slice(puncMatch[0].length);
        continue;
      }
      tokens.push({ type: "plain", text: remaining[0] });
      remaining = remaining.slice(1);
    }
    let inKey = false;
    let depth = 0;
    const parentIsObject = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === "punc" && (t.text === "{" || t.text === "[")) {
        depth++;
        parentIsObject.push(t.text === "{");
        inKey = t.text === "{";
        continue;
      }
      if (t.type === "punc" && (t.text === "}" || t.text === "]")) {
        parentIsObject.pop();
        depth--;
        inKey = false;
        continue;
      }
      if (t.type === "punc" && t.text === ":") {
        inKey = false;
        continue;
      }
      if (t.type === "punc" && t.text === ",") {
        inKey = parentIsObject.length > 0 && parentIsObject[parentIsObject.length - 1];
        continue;
      }
      if (t.type === "str" && inKey) {
        t.type = "prop";
        inKey = false;
      }
    }
    return tokens.map((t) => {
      if (t.type === "plain") return t.text;
      return `<span class="${t.type}">${t.text}</span>`;
    }).join("");
  }

  let currentTab = "ts";

  function update() {
    try {
      const result = convert(dom.input.value, dom.rootName.value, {
        typeNameStyle: dom.typeNameStyle.value,
        propertyNameStyle: dom.propertyNameStyle.value,
        outputStyle: dom.outputStyle.value,
        detectDates: dom.detectDates.checked,
        detectEnums: dom.detectEnums.checked,
        detectIndexSignatures: dom.detectIndexSig.checked
      });
      dom.output.innerHTML = highlightTS(result.code) || "// 在左侧粘贴 JSON 后自动生成 TypeScript 类型";
      dom.schemaOutput.innerHTML = highlightJSON(result.schema) || "// 在左侧粘贴 JSON 后自动生成 JSON Schema";
      dom.stats.textContent = `${result.count} 条样本`;
      dom.status.textContent = result.count ? "生成成功" : "等待输入";
      dom.status.className = result.count ? "ok" : "";
    } catch (error) {
      dom.output.innerHTML = highlightTS(`// JSON 解析失败\n// ${error.message}`);
      dom.schemaOutput.innerHTML = "";
      dom.status.textContent = "解析失败";
      dom.status.className = "error";
      dom.stats.textContent = "0 条样本";
    }
  }

  function switchTab(tab) {
    currentTab = tab;
    dom.tabBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    const tsBox = dom.output.closest(".code-box");
    const schemaBox = document.querySelector(".schema-box");
    if (tab === "ts") {
      tsBox.style.display = "";
      schemaBox.style.display = "none";
      dom.copyBtn.textContent = "复制 TS";
    } else {
      tsBox.style.display = "none";
      schemaBox.style.display = "";
      dom.copyBtn.textContent = "复制 Schema";
    }
  }

  dom.input.addEventListener("input", update);
  dom.rootName.addEventListener("input", update);
  dom.typeNameStyle.addEventListener("change", update);
  dom.propertyNameStyle.addEventListener("change", update);
  dom.outputStyle.addEventListener("change", update);
  dom.detectDates.addEventListener("change", update);
  dom.detectEnums.addEventListener("change", update);
  dom.detectIndexSig.addEventListener("change", update);
  dom.tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  dom.sampleBtn.addEventListener("click", () => {
    dom.input.value = sampleJson;
    update();
  });
  dom.copyBtn.addEventListener("click", async () => {
    const textContent = currentTab === "ts"
      ? (dom.output.textContent || "")
      : (dom.schemaOutput.textContent || "");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(textContent);
    } else {
      const helper = document.createElement("textarea");
      helper.value = textContent;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    dom.copyBtn.textContent = "已复制";
    window.setTimeout(() => {
      dom.copyBtn.textContent = currentTab === "ts" ? "复制 TS" : "复制 Schema";
    }, 1100);
  });

  update();

  window.JsonTsGenerator = {
    convert,
    parseSamples,
    infer,
    mergeTypes,
    generateTypes,
    generateSchema
  };
})();
