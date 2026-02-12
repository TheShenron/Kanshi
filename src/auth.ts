import * as vscode from "vscode";
import { api } from "./api/client";
import { setToken } from "./extensionContext";

export async function login() {

  const email = await vscode.window.showInputBox({ prompt: "Email" });
  if (!email) {
    throw new Error("Invalid Email!");
  }

  const testCode = await vscode.window.showInputBox({ prompt: "Test Code" });
  if (!testCode) {
    throw new Error("Invalid TestCode!");
  }

  const { data: loginData } = await api.post("/users/login", { email, password: testCode });

  await setToken(loginData.data.token);

}

