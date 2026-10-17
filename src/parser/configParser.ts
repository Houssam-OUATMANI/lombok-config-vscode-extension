/**
 * High-performance, fault-tolerant parser for lombok.config files.
 * Extracts an AST with precise line and character ranges for every token.
 */

export type ConfigOperator = '=' | '+=' | '-=';

export interface TextRange {
  readonly line: number;
  readonly startChar: number;
  readonly endChar: number;
}

export interface BaseNode {
  readonly line: number;
  readonly fullRange: TextRange;
  readonly comment?: string;
  readonly commentRange?: TextRange;
}

export interface PropertyNode extends BaseNode {
  readonly kind: 'property';
  readonly key: string;
  readonly keyRange: TextRange;
  readonly operator: ConfigOperator;
  readonly operatorRange: TextRange;
  readonly value: string;
  readonly valueRange: TextRange;
}

export interface ClearDirectiveNode extends BaseNode {
  readonly kind: 'clear';
  readonly clearRange: TextRange;
  readonly key: string;
  readonly keyRange: TextRange;
}

export interface CommentNode extends BaseNode {
  readonly kind: 'comment';
  readonly text: string;
}

export interface MalformedNode extends BaseNode {
  readonly kind: 'malformed';
  readonly rawText: string;
  readonly reason: string;
  readonly partialKey?: string;
  readonly partialKeyRange?: TextRange;
  readonly operator?: ConfigOperator;
  readonly operatorRange?: TextRange;
}

export interface EmptyNode extends BaseNode {
  readonly kind: 'empty';
}

export type ConfigNode =
  | PropertyNode
  | ClearDirectiveNode
  | CommentNode
  | MalformedNode
  | EmptyNode;

export interface ParsedConfigFile {
  readonly lines: readonly string[];
  readonly nodes: readonly ConfigNode[];
}

/**
 * Parses full lombok.config text into an array of typed AST nodes.
 */
export function parseConfigText(text: string): ParsedConfigFile {
  const lines = text.split(/\r?\n/);
  const nodes: ConfigNode[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    nodes.push(parseLine(rawLine, lineIndex));
  }

  return { lines, nodes };
}

/**
 * Parses a single line of a lombok.config file.
 */
