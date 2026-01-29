import * as vscode from "vscode";
import { login } from "./auth";
import { stopSession } from "./session";
import { zipWorkspace } from "./zipper";
import { upload } from "./uploader";
import { stopTimer } from "./timer";
import { setState } from "./state";
import { stopProctoring } from "./proctor";
import * as fs from "node:fs";
import { clearExamId, clearExamWorkspace, getContext, getExamWorkspace, resetToken, saveExamId, saveExamWorkspacePath, saveTimer } from "./extensionContext";
import { api } from "./api/client";
import AdmZip from "adm-zip";
import * as path from "node:path";
import * as os from "node:os";

interface ExamQuickPickItem extends vscode.QuickPickItem {
  examData: {
    name: string;
    duration: string;
    projectZip: string;
    id: string;
  };
}

export function registerCommands() {
  const context = getContext();

  context.subscriptions.push(
    vscode.commands.registerCommand("exam.login", async () => {
      try {
        await login();

        const { data: examData } = await api.get('/users/my');

        const exams = examData?.data?.userExams || [];
        const examItems: ExamQuickPickItem[] = exams.map((item: any) => ({
          label: item.examId.name,
          detail: `Duration: ${item.examId.duration} minutes`,
          examData: {
            name: item.examId.name,
            duration: String(item.examId.duration),
            projectZip: item.examId.projectZip,
            id: item._id,
          },
        }));

        const selectedExam = await vscode.window.showQuickPick(examItems, {
          placeHolder: 'Select an exam to continue',
          canPickMany: false
        });

        if (!selectedExam) {
          vscode.window.showWarningMessage('No exam selected');
          return;
        }

        const buf = Buffer.from(selectedExam.examData.projectZip, 'base64');
        const zip = new AdmZip(buf);

        // Base folder owned by extension
        const baseFolder = path.join(os.tmpdir(), 'vscode-exam');

        // Clean previous state
        if (fs.existsSync(baseFolder)) {
          fs.rmSync(baseFolder, { recursive: true, force: true });
        }

        // Create folders (Node fs ONLY)
        fs.mkdirSync(baseFolder, { recursive: true });

        const tempFolder = path.join(baseFolder, `exam-${selectedExam.examData.name}`);
        fs.mkdirSync(tempFolder, { recursive: true });

        // Save exam state
        await saveExamWorkspacePath(tempFolder);
        await saveTimer(Date.now(), Number(selectedExam.examData.duration) * 60);
        await setState("examStarted");
        await saveExamId(selectedExam.examData.id);

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
    vscode.window.showErrorMessage("Submission failed due to an unexpected error.");
  } finally {
    if (zip) {
      try {
        fs.unlinkSync(zip);
        await cleanupExamWorkspace();
        await clearExamId();
      } catch (err) {
        console.warn("Failed to delete zip file:", err);
      }
    }
  }

  let message;
  if (!zip) {
    message = "Exam closed: submission failed because 'src' folder was not found.";
  } else if (mode === "auto") {
    message = "Exam auto-submitted!";
  } else {
    message = "Exam submitted successfully!";
  }
  resetToken();

  await setState("loggedOut");
  vscode.window.showInformationMessage(message);
}