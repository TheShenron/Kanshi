import { handleSubmit } from "./commands";
import {
  clearTimer,
  getExamState,
  getTimer,
  saveTimer,
} from "./extensionContext";
import { startTimerBar, stopTimerBar } from "./timerBar";

let timer: NodeJS.Timeout | null = null;

export function startTimer(durationSeconds: number) {
  stopTimer();

  const startTime = Date.now();

  // Persist timer
  saveTimer(startTime, durationSeconds);

  // UI
  startTimerBar();

  // Logic
  timer = setTimeout(async () => {
    await timeoutSubmit();
  }, durationSeconds * 1000);
}

export function resumeTimer() {
  if (timer) {
    return;
  }

  if (getExamState() !== "examStarted") {
    return;
  }

  const { startTime, durationSeconds } = getTimer();
  if (!startTime || !durationSeconds) {
    return;
  }

  const elapsed = Date.now() - startTime;
  const remainingMs = durationSeconds * 1000 - elapsed;

  if (remainingMs <= 0) {
    timeoutSubmit();
    return;
  }

  // Resume UI
  startTimerBar();

  // Resume logic
  timer = setTimeout(async () => {
    await timeoutSubmit();
  }, remainingMs);
}

export function stopTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  clearTimer();
  stopTimerBar();
}

async function timeoutSubmit() {
  clearTimer();
  stopTimerBar();
  await handleSubmit("auto");
}