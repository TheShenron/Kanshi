import * as vscode from "vscode";
import { session } from "./session";
import { getGitLogs } from "./gitLogger";
import { getDriveId, getExamId } from "./extensionContext";
import { api } from "./api/client";

import * as cp from "node:child_process";

type TestResult = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
};

function extractJsonFromOutput(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) { return null; }

  const possibleJson = text.slice(start, end + 1).trim();

  if (!possibleJson.startsWith("{") || !possibleJson.endsWith("}")) { return null; }

  return possibleJson;
}

export function runTests(): Promise<TestResult> {
  return new Promise((resolve, reject) => {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspacePath) {
      return reject(new Error("No workspace folder found."));
    }

    const cmd = "npm run test";

    let fullOutput = "";

    const child = cp.exec(cmd, { cwd: workspacePath }, (err) => {
      // even if err exists, we still try to parse JSON
      const jsonString = extractJsonFromOutput(fullOutput);

      if (!jsonString) {
        return reject(
          new Error("Test finished but JSON output was not found.")
        );
      }

      try {
        const parsed = JSON.parse(jsonString) as TestResult;

        // If test command failed and JSON says failed > 0, we still return parsed
        // If test command failed but JSON says failed = 0, still treat as passed
        resolve(parsed);
      } catch {
        return reject(new Error("Test finished but JSON output was invalid."));
      }
    });

    child.stdout?.on("data", (data) => {
      const text = data.toString();
      fullOutput += text;
      console.log(text);
    });

    child.stderr?.on("data", (data) => {
      const text = data.toString();
      fullOutput += text;
      console.error(text);
    });
  });
}

export async function upload(zipPath: string) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Submitting exam...",
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: "Running tests..." });

        // 1) Run tests first and get result JSON
        const testResult = await runTests();

        const isPassed = testResult.failed === 0;

        const score =
          testResult.total > 0
            ? Math.round((testResult.passed / testResult.total) * 100)
            : 0;


        progress.report({ message: "Collecting git logs..." });

        // 2) Collect git logs
        const gitLogs = await getGitLogs();
        session.events.push({
          type: "gitLogs",
          timestamp: Date.now(),
          meta: { gitLogs },
        });

        progress.report({ message: "Submitting exam..." });

        const examId = getExamId();
        const driveId = getDriveId();

        // 3) Submit exam only AFTER tests complete
        const { data: submitExam } = await api.post(`/results/me/submit`, {
          examId,
          hiringDriveId: driveId,
          isPassed,
          score,
        });

        const resultId = submitExam?.data?._id || "";

        progress.report({ message: "Uploading proctoring events..." });

        // 4) Upload proctoring
        await api.post(`/results/${resultId}/proctoring`, {
          events: session.events,
        });

        vscode.window.showInformationMessage("Exam submitted successfully!");
      } catch (err: any) {
        console.error(err);

        vscode.window.showErrorMessage(
          `❌ Submission failed: ${err?.message || "Unknown error"}`
        );

        throw err;
      }
    }
  );
}
