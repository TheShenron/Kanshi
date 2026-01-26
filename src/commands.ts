import * as vscode from "vscode";
import { login, getToken } from "./auth";
import { startSession, stopSession } from "./session";
import { zipWorkspace } from "./zipper";
import { upload } from "./uploader";
import { startTimer, stopTimer } from "./timer";
import { setState } from "./state";
import { startProctoring, stopProctoring } from "./proctor";

export function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("exam.login", async () => {
      try {
        await login(context);

        startProctoring(context);

        await setState(context, "examStarted");
        startSession();

        startTimer(context, 60 * 1);

        await setState(context, "loggedIn");
        vscode.window.showInformationMessage("Logged in successful!");
      } catch {
        vscode.window.showErrorMessage("Login failed!");
      }
    }),

    vscode.commands.registerCommand("exam.submit", async () => {
      await handleSubmit(context, "manual");
    }),

    vscode.commands.registerCommand("exam.instructions", () => {
      const url = "https://www.regami.solutions/";
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),
  );
}

// Central submit logic
export async function handleSubmit(
  context: vscode.ExtensionContext,
  mode: "manual" | "auto",
) {
  stopTimer();
  stopSession();

  const token = getToken(context);
  if (!token) {
    vscode.window.showErrorMessage("Please login first");
    return;
  }

  const zip = await zipWorkspace(context);
  await upload(zip, token);

  stopProctoring();

  // Reset state
  await context.globalState.update("authToken", undefined);
  await setState(context, "loggedOut");

  vscode.window.showInformationMessage(
    mode === "auto" ? "Exam auto-submitted!" : "Exam submitted successfully.!",
  );
}
