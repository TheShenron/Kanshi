import * as vscode from "vscode";

let extensionContext: vscode.ExtensionContext;

const TOKEN_KEY = "authToken";

const TIMER_START_KEY = 'timerStartTime';
const TIMER_DURATION_KEY = 'timerDuration';

export type ExamState = "loggedOut" | "loggedIn" | "examStarted" | "examSubmitted";

const EXAM_STATE_KEY: ExamState = "loggedOut";

const EXAM_WORKSPACE_KEY = "examWorkspacePath";

// Exam Path Context Management
export async function saveExamWorkspacePath(path: string) {
    if (!extensionContext) {
        return undefined;
    }
    await extensionContext.globalState.update(EXAM_WORKSPACE_KEY, path);
}

export function getExamWorkspace(): string | undefined {
    if (!extensionContext) {
        return undefined;
    }
    return extensionContext.globalState.get<string>(EXAM_WORKSPACE_KEY);
}

export async function clearExamWorkspace() {
    if (!extensionContext) {
        return;
    }
    await extensionContext.globalState.update(EXAM_WORKSPACE_KEY, undefined);
}


// Exam State Management
export async function saveExamState(state: ExamState) {
    if (!extensionContext) {
        return;
    }
    await extensionContext.globalState.update(EXAM_STATE_KEY, state);
}

export function getExamState(): ExamState | undefined {
    if (!extensionContext) {
        return;
    }
    return extensionContext.globalState.get<ExamState>(EXAM_STATE_KEY);
}

export async function clearExamState() {
    if (!extensionContext) {
        return;
    }
    await extensionContext.globalState.update(EXAM_STATE_KEY, "loggedOut");
}

// Time Persistance
export async function saveTimer(startTime: number, durationSeconds: number) {
    extensionContext?.globalState.update(TIMER_START_KEY, startTime);
    extensionContext?.globalState.update(TIMER_DURATION_KEY, durationSeconds);
}

export function getTimer(): { startTime: number; durationSeconds: number } {
    if (!extensionContext) {
        throw new Error("Extension context not initialized");
    }

    const startTime = extensionContext.globalState.get<number>("timerStartTime");
    const durationSeconds =
        extensionContext.globalState.get<number>("timerDuration");

    if (!startTime || !durationSeconds) {
        return { startTime: 0, durationSeconds: 0 };
    }

    return { startTime, durationSeconds };
}

export async function clearTimer() {
    extensionContext?.globalState.update(TIMER_START_KEY, undefined);
    extensionContext?.globalState.update(TIMER_DURATION_KEY, undefined);
}

/* =====================
   Auth Token
===================== */
export async function setToken(token: string) {
    if (!extensionContext) {
        return;
    }
    await extensionContext.globalState.update(TOKEN_KEY, token);
}

export function getToken(): string | undefined {
    if (!extensionContext) {
        return;
    }
    return extensionContext.globalState.get<string>(TOKEN_KEY);
}

export async function resetToken() {
    if (!extensionContext) {
        return;
    }
    await extensionContext.globalState.update(TOKEN_KEY, undefined);
}

/* =====================
   Context
===================== */
export function setContext(context: vscode.ExtensionContext) {
    extensionContext = context;
}

export function getContext(): vscode.ExtensionContext {
    if (!extensionContext) {
        throw new Error("Extension context not initialized");
    }
    return extensionContext;
}