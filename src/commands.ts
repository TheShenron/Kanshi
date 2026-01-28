import * as vscode from "vscode";
import { login } from "./auth";
import { stopSession } from "./session";
import { zipWorkspace } from "./zipper";
import { upload } from "./uploader";
import { stopTimer } from "./timer";
import { setState } from "./state";
import { stopProctoring } from "./proctor";
import * as fs from "node:fs";
import { clearExamWorkspace, getContext, getExamWorkspace, resetToken, saveExamWorkspacePath, saveTimer } from "./extensionContext";
import { api } from "./api/client";
import AdmZip from "adm-zip";
import * as path from "node:path";
import * as os from "node:os";

export function registerCommands() {
  const context = getContext();

  context.subscriptions.push(
    vscode.commands.registerCommand("exam.login", async () => {
      try {
        await login();

        const { data: examData } = await api.get('/exam');

        const exam = examData?.data?.exams?.[0];
        if (!exam?.projectZip?.data || !exam?._id) {
          throw new Error("Invalid exam data");
        }

        const buf = Buffer.from(exam.projectZip.data);
        const zip = new AdmZip(buf);

        const examId = exam._id.toString();

        // Base folder owned by extension
        const baseFolder = path.join(os.tmpdir(), 'vscode-exam');

        // Clean previous state
        if (fs.existsSync(baseFolder)) {
          fs.rmSync(baseFolder, { recursive: true, force: true });
        }

        // Create folders (Node fs ONLY)
        fs.mkdirSync(baseFolder, { recursive: true });

        const tempFolder = path.join(baseFolder, `exam-${examId}`);
        fs.mkdirSync(tempFolder, { recursive: true });

        // Save exam state
        await saveExamWorkspacePath(tempFolder);
        await saveTimer(Date.now(), 60 * 1);
        await setState("examStarted");

        // Extract exam files
        zip.extractAllTo(tempFolder, true);

        // Open exam workspace
        await vscode.commands.executeCommand(
          "vscode.openFolder",
          vscode.Uri.file(tempFolder),
          false
        );

      } catch (err) {
        console.log(err);
        vscode.window.showErrorMessage("Login failed!");
      }
    }),

    vscode.commands.registerCommand("exam.submit", async () => {
      await handleSubmit("manual");
    }),

    vscode.commands.registerCommand("exam.instructions", () => {
      const url = "https://www.regami.solutions/";
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),
  );
}

async function cleanupExamWorkspace() {
  const examPath = getExamWorkspace();
  if (!examPath) {
    return;
  }
  try {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await vscode.workspace.fs.delete(vscode.Uri.file(examPath), {
      recursive: true,
      useTrash: false
    });
  } catch (err) {
    console.error("Failed to cleanup exam workspace", err);
  } finally {
    await clearExamWorkspace();
  }
}
// Central submit logic
export async function handleSubmit(mode: "manual" | "auto") {
  const context = getContext();
  stopTimer();
  stopSession();
  stopProctoring();
  const zip = await zipWorkspace(context);
  try {
    if (zip) {
      await upload(zip);
    } else {
      vscode.window.showErrorMessage("Submission failed: 'src' folder not found in workspace.",);
    }
  } catch (err) {
    console.error("Error during submission:", err);
    vscode.window.showErrorMessage("Submission failed due to an error.");
  } finally {
    if (zip) {
      try {
        fs.unlinkSync(zip);
        await cleanupExamWorkspace();
      } catch (err) {
        console.warn("Failed to delete zip file:", err);
      }
    }
  }
  resetToken();
  await setState("loggedOut");
  vscode.window.showInformationMessage(zip ? mode === "auto" ? "Exam auto-submitted!" : "Exam submitted successfully!" : "Exam closed: submission failed because 'src' folder was not found.",);
}