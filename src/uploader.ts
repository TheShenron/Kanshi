import { session } from "./session";
import { getGitLogs } from "./gitLogger";
import { getExamId, getTimer } from "./extensionContext";
import { api } from "./api/client";
import { DateTime } from "luxon";


export async function upload(zipPath: string) {

  const gitLogs = await getGitLogs();
  session.events.push({ type: "gitLogs", timestamp: Date.now(), meta: { gitLogs } });
  const examId = getExamId();

  const { startTime } = getTimer();

  const startedAt = DateTime.fromISO(String(startTime)).toUTC();
  const submittedAt = DateTime.utc();

  const durationTaken = Math.floor(
    submittedAt.diff(startedAt, "minutes").minutes
  );

  await api.post('users/submit', {
    userExamId: examId,
    score: 70,
    isPassed: false,
    startedAt: startedAt.toISO(),
    submittedAt: submittedAt.toISO(),
    durationTaken: durationTaken,
    proctorEvents: session.events,
  });

}
