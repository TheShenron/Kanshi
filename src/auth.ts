import * as vscode from "vscode";
// import fetch from 'node-fetch';

export async function login(context: vscode.ExtensionContext) {
  const email = await vscode.window.showInputBox({ prompt: "Email" });
  if (!email) {
    throw new Error("Invalid Email!");
  }

  const testCode = await vscode.window.showInputBox({ prompt: "Test Code" });
  if (!testCode) {
    throw new Error("Invalid TestCode!");
  }

  // const res = await fetch("https://yourserver.com/auth/login", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ email, testCode }),
  // });

  // const data = (await res.json()) as { token: string };
  // await context.globalState.update("authToken", data.token);
  await context.globalState.update("authToken", "dummy_token");

  // throw new Error("Invalid server response");
}

export function getToken(context: vscode.ExtensionContext): string | undefined {
  return context.globalState.get("authToken");
}
