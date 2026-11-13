#!/bin/sh
# Keeps the main folder (~/Code/Saltline) a clean, current baseline: fast-forwards it to
# origin/main. A Cindy scheduled job ("script only" mode) runs it every hour; it is safe to
# run by hand too. It never touches a folder that is on another branch, has uncommitted
# changes or local commits — it just reports and leaves it alone.
#
# stdout carries one cindy-script/1 "complete" frame (the scheduler's protocol); logs go to stderr.
set -u
cd "$(dirname "$0")/.." || exit 1

finish() {
  printf '{"protocol":"cindy-script/1","type":"complete","resultText":"%s"}\n' "$1"
  exit 0
}

git fetch -q origin main >&2 || { echo "git fetch failed" >&2; exit 1; }

branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = "main" ] || finish "skipped: the main folder is on branch $branch"
[ -z "$(git status --porcelain --untracked-files=no)" ] ||
  finish "skipped: the main folder has uncommitted changes"

ahead=$(git rev-list --count origin/main..HEAD)
[ "$ahead" -eq 0 ] || finish "skipped: main has $ahead local commit(s) that are not on origin"
behind=$(git rev-list --count HEAD..origin/main)
[ "$behind" -gt 0 ] || finish "already up to date at $(git rev-parse --short HEAD)"

old=$(git rev-parse HEAD)
git merge --ff-only -q origin/main >&2 ||
  finish "skipped: cannot fast-forward (an untracked file is in the way)"

note=""
git diff --quiet "$old" HEAD -- package-lock.json || note="; package-lock.json changed, run npm ci"
finish "fast-forwarded $behind commit(s) to $(git rev-parse --short HEAD)$note"
