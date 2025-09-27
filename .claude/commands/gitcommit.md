allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git push:*)
description: Stage all changes, create a git commit with auto-generated message, and push to the remote branch
---

## Current Git Status

!`git status --short`

## Changes to be Committed

!`git diff --cached --stat`
!`git diff --stat`

## Task

1. First, stage all changes using `git add .`
2. Analyze the changes shown above and create a concise but detailed commit message that:
   - Starts with a conventional commit type (feat, fix, docs, style, refactor, test, chore, etc.)
   - Includes a brief subject line (50 chars or less)
   - If needed, adds a body with more details about what changed and why
3. Execute the git commit with the generated message
4. Push the commit to the current branch's remote using `git push -u origin $(git rev-parse --abbrev-ref HEAD)`
5. Provide the user with a summary showing:
   - The commit message used
   - Brief overview of what was committed
   - Number of files changed

Make sure the commit message accurately reflects all the changes being made.