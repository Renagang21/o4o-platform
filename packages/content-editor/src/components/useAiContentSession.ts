/** Private compatibility adapter: the main generation owner also supplies the modal view lifetime. */
import { useAiGenerationRequest } from "./use-ai-generation-request";

export function useAiContentSession(open: boolean, context: string) {
  return useAiGenerationRequest(open, context);
}
export type AiContentSession = ReturnType<typeof useAiContentSession>;
