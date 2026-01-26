import * as vscode from "vscode";

export type ExamState = "loggedOut" | "loggedIn" | "examStarted" | "examSubmitted" | "examExpired";

let currentState: ExamState = "loggedOut";

// Subscribers (for reactive updates)
const listeners: ((state: ExamState) => void)[] = [];

export function subscribe(listener: (state: ExamState) => void) {
  listeners.push(listener);
}

// Call whenever state changes
function notify() {
  listeners.forEach((listener) => listener(currentState));
}

// Initialize from VS Code globalState
export function initState(context: vscode.ExtensionContext) {
  const savedState = context.globalState.get<ExamState>("examState") || "loggedOut";
  currentState = savedState;
  notify();
}

// Update state and persist
export async function setState(context: vscode.ExtensionContext, newState: ExamState) {
  currentState = newState;
  await context.globalState.update("examState", newState);
  notify();
}

// Get current state
export function getState() {
  return currentState;
}
