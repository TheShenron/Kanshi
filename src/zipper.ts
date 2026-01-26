import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { zip } from "compressing";

export async function zipWorkspace(
  context: vscode.ExtensionContext,
): Promise<string> {
  const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!root) {
    throw new Error("No workspace folder found");
  }

  const zipPath = path.join(context.globalStorageUri.fsPath, "submission.zip");

  fs.mkdirSync(path.dirname(zipPath), { recursive: true });

  // Compress the entire src folder
  await zip.compressDir(path.join(root, "src"), zipPath);

  // If you need to include package.json as well, you would have to
  // first copy it into a temp folder with src, then compress that folder.

  return zipPath;
}
