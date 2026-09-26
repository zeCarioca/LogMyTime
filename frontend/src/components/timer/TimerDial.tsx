import React from 'react';

interface TimerDialProps {
  formattedTime: string;
  seconds: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const TimerDial: React.FC<TimerDialProps> = ({
  formattedTime,
  seconds,
  isRunning,
  onStart,
  onPause,
  onReset,
}) => {
  // SVG circular progress calculation
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const maxDuration = 3600; // 60 mins full ring
  const progress = Math.min(1, seconds / maxDuration);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="timer-dial-container">
      <div className="svg-dial-wrapper">
        <svg className="timer-svg" viewBox="0 0 200 200">
          <circle className="timer-bg-circle" cx="100" cy="100" r={radius} />
          <circle
            className="timer-progress-circle"
            cx="100"
            cy="100"
            r={radius}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>

        <div className="timer-display-content">
          <span className="timer-digits">{formattedTime}</span>
          <span className="timer-status-badge">
            {isRunning ? 'RECORDING' : seconds > 0 ? 'PAUSED' : 'READY'}
          </span>
        </div>
      </div>

      <div className="timer-actions-row">
        {!isRunning ? (
          <button className="btn btn-success btn-dial" onClick={onStart}>
            ▶ Start
          </button>
        ) : (
          <button className="btn btn-warning btn-dial" onClick={onPause}>
            ⏸ Pause
          </button>
        )}
        <button className="btn btn-danger btn-dial" onClick={onReset} disabled={seconds === 0}>
          ⏹ Reset
        </button>
      </div>
    </div>
  );
};
