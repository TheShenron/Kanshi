import * as fs from "node:fs";
import * as path from "node:path";
import { session } from "./session";
import { getGitLogs } from "./gitLogger";

export async function upload(zipPath: string, token: string) {

  const gitLogs = await getGitLogs();
  session.events.push({ type: "gitLogs", timestamp: Date.now(), meta: { gitLogs } });

  // const form = new FormData();


  // form.append('zip', fs.createReadStream(zipPath));
  // form.append('sessionId', session.id);
  // form.append('events', JSON.stringify(session.events));
  // form.append('gitLogs', JSON.stringify(gitLogs));

  // await fetch('https://yourserver.com/exam/submit', {
  //     method: 'POST',
  //     headers: {
  //         Authorization: `Bearer ${token}`
  //     },
  //     body: form as any
  // });

  // if(!Response.ok) {
  //   throw new Error(`Server error during upload : ${Response.status}`);
  // };

  // vscode.window.showInformationMessage("Exam uploaded successfully!");


  const submissionsDir = path.resolve(__dirname, "../submissions");
  if (!fs.existsSync(submissionsDir)) {
    fs.mkdirSync(submissionsDir);
  }

  const zipDest = path.join(submissionsDir, path.basename(zipPath));
  fs.copyFileSync(zipPath, zipDest);

  const eventsDest = path.join(submissionsDir, `events-${Date.now()}.json`);
  fs.writeFileSync(
    eventsDest,
    JSON.stringify(session.events, null, 2),
    "utf-8",
  );

  console.log("Saved zip and session events locally:");
  console.log("ZIP:", zipDest);
  console.log("Events JSON:", eventsDest);
  console.log("Token", token);
}
