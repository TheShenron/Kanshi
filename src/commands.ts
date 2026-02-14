import * as vscode from "vscode";
import { login } from "./auth";
import { session, stopSession } from "./session";
import { zipWorkspace } from "./zipper";
import { upload } from "./uploader";
import { stopTimer } from "./timer";
import { setState } from "./state";
import { stopProctoring } from "./proctor";
import * as fs from "node:fs";
import { clearExamId, clearExamWorkspace, getContext, getDriveId, getExamId, getExamWorkspace, getToken, resetToken, saveDriveId, saveExamId, saveExamWorkspacePath, saveTimer } from "./extensionContext";
import { api } from "./api/client";
import AdmZip from "adm-zip";
import * as path from "node:path";
import * as os from "node:os";
import { getGitLogs } from "./gitLogger";

interface HiringDriveQuickPickItem extends vscode.QuickPickItem {
  examData: {
    name: string;
    code: string;
    id: string;
  };
}

interface ExamQuickPickItem extends vscode.QuickPickItem {
  examData: {
    name: string;
    duration: number,
    id: string;
    examZipFile: string
  };
}

export function registerCommands() {
  const context = getContext();

  context.subscriptions.push(
    vscode.commands.registerCommand("exam.login", async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Exam setup in progress...",
          cancellable: false,
        },
        async (progress) => {
          try {
            progress.report({ message: "Logging in..." });
            await login(progress);

            progress.report({ message: "Fetching hiring drives..." });
            const { data: hiringDriveData } = await api.get(`/users/me/hiring-drives`);

            const hiringDrive = hiringDriveData?.data || [];
            const hiringDriveItems: HiringDriveQuickPickItem[] = hiringDrive.map((item: any) => ({
              label: item.name,
              detail: `Code: ${item.code}`,
              examData: {
                name: item.name,
                code: String(item.code),
                id: item._id,
              },
            }));

            const selectedHiringDriveItems = await vscode.window.showQuickPick(hiringDriveItems, {
              placeHolder: "Select an Hiring Drive to continue",
              canPickMany: false,
            });

            if (!selectedHiringDriveItems) {
              vscode.window.showWarningMessage("No Hiring Drive selected");
              return;
            }

            progress.report({ message: "Fetching exams..." });
            const { data: examsData } = await api.get(
              `/users/me/hiring-drives-exam/${selectedHiringDriveItems.examData.id}`
            );

            const exams = examsData?.data || [];
            const examItems: ExamQuickPickItem[] = exams.map((item: any) => ({
              label: item.title,
              detail: `Duration: ${item.duration} minutes (${item.difficulty})`,
              examData: {
                name: item.title,
                duration: String(item.duration),
                examZipFile: item?.examZipFile || "",
                id: item._id,
              },
            }));

            const selectedExam = await vscode.window.showQuickPick(examItems, {
              placeHolder: "Select an exam to continue",
              canPickMany: false,
            });

            if (!selectedExam) {
              vscode.window.showWarningMessage("No exam selected");
              return;
            }

            progress.report({ message: "Preparing exam workspace..." });

            const buf = Buffer.from(selectedExam.examData.examZipFile, "base64");
            const zip = new AdmZip(buf);

            const baseFolder = path.join(os.tmpdir(), "vscode-exam");

            // Clean previous state
            if (fs.existsSync(baseFolder)) {
              fs.rmSync(baseFolder, { recursive: true, force: true });
            }

            fs.mkdirSync(baseFolder, { recursive: true });

            const tempFolder = path.join(baseFolder, `exam-${selectedExam.examData.name}`);
            fs.mkdirSync(tempFolder, { recursive: true });

            progress.report({ message: "Starting exam..." });

            await api.post(`/results/me/start`, {
              examId: selectedExam.examData.id,
              hiringDriveId: selectedHiringDriveItems.examData.id,
            });

            progress.report({ message: "Saving exam state..." });

            await saveExamWorkspacePath(tempFolder);
            await saveTimer(Date.now(), Number(selectedExam.examData.duration) * 60);
            await setState("examStarted");
            await saveExamId(selectedExam.examData.id);
            await saveDriveId(selectedHiringDriveItems.examData.id);

            progress.report({ message: "Extracting exam files..." });
            zip.extractAllTo(tempFolder, true);

            progress.report({ message: "Opening workspace..." });

            await vscode.commands.executeCommand(
              "vscode.openFolder",
              vscode.Uri.file(tempFolder),
              false
            );

            vscode.window.showInformationMessage("Exam workspace ready ✅");
          } catch (err: any) {
            console.log(err);
            vscode.window.showErrorMessage(err?.response?.data?.message || "Login failed!");
          }
        }
      );
    }),

    vscode.commands.registerCommand("exam.instructions", () => {
      const url = "https://github.com/TheShenron";
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),

    vscode.commands.registerCommand("exam.submit", async () => {
      await setState("submitting");
      await handleSubmit("manual");
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
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Submitting exam...",
      cancellable: false,
    },
    async (progress) => {
      const context = getContext();

      let zip: string | null = null;

      try {
        progress.report({ message: "Stopping exam session..." });

        stopTimer();
        stopSession();
        stopProctoring();

        progress.report({ message: "Preparing workspace..." });

        zip = await zipWorkspace(context);

        if (!zip) {
          vscode.window.showErrorMessage(
            "Submission failed: 'src' folder not found in workspace."
          );
          return;
        }

        // upload (no nested progress)
        await upload(zip, progress);
        await setState("examSubmitted");

        // Success message (ONLY HERE)
        let message =
          mode === "auto" ? "Exam auto-submitted" : "Exam submitted successfully";

        vscode.window.showInformationMessage(message);
      } catch (err) {
        console.error("Error during submission:", err);

        const examId = getExamId();
        const driveId = getDriveId();

        // 3) Submit exam only AFTER tests complete
        const { data: submitExam } = await api.post(`/results/me/submit`, {
          examId,
          hiringDriveId: driveId,
          isPassed: false,
          score: 0,
        });

        const resultId = submitExam?.data?._id || "";

        progress?.report({ message: "Uploading proctoring events..." });

        const gitLogs = await getGitLogs();
        session.events.push({
          type: "gitLogs",
          timestamp: Date.now(),
          meta: { gitLogs },
        });

        // 4) Upload proctoring
        await api.post(`/results/${resultId}/proctoring`, {
          events: session.events,
        });
        await setState("examSubmitted");

        vscode.window.showErrorMessage("Submission failed due to an unexpected error.");

      } finally {
        progress.report({ message: "Cleaning up..." });

        if (zip) {
          try {
            fs.unlinkSync(zip);
          } catch (err) {
            console.warn("Failed to delete zip file:", err);
          }
        }

        try {
          await cleanupExamWorkspace();
          await clearExamId();
        } catch (err) {
          console.warn("Cleanup failed:", err);
        }

        resetToken();
        await setState("loggedOut");
      }
    }
  );
}