export function parseLine(rawLine: string, lineIndex: number): ConfigNode {
  const fullRange: TextRange = {
    line: lineIndex,
    startChar: 0,
    endChar: rawLine.length
  };

  // 1. Check for empty or whitespace-only line
  if (rawLine.trim().length === 0) {
    return { kind: 'empty', line: lineIndex, fullRange };
  }

  // 2. Extract comment if present
  let content = rawLine;
  let commentText: string | undefined;
  let commentRange: TextRange | undefined;

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

  // Pure comment line
  if (content.trim().length === 0) {
    return {
      kind: 'comment',
      line: lineIndex,
      fullRange,
      text: commentText ?? '',
      comment: commentText,
      commentRange
    };
  }

  // 3. Check for "clear" directive: clear <key>
  const clearMatch = content.match(/^(\s*)(clear)(\s+)([^\s#=+\-]+)?(\s*)$/);
  if (clearMatch) {
    const leadingWhitespace = clearMatch[1].length;
    const clearKeyword = clearMatch[2];
    const clearRange: TextRange = {
      line: lineIndex,
      startChar: leadingWhitespace,
      endChar: leadingWhitespace + clearKeyword.length
    };

    const keyToken = clearMatch[4] ?? '';
    const keyStart = leadingWhitespace + clearKeyword.length + clearMatch[3].length;
    const keyRange: TextRange = {
      line: lineIndex,
      startChar: keyStart,
      endChar: keyStart + keyToken.length
    };

    return {
      kind: 'clear',
      line: lineIndex,
      fullRange,
      clearRange,
      key: keyToken,
      keyRange,
      comment: commentText,
      commentRange
    };
  }

  // 4. Check for property assignment: <key> [= | += | -=] <value>
  // Regex captures: 1: indent, 2: key, 3: space, 4: operator, 5: space, 6: value
  const assignMatch = content.match(/^(\s*)([^\s=+\-]+)(\s*)(\+=|-=|=)(\s*)(.*)$/);
  if (assignMatch) {
    const indent = assignMatch[1].length;
    const key = assignMatch[2];
    const keyRange: TextRange = {
      line: lineIndex,
      startChar: indent,
      endChar: indent + key.length
    };

    const opStart = indent + key.length + assignMatch[3].length;
    const operator = assignMatch[4] as ConfigOperator;
    const operatorRange: TextRange = {
      line: lineIndex,
      startChar: opStart,
      endChar: opStart + operator.length
    };

    const valueStart = opStart + operator.length + assignMatch[5].length;
    const rawVal = assignMatch[6];
    // Trim trailing whitespace from value while preserving accurate range
    const trimmedVal = rawVal.trimEnd();
    const valueRange: TextRange = {
      line: lineIndex,
      startChar: valueStart,
      endChar: valueStart + trimmedVal.length
    };

    return {
      kind: 'property',
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

  // 5. Malformed line (e.g. key without operator, invalid syntax)
  const partialMatch = content.match(/^(\s*)([^\s=+\-]+)(\s*)(\+=|-=|=)?(.*)$/);
  if (partialMatch) {
    const indent = partialMatch[1].length;
    const key = partialMatch[2];
    const keyRange: TextRange = {
      line: lineIndex,
      startChar: indent,
      endChar: indent + key.length
    };

    let operator: ConfigOperator | undefined;
    let operatorRange: TextRange | undefined;
    if (partialMatch[4]) {
      const opStart = indent + key.length + partialMatch[3].length;
      operator = partialMatch[4] as ConfigOperator;
      operatorRange = {
        line: lineIndex,
        startChar: opStart,
        endChar: opStart + operator.length
      };
    }

    return {
      kind: 'malformed',
      line: lineIndex,
      fullRange,
      rawText: rawLine,
      reason: operator ? 'Missing or malformed property value' : 'Missing assignment operator (=, +=, -=)',
      partialKey: key,
      partialKeyRange: keyRange,
      operator,
      operatorRange,
      comment: commentText,
      commentRange
    };
  }

  return {
    kind: 'malformed',
    line: lineIndex,
    fullRange,
    rawText: rawLine,
    reason: 'Syntax error in configuration entry',
    comment: commentText,
    commentRange
  };
}

/**
 * Finds the index of '#' starting a comment (outside any literal/escape if needed).
 */
function findCommentIndex(line: string): number {
  return line.indexOf('#');
}

export type CursorContext =
  | { kind: 'key'; node?: ConfigNode; prefix: string; range: TextRange }
  | { kind: 'value'; node: PropertyNode; prefix: string; range: TextRange }
  | { kind: 'clearTarget'; node: ClearDirectiveNode; prefix: string; range: TextRange }
  | { kind: 'comment'; node: ConfigNode }
  | { kind: 'empty'; line: number; character: number };

/**
 * Determines exact semantic context for the cursor position.
 */
export function getCursorContext(
  file: ParsedConfigFile,
  line: number,
  character: number
): CursorContext {
  if (line < 0 || line >= file.nodes.length) {
    return { kind: 'empty', line, character };
  }

  const node = file.nodes[line];
  const rawLine = file.lines[line] ?? '';

  // Check if cursor is in comment
  if (node.commentRange && character >= node.commentRange.startChar) {
    return { kind: 'comment', node };
  }

  if (node.kind === 'empty') {
    return { kind: 'empty', line, character };
  }

  if (node.kind === 'clear') {
    if (character >= node.keyRange.startChar) {
      const prefix = rawLine.substring(node.keyRange.startChar, character);
      return { kind: 'clearTarget', node, prefix, range: node.keyRange };
    }
    return {
      kind: 'key',
      node,
      prefix: rawLine.substring(0, character).trim(),
      range: node.clearRange
    };
  }

  if (node.kind === 'property') {
    // If cursor is on the key side
    if (character <= node.keyRange.endChar) {
      const prefix = rawLine.substring(node.keyRange.startChar, character);
      return { kind: 'key', node, prefix, range: node.keyRange };
    }
    // If cursor is between key and operator or on operator
    if (character <= node.operatorRange.endChar) {
      return {
        kind: 'key',
        node,
        prefix: node.key,
        range: node.keyRange
      };
    }
    // If cursor is after operator (in value position)
    const valStart = node.valueRange.startChar;
    const prefix = character >= valStart ? rawLine.substring(valStart, character) : '';
    return {
      kind: 'value',
      node,
      prefix,
      range: {
        line,
        startChar: valStart,
        endChar: Math.max(node.valueRange.endChar, character)
      }
    };
  }

  if (node.kind === 'malformed') {
    if (node.operatorRange && character > node.operatorRange.endChar) {
      // In value position after operator
      const start = node.operatorRange.endChar + 1;
      const prefix = rawLine.substring(start, character).trim();
      return {
        kind: 'key',
        node,
        prefix,
        range: { line, startChar: start, endChar: character }
      };
    }
    const start = node.partialKeyRange ? node.partialKeyRange.startChar : 0;
    const prefix = rawLine.substring(start, character).trim();
    return {
      kind: 'key',
      node,
      prefix,
      range: { line, startChar: start, endChar: character }
    };
  }

  return { kind: 'empty', line, character };
}
