import * as vscode from "vscode";
import { api } from "./api/client";
import { setToken } from "./extensionContext";

export async function login(progress?: vscode.Progress<{ message?: string }>) {
  const email = await vscode.window.showInputBox({
    prompt: "Email",
    ignoreFocusOut: true,
  });

  if (!email) {
    throw new Error("Invalid Email!");
  }

  const testCode = await vscode.window.showInputBox({
    prompt: "Test Code",
    password: true,
    ignoreFocusOut: true,
  });

  if (!testCode) {
    throw new Error("Invalid TestCode!");
  }

  progress?.report({ message: "Authenticating..." });

  const { data: loginData } = await api.post("/users/login", {
    email,
    password: testCode,
  });

  progress?.report({ message: "Saving session..." });
  await setToken(loginData.data.token);
}
