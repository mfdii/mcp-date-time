# Working with Git Submodules

Git submodules are indeed tricky. Here's a quick reference:

## Cloning a repo with submodules

```bash
# Option 1: Clone and init submodules in one step
git clone --recursive https://github.com/mfdii/mcp-date-time.git

# Option 2: Clone first, then init submodules
git clone https://github.com/mfdii/mcp-date-time.git
cd mcp-date-time
git submodule update --init --recursive
```

## Updating submodules to latest upstream

```bash
# Update specific submodule to latest from its tracked branch
cd repo/  # go into the submodule
git pull origin main  # or whatever branch
cd ..
git add repo
git commit -m "Update submodule to latest"
git push

# OR: Update all submodules at once
git submodule update --remote --merge
git add .
git commit -m "Update all submodules"
git push
```

## Making changes inside a submodule

```bash
cd repo/
# Make changes, commit as normal
git add .
git commit -m "Some change"
git push origin main  # Push to the submodule's repo

cd ..  # Back to parent repo
git add repo  # Record the new commit hash
git commit -m "Update submodule reference"
git push
```

## Common gotchas

- **Detached HEAD**: Submodules are pinned to specific commits. Always check `git status` before making changes in a submodule
- **Forgotten push**: If you update the submodule reference but forget to push the submodule itself, others can't clone
- **Accidental deletion**: Don't `rm -rf` a submodule - use `git submodule deinit` and `git rm`

## Quick status check

```bash
git submodule status  # See which commit each submodule is on
```

## Key Concept

**Submodules track specific commits, not branches**. Your parent repo stores a pointer to an exact commit hash in the submodule.
