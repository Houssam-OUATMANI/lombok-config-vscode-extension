# Change Log

All notable changes to the "lombok-sense" extension will be documented in this file.

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
