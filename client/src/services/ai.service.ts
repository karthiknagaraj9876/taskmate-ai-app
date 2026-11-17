
import api from "./api";

export interface AIChatRequest {
  message: string;
  contextId: string | null;
}

export interface AIChatResponse {
  success: boolean;
  message: string;
  data: {
    answer: string;
    contextId: string | null;
    status: string;
  };
}

export const sendAIMessage = async (
  payload: AIChatRequest
): Promise<AIChatResponse> => {
  const response = await api.post<AIChatResponse>(
    "/ai/chat",
    payload
  );

  return response.data;
};
