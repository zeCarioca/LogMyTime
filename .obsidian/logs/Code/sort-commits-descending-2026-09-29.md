# Sort Recent Commits Descending — 2026-09-29

## Summary of Changes
Updated [[frontend/src/components/commits/CommitPairingQueue.tsx]] to ensure commits in the recent commits container are ordered chronologically from most recent to oldest.

## Details
- In `displayedCommits` `useMemo` computation, added a `.sort()` comparison comparing commit timestamp values (`new Date(b.date).getTime() - new Date(a.date).getTime()`).
- Preserved existing layout and card formatting completely.
- Verified zero TypeScript compilation errors with `npx tsc --noEmit`.
