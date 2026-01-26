import * as vscode from "vscode";
import { ExamState, subscribe, getState } from "./state";

let loginButton: vscode.StatusBarItem;
let submitButton: vscode.StatusBarItem;
let instructionButton: vscode.StatusBarItem;

export function initStatusBar(context: vscode.ExtensionContext) {
  loginButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  loginButton.text = "$(sign-in) Login";
  loginButton.tooltip = "Click to login to exam";
  loginButton.command = "exam.login";
  context.subscriptions.push(loginButton);

  submitButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    98,
  );

  instructionButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    99, 
  );
  instructionButton.text = "$(book) Exam Instructions";
  instructionButton.tooltip = "Click to view exam instructions";
  instructionButton.command = "exam.instructions";
  context.subscriptions.push(instructionButton);
  instructionButton.show();

  submitButton.text = "$(check) Submit Exam";
  submitButton.tooltip = "Click to submit the exam";
  submitButton.command = "exam.submit";
  context.subscriptions.push(submitButton);

  // Subscribe to state changes
  subscribe(updateButtons);

  // Initial render
  updateButtons(getState());
}

function updateButtons(state: ExamState) {
  loginButton.hide();
  submitButton.hide();

  switch (state) {
    // case "loggedOut":
    //   loginButton.show();
    //   submitButton.hide();
    //   break;
    case "loggedIn":
    case "examStarted":
      loginButton.hide();
      submitButton.show();
      break;
    case "loggedOut":
    case "examSubmitted":
    case "examExpired":
      loginButton.show();
      submitButton.hide();
      break;
  }
}
