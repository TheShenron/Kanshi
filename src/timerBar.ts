
import * as vscode from "vscode";

let timerBar: vscode.StatusBarItem | null = null;
let interval: NodeJS.Timeout | null = null;
let remainingSeconds = 0;

export function startTimerBar(totalSeconds: number) {
  stopTimerBar();

  remainingSeconds = totalSeconds;

  timerBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1000, // high priority so it stays visible
  );

  updateText();
  timerBar.show();

  interval = setInterval(() => {
    remainingSeconds--;
    updateText();

    if (remainingSeconds <= 0) {
      stopTimerBar();
    }
  }, 1000);
}

export function stopTimerBar() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }

  if (timerBar) {
    timerBar.dispose();
    timerBar = null;
  }
}

function updateText() {
  if (!timerBar) {
    return;
  }

  const min = Math.floor(remainingSeconds / 60);
  const sec = remainingSeconds % 60;

  timerBar.text = `$(clock) Exam: ${min}:${sec.toString().padStart(2, "0")}`;
  timerBar.tooltip = "Remaining exam time";
}
