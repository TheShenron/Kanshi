import { session } from "./session";
import { getGitLogs } from "./gitLogger";
import { getDriveId, getExamId } from "./extensionContext";
import { api } from "./api/client";


export async function upload(zipPath: string) {

  const gitLogs = await getGitLogs();
  session.events.push({ type: "gitLogs", timestamp: Date.now(), meta: { gitLogs } });
  const examId = getExamId();
  const driveId = getDriveId();

  //submit exam:
  const { data: submitExam } = await api.post(`/results/me/submit`, {
    examId: examId,
    hiringDriveId: driveId,
    isPassed: true,
    score: 54
  });

  //submit exam:
  const resultId = submitExam?.data?._id || ''
  await api.post(`/results/${resultId}/proctoring`, {
    events: session.events,
  });

}
