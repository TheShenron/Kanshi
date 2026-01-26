import crypto from "node:crypto";

export interface ProctorEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const session = {
  id: "",
  startTime: 0,
  duration: 90,
  active: false,
  events: [] as ProctorEvent[],
};

export function startSession() {
  session.id = crypto.randomUUID();
  session.startTime = Date.now();
  session.active = true;
  session.events = [];
}

export function stopSession() {
  session.active = false;
}

export function recordEvent(type: string, meta: any = {}) {
  if (!session.active) {
    return;
  }
  session.events.push({ type, timestamp: Date.now(), meta });
}
