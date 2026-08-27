export interface IChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface IChatRequest {
  message: string;
  history?: IChatMessage[];
}
