import { ExamState, getExamState, saveExamState } from "./extensionContext";
import { startProctoring } from "./proctor";
import { startSession } from "./session";
import { resumeTimer } from "./timer";
import * as vscode from 'vscode';

// Subscribers (for reactive updates)
const listeners: ((state: ExamState) => void)[] = [];

export function subscribe(listener: (state: ExamState) => void) {
  listeners.push(listener);
}

// Call whenever state changes
function notify() {
  const currentState = getExamState();
  if (!currentState) {
    return;
  }
  listeners.forEach((listener) => listener(currentState));
}

// Initialize from VS Code
export function initState() {
  restoreExamIfNeeded();
  notify();
}

export function restoreExamIfNeeded() {
  const currentState = getExamState();
  if (!currentState) {
    return;
  }

  if (currentState !== "examStarted") {
    return;
  }

  vscode.window.showInformationMessage('restoreExamIfNeeded() called!');

  startProctoring();
  startSession();
  resumeTimer();
}

// Update state and persist
export async function setState(newState: ExamState) {
  saveExamState(newState);
  notify();
}