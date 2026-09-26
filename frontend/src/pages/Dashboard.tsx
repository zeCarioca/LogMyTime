import React from 'react';
import {
  TimerDial,
  LoggingCard,
  ReposCard,
  CommitPairingQueue,
  LocalGitStatus,
  ThemeCard,
  SavedPalettes,
} from '../components';
import { useTimer, useRepos, useCommitPoller, useGitStatus, useTheme } from '../hooks';
import { timeApi } from '../api/time';

export const Dashboard: React.FC = () => {
  const { seconds, isRunning, start, pause, reset, addMinutes, formattedTime } = useTimer();
  const { activeRepos, archivedRepos, refreshRepos, toggleArchive, refetchRepos } = useRepos();
  const { queue, actionLoadingId, confirmPairing, rejectPairing } = useCommitPoller();
  const { gitStatus, setLocalPath } = useGitStatus();
  const { accentHue, savedPalettes, updateHue, saveCurrentPalette, deletePalette } = useTheme();

  const handleSaveTime = async (repoId: number, description: string, durationSec: number) => {
    await timeApi.logTime({
      repo_id: repoId,
      task_description: description,
      duration_seconds: durationSec,
    });
    reset();
    await refetchRepos();
  };

  const handleManualSync = async (repoId: number) => {
    await timeApi.manualSync(repoId);
    await refetchRepos();
  };

  return (
    <div className="dashboard-grid">
      {/* Column 1: Timer & Time Logging */}
      <div className="dashboard-col">
        <TimerDial
          formattedTime={formattedTime}
          seconds={seconds}
          isRunning={isRunning}
          onStart={start}
          onPause={pause}
          onReset={reset}
        />
        <LoggingCard
          repos={activeRepos}
          seconds={seconds}
          onAddMinutes={addMinutes}
          onSaveTime={handleSaveTime}
        />
      </div>

      {/* Column 2: Repositories & Commit Pairing Queue */}
      <div className="dashboard-col">
        <ReposCard
          activeRepos={activeRepos}
          archivedRepos={archivedRepos}
          onRefresh={refreshRepos}
          onToggleArchive={toggleArchive}
          onManualSync={handleManualSync}
        />

        <LocalGitStatus status={gitStatus} onSetPath={setLocalPath} />
        <CommitPairingQueue
          queue={queue}
          actionLoadingId={actionLoadingId}
          onConfirm={confirmPairing}
          onReject={rejectPairing}
        />
      </div>

      {/* Column 3: Theme Panel */}
      <div className="dashboard-col">
        <ThemeCard accentHue={accentHue} onHueChange={updateHue} />
        <SavedPalettes
          accentHue={accentHue}
          savedPalettes={savedPalettes}
          onSelectHue={updateHue}
          onSavePalette={saveCurrentPalette}
          onDeletePalette={deletePalette}
        />
      </div>
    </div>
  );
};

