import { AppDataSource } from "../../database/connection.js";
import { runScheduledNewsWindow } from "./community-news-auto.service.js";
import { generateScheduledNewsClusters } from "./community-news-ai.service.js";

/** One DB reservation per KST day and window, shared by all revisions and the operator's manual run. */
export async function runCommunityNewsAutomation(now = new Date()) {
  const run = await runScheduledNewsWindow(AppDataSource, {
    generate: generateScheduledNewsClusters,
    now,
  });
  return run
    ? { window: run.window, state: run.state, published: run.published }
    : { window: null };
}
