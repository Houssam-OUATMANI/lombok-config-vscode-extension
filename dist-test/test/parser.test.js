"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// test/parser.test.ts
var import_node_test = __toESM(require("node:test"));
var import_strict = __toESM(require("node:assert/strict"));

// src/parser/configParser.ts
function parseConfigText(text) {
  const lines = text.split(/\r?\n/);
  const nodes = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    nodes.push(parseLine(rawLine, lineIndex));
  }
  return { lines, nodes };
}
function parseLine(rawLine, lineIndex) {
  const fullRange = {
    line: lineIndex,
    startChar: 0,
    endChar: rawLine.length
  };
  if (rawLine.trim().length === 0) {
    return { kind: "empty", line: lineIndex, fullRange };
  }
  let content = rawLine;
  let commentText;
  let commentRange;
  const commentIndex = findCommentIndex(rawLine);
  if (commentIndex !== -1) {
    commentText = rawLine.slice(commentIndex + 1);
    commentRange = {
      line: lineIndex,
      startChar: commentIndex,
      endChar: rawLine.length
    };
    content = rawLine.slice(0, commentIndex);
  }
  if (content.trim().length === 0) {
    return {
      kind: "comment",
      line: lineIndex,
      fullRange,
      text: commentText ?? "",
      comment: commentText,
      commentRange
    };
  }
  const clearMatch = content.match(/^(\s*)(clear)(\s+)([^\s#=+\-]+)?(\s*)$/);
  if (clearMatch) {
    const leadingWhitespace = clearMatch[1].length;
    const clearKeyword = clearMatch[2];
    const clearRange = {
      line: lineIndex,
      startChar: leadingWhitespace,
      endChar: leadingWhitespace + clearKeyword.length
    };
    const keyToken = clearMatch[4] ?? "";
    const keyStart = leadingWhitespace + clearKeyword.length + clearMatch[3].length;
    const keyRange = {
      line: lineIndex,
      startChar: keyStart,
      endChar: keyStart + keyToken.length
    };
    return {
      kind: "clear",
      line: lineIndex,
      fullRange,
      clearRange,
      key: keyToken,
      keyRange,
      comment: commentText,
      commentRange
    };
  }
  const assignMatch = content.match(/^(\s*)([^\s=+\-]+)(\s*)(\+=|-=|=)(\s*)(.*)$/);
  if (assignMatch) {
    const indent = assignMatch[1].length;
    const key = assignMatch[2];
    const keyRange = {
      line: lineIndex,
      startChar: indent,
      endChar: indent + key.length
    };
    const opStart = indent + key.length + assignMatch[3].length;
    const operator = assignMatch[4];
    const operatorRange = {
      line: lineIndex,
      startChar: opStart,
      endChar: opStart + operator.length
    };
    const valueStart = opStart + operator.length + assignMatch[5].length;
    const rawVal = assignMatch[6];
    const trimmedVal = rawVal.trimEnd();
    const valueRange = {
      line: lineIndex,
      startChar: valueStart,
      endChar: valueStart + trimmedVal.length
    };
    return {
      kind: "property",
      line: lineIndex,
      fullRange,
      key,
      keyRange,
      operator,
      operatorRange,
      value: trimmedVal,
      valueRange,
      comment: commentText,
      commentRange
    };
  }
  const partialMatch = content.match(/^(\s*)([^\s=+\-]+)(\s*)(\+=|-=|=)?(.*)$/);
  if (partialMatch) {
    const indent = partialMatch[1].length;
    const key = partialMatch[2];
    const keyRange = {
      line: lineIndex,
      startChar: indent,
      endChar: indent + key.length
    };
    let operator;
    let operatorRange;
    if (partialMatch[4]) {
      const opStart = indent + key.length + partialMatch[3].length;
      operator = partialMatch[4];
      operatorRange = {
        line: lineIndex,
        startChar: opStart,
        endChar: opStart + operator.length
      };
    }
    return {
      kind: "malformed",
      line: lineIndex,
      fullRange,
      rawText: rawLine,
      reason: operator ? "Missing or malformed property value" : "Missing assignment operator (=, +=, -=)",
      partialKey: key,
      partialKeyRange: keyRange,
      operator,
      operatorRange,
      comment: commentText,
      commentRange
    };
  }
  return {
    kind: "malformed",
    line: lineIndex,
    fullRange,
    rawText: rawLine,
    reason: "Syntax error in configuration entry",
    comment: commentText,
    commentRange
  };
}
function findCommentIndex(line) {
  return line.indexOf("#");
}
function getCursorContext(file, line, character) {
  if (line < 0 || line >= file.nodes.length) {
    return { kind: "empty", line, character };
  }
  const node = file.nodes[line];
  const rawLine = file.lines[line] ?? "";
  if (node.commentRange && character >= node.commentRange.startChar) {
    return { kind: "comment", node };
  }
  if (node.kind === "empty") {
    return { kind: "empty", line, character };
  }
  if (node.kind === "clear") {
    if (character >= node.keyRange.startChar) {
      const prefix = rawLine.substring(node.keyRange.startChar, character);
      return { kind: "clearTarget", node, prefix, range: node.keyRange };
    }
    return {
      kind: "key",
      node,
      prefix: rawLine.substring(0, character).trim(),
      range: node.clearRange
    };
  }
  if (node.kind === "property") {
    if (character <= node.keyRange.endChar) {
      const prefix2 = rawLine.substring(node.keyRange.startChar, character);
      return { kind: "key", node, prefix: prefix2, range: node.keyRange };
    }
    if (character <= node.operatorRange.endChar) {
      return {
        kind: "key",
        node,
        prefix: node.key,
        range: node.keyRange
      };
    }
    const valStart = node.valueRange.startChar;
    const prefix = character >= valStart ? rawLine.substring(valStart, character) : "";
    return {
      kind: "value",
      node,
      prefix,
      range: {
        line,
        startChar: valStart,
        endChar: Math.max(node.valueRange.endChar, character)
      }
    };
  }
  if (node.kind === "malformed") {
    if (node.operatorRange && character > node.operatorRange.endChar) {
      const start2 = node.operatorRange.endChar + 1;
      const prefix2 = rawLine.substring(start2, character).trim();
      return {
        kind: "key",
        node,
        prefix: prefix2,
        range: { line, startChar: start2, endChar: character }
      };
    }
    const start = node.partialKeyRange ? node.partialKeyRange.startChar : 0;
    const prefix = rawLine.substring(start, character).trim();
    return {
      kind: "key",
      node,
      prefix,
      range: { line, startChar: start, endChar: character }
    };
  }
  return { kind: "empty", line, character };
}

// test/parser.test.ts
(0, import_node_test.default)("parses empty and comment lines", () => {
  const content = "\n# Root config\n   \n# Another comment\n";
  const parsed = parseConfigText(content);
  import_strict.default.equal(parsed.nodes.length, 5);
  import_strict.default.equal(parsed.nodes[0].kind, "empty");
  import_strict.default.equal(parsed.nodes[1].kind, "comment");
  import_strict.default.equal(parsed.nodes[2].kind, "empty");
  import_strict.default.equal(parsed.nodes[3].kind, "comment");
});
(0, import_node_test.default)("parses standard property assignments", () => {
  const content = [
    "config.stopBubbling = true",
    "lombok.accessors.chain = true # enable chaining",
    "lombok.accessors.prefix += m_",
    "lombok.accessors.prefix -= f_"
  ].join("\n");
  const parsed = parseConfigText(content);
  import_strict.default.equal(parsed.nodes.length, 4);
  const n0 = parsed.nodes[0];
  import_strict.default.equal(n0.kind, "property");
  if (n0.kind === "property") {
    import_strict.default.equal(n0.key, "config.stopBubbling");
    import_strict.default.equal(n0.operator, "=");
    import_strict.default.equal(n0.value, "true");
  }
  const n1 = parsed.nodes[1];
  import_strict.default.equal(n1.kind, "property");
  if (n1.kind === "property") {
    import_strict.default.equal(n1.key, "lombok.accessors.chain");
    import_strict.default.equal(n1.operator, "=");
    import_strict.default.equal(n1.value, "true");
    import_strict.default.equal(n1.comment?.trim(), "enable chaining");
  }
  const n2 = parsed.nodes[2];
  import_strict.default.equal(n2.kind, "property");
  if (n2.kind === "property") {
    import_strict.default.equal(n2.operator, "+=");
    import_strict.default.equal(n2.value, "m_");
  }
  const n3 = parsed.nodes[3];
  import_strict.default.equal(n3.kind, "property");
  if (n3.kind === "property") {
    import_strict.default.equal(n3.operator, "-=");
    import_strict.default.equal(n3.value, "f_");
  }
});
(0, import_node_test.default)("parses clear directive", () => {
  const content = "clear lombok.accessors.prefix # clear prefixes";
  const parsed = parseConfigText(content);
  import_strict.default.equal(parsed.nodes.length, 1);
  const n = parsed.nodes[0];
  import_strict.default.equal(n.kind, "clear");
  if (n.kind === "clear") {
    import_strict.default.equal(n.key, "lombok.accessors.prefix");
    import_strict.default.equal(n.comment?.trim(), "clear prefixes");
  }
});
(0, import_node_test.default)("parses malformed lines gracefully", () => {
  const content = "lombok.accessors.chain\n= true";
  const parsed = parseConfigText(content);
  import_strict.default.equal(parsed.nodes[0].kind, "malformed");
});
(0, import_node_test.default)("detects cursor context correctly", () => {
  const content = [
    "lombok.accessors.",
    "lombok.equalsAndHashCode.callSuper = ",
    "clear lombok.copyable"
  ].join("\n");
  const parsed = parseConfigText(content);
  const ctx0 = getCursorContext(parsed, 0, 17);
  import_strict.default.equal(ctx0.kind, "key");
  const ctx1 = getCursorContext(parsed, 1, 37);
  import_strict.default.equal(ctx1.kind, "value");
  const ctx2 = getCursorContext(parsed, 2, 10);
  import_strict.default.equal(ctx2.kind, "clearTarget");
});
