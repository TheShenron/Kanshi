import { handleSubmit } from "./commands";
import { setState } from "./state";
import * as vscode from "vscode";
import { startTimerBar, stopTimerBar } from "./timerBar";

let timer: NodeJS.Timeout | null = null;

export function startTimer(
  context: vscode.ExtensionContext,
  durationSeconds: number,
) {
  // Stop any existing timer
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  // Start status bar countdown
  startTimerBar(durationSeconds);

  // Auto-submit when time ends
  timer = setTimeout(async () => {
    stopTimerBar();
    await handleSubmit(context, "auto");
    await setState(context, "examExpired");
  }, durationSeconds * 1000);
}

export function stopTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  stopTimerBar();
}
