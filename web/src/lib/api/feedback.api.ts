import type { SubmitFeedbackPayload } from "@/lib/types";
import { authHeaders, requestData } from "./http";

export const feedbackApi = {
  async submitFeedback(
    payload: SubmitFeedbackPayload,
    accessToken?: string
  ): Promise<{ feedbackId: string }> {
    return requestData<{ feedbackId: string }>("/feedback", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    });
  },
};
