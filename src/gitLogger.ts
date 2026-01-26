import * as vscode from "vscode";
import { exec } from "node:child_process";

export function getGitLogs(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!vscode.workspace.workspaceFolders) {
      resolve("[]");
      return;
    }
    const cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;

    // Get last 10 commits in JSON-like format
    const gitLogCmd = `git log -n 10 --pretty=format:'%H%x1f%an%x1f%ad%x1f%s'`;

    exec(gitLogCmd, { cwd }, (err, stdout, stderr) => {
      if (err) {
        resolve("[]");
        return;
      }

      try {
        const logs = stdout
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            const [commit, author, date, message] = line.split("\x1f");
            return {
              commit,
              author,
              date,
              message,
            };
          });

        resolve(JSON.stringify(logs, null, 2));
      } catch {
        resolve("[]");
      }
    });
  });
}
