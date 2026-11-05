import {
  authHeaders,
  requestData,
} from "./http";

export interface UsageMetrics {
  messages: number;
  inputTokens: number;
  outputTokens: number;
  uploads: number;
  uploadBytes: number;
  imageGenerations: number;
  expensiveModelCalls: number;
}

export interface UsageSummary {
  period: string;
  daily: {
    period: string;
    usage: UsageMetrics;
  };
  usage: UsageMetrics;
  quotas: {
    messages: number;
    uploads: number;
    uploadBytes: number;
    imageGenerations: number;
    expensiveModelCalls: number;
  };
}

export const usageApi = {
  async getUsage(accessToken: string): Promise<UsageSummary> {
    return requestData<UsageSummary>("/usage", {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },
};
