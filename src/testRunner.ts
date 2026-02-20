import * as vscode from "vscode";
import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export type TestResult = {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
};

export async function runTests(): Promise<TestResult> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspacePath) {
        throw new Error("No workspace folder found.");
    }

    const reportPath = path.join(
        workspacePath,
        "playwright-report",
        "report.json"
    );

    return new Promise((resolve, reject) => {
        const child = cp.spawn("npm", ["run", "test"], {
            cwd: workspacePath,
            shell: true,
            stdio: ["ignore", "pipe", "pipe"],
            env: process.env,
        });

        child.on("error", reject);

        child.on("close", (code) => {
            if (code !== 0) {
                console.warn("Playwright exited with non-zero code:", code);
            }

            if (!fs.existsSync(reportPath)) {
                return reject(
                    new Error("Playwright report.json not found.")
                );
            }

            try {
                const raw = fs.readFileSync(reportPath, "utf-8");
                const report = JSON.parse(raw);

                const stats = report.stats;

                const result: TestResult = {
                    total:
                        stats.expected +
                        stats.unexpected +
                        stats.skipped +
                        stats.flaky,
                    passed: stats.expected,
                    failed: stats.unexpected,
                    skipped: stats.skipped,
                    durationMs: stats.duration,
                };

                resolve(result);
            } catch {
                reject(
                    new Error("Failed to parse Playwright JSON report.")
                );
            }
        });
    });
}