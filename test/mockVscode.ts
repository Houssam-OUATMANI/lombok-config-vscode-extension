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
  MarkdownString: class {
    value = '';
    appendMarkdown(str: string) {
      this.value += str;
    }
  },
  Range: class {},
  Position: class {},
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
