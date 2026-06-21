# Project Agent Guidelines

## Always start here
- Read this file first.
- Read `CONTEXT.md` next.
- Follow any repo-specific docs such as `docs/engineering-standards.md`, `README.md`, and package scripts.
- If the repo has `client/AGENTS.md` or `server/AGENTS.md`, read those too.

## Default workflow
1. Understand the task and the project shape.
2. Check the project context and relevant docs.
3. Pick the smallest safe change.
4. Use existing scripts, skills, and conventions instead of inventing new ones.
5. Verify the change with the project's own test/build/lint commands.
6. If something is risky, ask before doing it.

## Superpowers workflow

For substantial implementation work, follow the workspace Superpowers order:
1. `brainstorming`
2. `using-git-worktrees`
3. `writing-plans`
4. `subagent-driven-development` or `executing-plans`
5. `test-driven-development`
6. `requesting-code-review`
7. `verification-before-completion`
8. `finishing-a-development-branch`

## Shared agent tools
Use the shared laptop-wide tools when they help:
- `opensrc` for package source inspection
- `greploop` for PR / patch polishing and iterative improvement
- `code-structure` when repeated operational logic should move into a shared service layer
- `code-simplifier` when recently changed code needs simplification without behavior changes

## Safety rules
- Do not delete, migrate, or rewrite data without explicit approval.
- Do not assume hidden state or undocumented behavior.
- Prefer explicit, reversible changes.
- Do not start or restart long-running servers in the same terminal unless the repo says it is safe.
- Keep human review in the loop for destructive, security-sensitive, or production-impacting actions.

## How to think
- AI may help with analysis, drafting, and refactoring.
- The developer remains the final authority on architecture, deletions, deployment, and risk.
- The best workflow is controlled autonomy, not unrestricted autonomy.
