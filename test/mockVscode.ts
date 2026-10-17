// Mock vscode module for running unit tests outside of the VS Code extension host
const Module = require('node:module');

const mockVscode = {
  workspace: {
    findFiles: async () => [],
    createFileSystemWatcher: () => ({
      onDidCreate: () => ({ dispose: () => {} }),
      onDidChange: () => ({ dispose: () => {} }),
      onDidDelete: () => ({ dispose: () => {} }),
      dispose: () => {}
    }),
    asRelativePath: (uri: { fsPath: string }) => uri.fsPath,
    fs: {
      readFile: async () => Buffer.from('')
    }
  },
  CompletionItem: class {
    label: string;
    kind?: number;
    constructor(label: string, kind?: number) {
      this.label = label;
      this.kind = kind;
    }
  },
  CompletionItemKind: {
    Class: 6,
    Property: 9,
    Keyword: 13,
    Value: 11,
    EnumMember: 19
  },
  CompletionItemTag: {
    Deprecated: 1
  },
  CompletionList: class {
    items: any[];
    isIncomplete: boolean;
    constructor(items: any[] = [], isIncomplete = false) {
      this.items = items;
      this.isIncomplete = isIncomplete;
    }
  },
  SnippetString: class {
    value: string;
    constructor(value = '') {
      this.value = value;
    }
  },
  MarkdownString: class {
    value = '';
    appendMarkdown(str: string) {
      this.value += str;
    }
  },
  Position: class {
    line: number;
    character: number;
    constructor(line = 0, character = 0) {
      this.line = line;
      this.character = character;
    }
  },
  Range: class {
    start: { line: number; character: number };
    end: { line: number; character: number };
    constructor(startLine = 0, startChar = 0, endLine = 0, endChar = 0) {
      this.start = { line: startLine, character: startChar };
      this.end = { line: endLine, character: endChar };
    }
  },
  Hover: class {}
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function (path: string, ...args: any[]) {
  if (path === 'vscode') {
    return mockVscode;
  }
  return originalRequire.call(this, path, ...args);
};

export { mockVscode };
