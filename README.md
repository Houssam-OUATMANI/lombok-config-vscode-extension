<div align="center">

<img src="icon.png" alt="Lombok Sense Icon" width="128" height="128" />

# Lombok Sense for VS Code

**IntelliJ IDEA-grade language intelligence for `lombok.config` files in Visual Studio Code.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-007ACC.svg)](https://code.visualstudio.com/)

</div>

---

## 🌟 Overview

**Lombok Sense** bridges the gap between IntelliJ IDEA and Visual Studio Code by bringing full-featured, zero-latency support for Project Lombok configuration files (`lombok.config`).

No more guesswork or switching back to IntelliJ to configure your Lombok properties. Enjoy rich auto-completion, contextual documentation, real-time semantic diagnostics, 1-click Quick Fixes, and automatic document formatting.

---

## ✨ Features

### 1. 🎨 Syntax Highlighting & File Recognition
- Full TextMate grammar designed specifically for `lombok.config`.
- Highlights directives (`clear`), configuration keys (`lombok.*`, `config.stopBubbling`), assignment operators (`=`, `+=`, `-=`), booleans, enums, numbers, and comments (`#`).
- Associates any file named `lombok.config` with the dedicated language ID `lombok-config`.

### 2. ⚡ Intelligent Autocompletion (IntelliSense)
- **Key Completion**: Instant autocomplete for all official Project Lombok configuration keys with type and category details.
- **Value Completion**: Context-aware completion for allowed values:
  - Boolean keys (`true`, `false`)
  - Enums and strategies (e.g., `callSuper = [call | ignore | warn]`)
  - Flag usage rules (`flagUsage = [allow | warning | error]`)
  - Framework annotations (`addNullAnnotations = [jetbrains | spring | checkerframework | ...]`)
- **Clear Directive**: Autocompletes `clear` and lists candidates that can be cleared.

### 3. 📖 Quick Documentation (Hover Cards)
- Hover over any key to view:
  - Official Project Lombok explanation and documentation.
  - Property type and category.
  - Default value.
  - Allowed options and choices.
  - Deprecation warnings and recommended replacements.
- Hover over operators (`=`, `+=`, `-=`) and the `clear` keyword for immediate reference.

### 4. 🔍 Real-Time Diagnostics & Linting
- **Typo Detection & Unknown Keys**: Flags misspelled or unknown configuration keys and suggests the closest valid Lombok property using Levenshtein distance.
- **Invalid Values**: Flags non-boolean or unallowed enum values before you build.
- **Invalid Operators**: Emits an error if list operators (`+=`, `-=`) are used on scalar properties.
- **Deprecated Properties**: Visually strikes through deprecated properties with a warning and actionable replacement advice.

### 5. 💡 1-Click Quick Fixes (Code Actions)
- Correct typos in configuration keys with one click.
- Fix invalid operators (change `+=` to `=` on non-list keys).
- Replace deprecated configuration keys with modern equivalents.

### 6. 📐 Document Formatting
- Formats configuration files with standard single-space operator alignment (`key = value`), cleanly indented directives, and normalized comments.

---

## ⚙️ Extension Settings

Configure Lombok Sense to fit your team's code standards:

| Setting | Default | Description |
|---|---|---|
| `lombokSense.lint.unknownKeys` | `"warning"` | Severity level for unknown or misspelled keys (`"warning"`, `"error"`, or `"ignore"`). |
| `lombokSense.lint.deprecatedKeys` | `"warning"` | Severity level for deprecated Lombok properties. |
| `lombokSense.lint.invalidValues` | `"error"` | Severity level for unallowed or malformed values. |
| `lombokSense.lint.invalidOperators` | `"error"` | Severity level when `+=` or `-=` is used on scalar properties. |
| `lombokSense.format.spaceAroundOperator` | `true` | Ensures a single space around operators (`=`, `+=`, `-=`) when formatting. |

---

## 🚀 Quick Start

1. Open or create any `lombok.config` file in your workspace.
2. Start typing `lombok.` or press `Ctrl + Space` to browse available configuration keys.
3. Hover over keys and values for inline documentation.
4. Press `Shift + Alt + F` (or `Shift + Option + F` on macOS) to format the configuration file.

---

## 🧪 Development & Testing

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Build extension bundle
npm run build
```

---

## 📄 License

MIT © Lombok Sense Contributors
