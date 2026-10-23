import { AppDataSource } from "../../database/connection.js";
import { collectScheduledNews } from "./community-news-collection.service.js";
import { reviewScheduledNews } from "./community-news-review.service.js";
import { generateScheduledNewsSuggestions } from "./community-news-ai.service.js";

/** Daily reservations are shared by all revisions and manual actions; nothing is auto-published. */
export async function runCommunityNewsAutomation() {
  const collection = await collectScheduledNews(AppDataSource);
  if (collection.state === "pending" || collection.state === "failed")
    return { collection: collection.state, review: "not-started" };
  const review = await reviewScheduledNews(
    AppDataSource,
    generateScheduledNewsSuggestions,
  );
  return { collection: collection.state, review: review.state };
}
