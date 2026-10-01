import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer() {
  const [seconds, setSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);
  
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef<number>(0);

  useEffect(() => {
    if (isRunning) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
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
      if (startTimeRef.current !== null) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        accumulatedRef.current = Math.max(0, accumulatedRef.current + elapsed);
        startTimeRef.current = null;
        setSeconds(accumulatedRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  
  const reset = useCallback(() => {
    setIsRunning(false);
    accumulatedRef.current = 0;
    startTimeRef.current = null;
    setSeconds(0);
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
    } else {
      if (accumulatedRef.current < 0) accumulatedRef.current = 0;
      setSeconds(accumulatedRef.current);
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
