# Auto-Refresh Timelogs on Log Time — 2026-09-29

## Summary of Changes
Updated [[frontend/src/pages/Dashboard.tsx]] and [[frontend/src/components/commits/CommitPairingQueue.tsx]] so that logging a time entry instantly updates the unassigned timelogs list in the manual commit pairing container.

## Details
- Added `refreshTrigger?: number` prop to [[frontend/src/components/commits/CommitPairingQueue.tsx]] and included it in the `useEffect` dependency array.
- Added `refreshPairingTrigger` state counter in [[frontend/src/pages/Dashboard.tsx]].
- In `handleSaveTime`, after `timeApi.logTime` resolves, `refreshPairingTrigger` is incremented, automatically fetching fresh unassigned timelogs and branch commits.
- Verified zero TypeScript compilation errors with `npx tsc --noEmit`.
