<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git ownership and safety

- Admin changes belong to the independent repository at `Admin/Frontend` (DoorKart-Frontend). Read the root `AGENTS.md` section "Git Repository, Branch and Commit Safety" before Git work.
- Before editing, verify this repository, current branch, HEAD, Git status, and existing diffs. Preserve all existing work.
- BuyNest root also tracks admin files as ordinary files. Before any proposed commit or branch operation, inspect both repositories and identify overlapping root-tracked paths. A nested commit does not update root history. Do not silently synchronize tracking or change the repository structure.
- Branch operations, staging, commits (including on `main`), and pushes require specific approval; push approval is separate. Never use blanket staging or automatically stash, reset, clean, merge, rebase, or force-push.
- Before commit approval, show repository, branch, exact files/hunks, message, test results, excluded work, and overlapping-root impact. Ask: "Do you approve staging and committing ONLY these changes?" Wait for explicit approval. Documentation approval alone does not authorize a commit.
