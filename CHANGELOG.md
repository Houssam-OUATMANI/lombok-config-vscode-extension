# Change Log

All notable changes to the "lombok-sense" extension will be documented in this file.

## [1.0.0] - 2026-10-19

### Added
- **Effective Configuration Engine**: Traverses multi-level parent directory hierarchies up to `config.stopBubbling = true`.
- **Command `Lombok: Show Effective Configuration`**: Renders an interactive report displaying resolved property values, provenance trace, and status (`Local`, `Inherited`, `Overridden`).
- **Command `Lombok: Create Root lombok.config`**: One-click creation of a recommended root configuration file.
- **Document Symbol & Outline Provider**: Generates full Outline and Breadcrumbs hierarchy in VS Code, grouping properties by category (`Accessors`, `Builder`, `Configuration`, `Logging`...) with `Ctrl+Shift+O` navigation.
- **Go-To-Definition (`F12`)**:
  - Jump directly to the `@interface` Java source file in the workspace from `lombok.copyableAnnotations`.
  - Jump directly to the parent `lombok.config` declaration line when a property is inherited or overridden.
- **Inlay Hints**: Displays inline contextual parameter/type hints (`boolean`, `list`) and annotation source badges (`[Workspace]`, `[Qualifier]`).
- **Rich Java Code Previews in Hovers**: Interactive syntax-highlighted before/after Java code snippets in hover cards for popular Lombok properties.
- **New Diagnostics & Linters**:
  - Duplicate scalar key detection with QuickFix to remove overridden duplicates.
  - Strict key casing validation (enforcing lowercase) with QuickFix to auto-fix.
  - Convention warning for misplaced `config.stopBubbling = true` with QuickFix to move to top of file.
  - QuickFix to remove invalid `clear` directives on scalar properties.
- **Lombok 1.18.36 Alignment**:
  - Added `lombok.getter.noIsPrefix` and `lombok.accessors.noIsPrefix`.
  - Added `lombok.equalsAndHashCode.warnWhenNoExplicitlyIncluded`.
  - Added `lombok.disableConfig` and `lombok.nonNull.customAnnotation`.
  - Added `@Locked`, `@Jacksonized`, and `@anyConstructor` to `.flagUsage`.
  - Added `jspecify` nullability support.
  - Expanded framework annotation presets with JSpecify, Micronaut, Quarkus, and JPA/Hibernate.

### Fixed
- Fixed an issue where comments containing dashes after the cursor erroneously prevented operator snippet expansion during autocompletion.
- Optimized workspace Java file scanning by strictly excluding build output directories (`target/`, `build/`, `.gradle/`, `.idea/`, `bin/`).
- Cleaned up TextMate grammar inconsistencies.

## [0.1.1] - 2026-10-17

### Fixed
- Fixed autocompletion on multiline configurations: proper replacement ranges and fuzzy filter text now resolve key and value suggestions smoothly on empty lines and following newlines.
- Corrected cursor context resolution on malformed lines after assignment operators.

## [0.1.0] - 2026-10-17

### Initial Release
- Complete syntax highlighting grammar for `lombok.config` files.
- Full metadata catalog of Project Lombok configuration properties and flag usages.
- Smart autocompletion for keys, values, operators, and directives.
- Rich hover documentation for keys, values, operators, and `clear`.
- Real-time diagnostic validation:
  - Unknown keys detection with Levenshtein-based suggestions.
  - Invalid value validation (boolean and enum checks).
  - Operator misuse check (`+=` and `-=` on non-list properties).
  - Deprecated properties warnings.
- Quick Fix code actions for typos, invalid operators, and deprecated keys.
- Document formatting provider with configurable operator spacing.
