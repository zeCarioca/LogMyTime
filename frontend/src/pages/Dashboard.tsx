import React from 'react';
import {
  TimerDial,
  LoggingCard,
  ReposCard,
  CommitPairingQueue,
  LocalGitStatus,
  TaskKeeperCard,
} from '../components';
import { useTimer, useRepos, useGitStatus, useTasks } from '../hooks';
import { timeApi } from '../api/time';

export const Dashboard: React.FC = () => {
  const { seconds, isRunning, start, pause, reset, addMinutes, formattedTime } = useTimer();
  const { activeRepos, archivedRepos, refreshRepos, toggleArchive, refetchRepos } = useRepos();
  const { gitStatus, setLocalPath } = useGitStatus();
  const { activeTasks, completedTasks, addTask, updateTaskStatus } = useTasks();
  const [refreshPairingTrigger, setRefreshPairingTrigger] = React.useState<number>(0);
  const [activeTaskId, setActiveTaskId] = React.useState<number | null>(null);
  const [taskDescription, setTaskDescription] = React.useState<string>('');

  const handleSaveTime = async (repoId: number, description: string, durationSec: number) => {
    const matchingTask = activeTasks.find(
      t => t.title.trim().toLowerCase() === description.trim().toLowerCase()
    );
    await timeApi.logTime({
      repo_id: repoId,
      task_description: description,
      duration_seconds: durationSec,
      task_id: matchingTask ? matchingTask.id : undefined,
    });
    reset();
    setTaskDescription('');
    await refetchRepos();
    setRefreshPairingTrigger((prev) => prev + 1);
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
          activeTasks={activeTasks}
          seconds={seconds}
          taskDescription={taskDescription}
          onTaskDescriptionChange={setTaskDescription}
          onAddMinutes={addMinutes}
          onSaveTime={handleSaveTime}
        />
        <TaskKeeperCard
          activeTasks={activeTasks}
          completedTasks={completedTasks}
          onAddTask={async (title) => { await addTask({ title }); }}
          onUpdateStatus={async (id, status) => { await updateTaskStatus(id, { status }); }}
          onPlayTask={(task) => {
            setActiveTaskId(task.id);
            setTaskDescription(task.title);
            if (!isRunning) start();
          }}
          activeTaskId={activeTaskId}
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
        <CommitPairingQueue onPairConfirmed={refetchRepos} refreshTrigger={refreshPairingTrigger} />
      </div>

    </div>
  );
};

