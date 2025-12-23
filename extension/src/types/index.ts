/**
 * Типы для расширения
 */

export interface ExtensionConfig {
  min_interval_ms: number;
  max_interval_ms: number;
  max_retries: number;
}

export interface SessionData {
  session_token: string;
  prompts: string[];
  sent_count: number;
  started_at: number;
}

export interface AutomationState {
  isRunning: boolean;
  currentPrompt: number;
  totalPrompts: number;
  status: string;
  error: string | null;
}

