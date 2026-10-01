import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'logmytime_timer_state';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  accumulated: number;
}

const loadState = (): TimerState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse timer state', e);
  }
  return { isRunning: false, startTime: null, accumulated: 0 };
};

const saveState = (state: TimerState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save timer state', e);
  }
};

export function useTimer() {
  const [isRunning, setIsRunning] = useState<boolean>(() => loadState().isRunning);
  
  const startTimeRef = useRef<number | null>(loadState().startTime);
  const accumulatedRef = useRef<number>(loadState().accumulated);
  
  const [seconds, setSeconds] = useState<number>(() => {
    const init = loadState();
    if (init.isRunning && init.startTime !== null) {
      return Math.max(0, init.accumulated + Math.floor((Date.now() - init.startTime) / 1000));
    }
    return Math.max(0, init.accumulated);
  });
  
  const timerRef = useRef<number | null>(null);

  // This handles the periodic UI update
  useEffect(() => {
    if (isRunning) {
      // If we somehow lost startTime but are running, fix it
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        saveState({ isRunning: true, startTime: startTimeRef.current, accumulated: accumulatedRef.current });
      }
      
      timerRef.current = window.setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setSeconds(Math.max(0, accumulatedRef.current + elapsed));
        }
      }, 500); // 500ms for more responsive UI updates
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // If we transitioned to paused but still have a startTime, commit it to accumulated
      if (startTimeRef.current !== null) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        accumulatedRef.current = Math.max(0, accumulatedRef.current + elapsed);
        startTimeRef.current = null;
        setSeconds(accumulatedRef.current);
        saveState({ isRunning: false, startTime: null, accumulated: accumulatedRef.current });
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
    setIsRunning(true);
    saveState({ isRunning: true, startTime: startTimeRef.current, accumulated: accumulatedRef.current });
  }, []);
  
  const pause = useCallback(() => {
    setIsRunning(false);
    if (startTimeRef.current !== null) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      accumulatedRef.current = Math.max(0, accumulatedRef.current + elapsed);
      startTimeRef.current = null;
    }
    setSeconds(accumulatedRef.current);
    saveState({ isRunning: false, startTime: null, accumulated: accumulatedRef.current });
  }, []);
  
  const reset = useCallback(() => {
    setIsRunning(false);
    accumulatedRef.current = 0;
    startTimeRef.current = null;
    setSeconds(0);
    saveState({ isRunning: false, startTime: null, accumulated: 0 });
  }, []);

  const addMinutes = useCallback((mins: number) => {
    accumulatedRef.current += mins * 60;
    
    if (isRunning && startTimeRef.current !== null) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newTotal = accumulatedRef.current + elapsed;
      if (newTotal < 0) {
        accumulatedRef.current = 0;
        startTimeRef.current = Date.now();
        setSeconds(0);
      } else {
        setSeconds(newTotal);
      }
      saveState({ isRunning: true, startTime: startTimeRef.current, accumulated: accumulatedRef.current });
    } else {
      if (accumulatedRef.current < 0) accumulatedRef.current = 0;
      setSeconds(accumulatedRef.current);
      saveState({ isRunning: false, startTime: null, accumulated: accumulatedRef.current });
    }
  }, [isRunning]);

  const formatTime = useCallback((totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  }, []);

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
    addMinutes,
    formattedTime: formatTime(seconds),
  };
}
