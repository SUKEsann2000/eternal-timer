# npm Package Release Notes Rules

This document defines the rules and template for writing release notes for this npm package.

## General Rules

- Release notes are **user-facing**
- Do NOT list raw commit messages
- Do NOT speculate or infer behavior
- Only describe changes that can be confirmed from the diff
- Prefer clarity over completeness
- Internal refactors should be mentioned **only if they affect users**

## Writing Guidelines

- Use clear and concise English
- Each bullet should describe **what changed** and **why it matters**
- Group changes by type
- Avoid implementation details unless necessary
- If there are no changes in a section, omit the section

## Version Comparison Rule

- Always compare against the previous release tag  
  (e.g. `v2.0.3` → current version)

---

# Release Notes Template

```md
# vX.Y.Z Release Notes

## Summary
Briefly describe the purpose of this release and its overall impact.

## Added
- New features or capabilities introduced in this release.

## Changed
- Modifications to existing behavior that are not bug fixes.

## Fixed
- Bug fixes and corrections.

## Removed
- Deprecated or removed features or behaviors.

## Breaking Changes
- Clearly describe any breaking changes.
- If none, this section should be omitted.

## Migration Notes (if applicable)
- Steps users need to take to adapt to breaking changes.

## Notes
- Any additional information relevant to users.
