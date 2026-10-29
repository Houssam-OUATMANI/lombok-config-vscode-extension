// Mock vscode module for running unit tests outside of the VS Code extension host
const Module = require('node:module');

const mockVscode = {
  workspace: {
    findFiles: async () => [],
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
    createFileSystemWatcher: () => ({
      onDidCreate: () => ({ dispose: () => {} }),
      onDidChange: () => ({ dispose: () => {} }),
      onDidDelete: () => ({ dispose: () => {} }),
      dispose: () => {}
    }),
    asRelativePath: (uri: { fsPath: string }) => uri.fsPath,
    fs: {
      readFile: async () => Buffer.from('')
    },
    getConfiguration: (_section = '') => ({
      get: (_key: string, defaultValue?: any) => defaultValue
    })
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
  Hover: class {
    contents: any[];
    range?: any;
    constructor(contents: any, range?: any) {
      this.contents = Array.isArray(contents) ? contents : [contents];
      this.range = range;
    }
  },
  DocumentSymbol: class {
    name: string;
    detail: string;
    kind: number;
    range: any;
    selectionRange: any;
    children: any[] = [];
    constructor(name: string, detail: string, kind: number, range: any, selectionRange: any) {
      this.name = name;
      this.detail = detail;
      this.kind = kind;
      this.range = range;
      this.selectionRange = selectionRange;
    }
  },
  SymbolKind: {
    Namespace: 2,
    Property: 6,
    Boolean: 16,
    Array: 17,
    String: 14,
    EnumMember: 21,
    Event: 23
  },
  Diagnostic: class {
    range: any;
    message: string;
    severity: number;
    code?: string;
    source?: string;
    tags?: number[];
    constructor(range: any, message: string, severity = 0) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3
  },
  DiagnosticTag: {
    Unnecessary: 1,
    Deprecated: 2
  },
  CodeAction: class {
    title: string;
    kind: any;
    edit?: any;
    diagnostics?: any[];
    isPreferred?: boolean;
    constructor(title: string, kind?: any) {
      this.title = title;
      this.kind = kind;
    }
  },
  CodeActionKind: {
    QuickFix: 'quickfix'
  },
  WorkspaceEdit: class {
    operations: any[] = [];
    replace(uri: any, range: any, newText: string) {
      this.operations.push({ type: 'replace', uri, range, newText });
    }
    delete(uri: any, range: any) {
      this.operations.push({ type: 'delete', uri, range });
    }
    insert(uri: any, position: any, newText: string) {
      this.operations.push({ type: 'insert', uri, position, newText });
    }
  },
  InlayHint: class {
    position: any;
    label: string;
    kind?: number;
    tooltip?: string;
    constructor(position: any, label: string, kind?: number) {
      this.position = position;
      this.label = label;
      this.kind = kind;
    }
  },
  InlayHintKind: {
    Type: 1,
    Parameter: 2
  },
  Location: class {
    uri: any;
    range: any;
    constructor(uri: any, rangeOrPosition: any) {
      this.uri = uri;
      this.range = rangeOrPosition;
    }
  },
  Uri: {
    file: (fsPath: string) => ({ fsPath, toString: () => fsPath, scheme: 'file' }),
    joinPath: (base: any, ...segments: string[]) => ({
      fsPath: `${base.fsPath}/${segments.join('/')}`,
      toString: () => `${base.fsPath}/${segments.join('/')}`
    })
  },
  commands: {
    registerCommand: (_cmd: string, _callback: Function) => ({ dispose: () => {} })
  },
  window: {
    createOutputChannel: () => ({
      appendLine: (_message: string) => {},
      dispose: () => {}
    }),
    showInformationMessage: async (_msg: string) => {},
    showWarningMessage: async (_msg: string) => {},
    showErrorMessage: async (_msg: string) => {},
    showTextDocument: async (_doc: any, _options?: any) => ({})
  }
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function (path: string, ...args: any[]) {
  if (path === 'vscode') {
    return mockVscode;
  }
  return originalRequire.call(this, path, ...args);
};

export { mockVscode };
