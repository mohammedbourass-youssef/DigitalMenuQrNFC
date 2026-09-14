import { useState, useEffect, useCallback, useRef } from "react";

interface UseCountdownReturn {
  secondsRemaining: number;
  isRunning: boolean;
  formatted: string;
  start: (initialSeconds?: number) => void;
  stop: () => void;
  reset: (initialSeconds?: number) => void;
}

export function useCountdown(initialSeconds: number): UseCountdownReturn {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(initialSeconds);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    secondsRef.current -= 1;
    setSecondsRemaining(secondsRef.current);

    if (secondsRef.current <= 0) {
      clearTimer();
      setIsRunning(false);
    }
  }, [clearTimer]);

  const start = useCallback(
    (overrideSeconds?: number) => {
      clearTimer();
      if (overrideSeconds !== undefined) {
        secondsRef.current = overrideSeconds;
        setSecondsRemaining(overrideSeconds);
      }
      setIsRunning(true);
      intervalRef.current = setInterval(tick, 1000);
    },
    [clearTimer, tick]
  );

  const stop = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const reset = useCallback(
    (overrideSeconds?: number) => {
      clearTimer();
      const val = overrideSeconds ?? initialSeconds;
      secondsRef.current = val;
      setSecondsRemaining(val);
      setIsRunning(false);
    },
    [clearTimer, initialSeconds]
  );

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return { secondsRemaining, isRunning, formatted, start, stop, reset };
}
