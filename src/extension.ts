import * as vscode from "vscode";
import { initStatusBar } from "./statusBar";
import { initState } from "./state";
import { registerCommands } from "./commands";

export function activate(context: vscode.ExtensionContext) {
  initState(context);
  initStatusBar(context);
  registerCommands(context);
}

export function deactivate() {
  // This function is intentionally empty because the extension does not require
  // any cleanup or resource deallocation when it is deactivated.
}
