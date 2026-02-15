## Package Management
Always use `pnpm` for installing dependencies. Do not use `npm` or `yarn` for installs.

## Validation Gate
Before committing:
1. Run typecheck using the project script (in this repo: `npm run typecheck`).
2. Run focused tests when the change impacts tested behavior.
3. If validation fails, do not commit unless the user explicitly asks to proceed.

## Commit and Push Policy
1. Stage and commit only files related to the current request.
2. If unrelated modified files exist, stop and ask before committing.
3. Use concise commit messages: `<scope>: <summary>` when possible.
4. Push only when the user explicitly asks to push.

## Refactor Mode
When user asks for "refactor" or "do the same":
1. Default to behavior-preserving refactors.
2. Prefer extracting small helpers for repeated logic.
3. Avoid API surface changes unless requested.
4. If API changes are needed, update callsites in the same change.

## Workspace Safety
1. Never revert or discard user changes unless explicitly requested.
2. If unexpected changes appear in files you are not editing, pause and ask how to proceed.
3. Never use destructive git commands without explicit user approval.

## Review Mode
When user asks for a review:
1. Report findings first (ordered by severity) with file references.
2. Focus on bugs, regressions, and missing tests.
3. Keep summary brief and secondary to findings.
