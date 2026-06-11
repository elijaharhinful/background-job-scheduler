export interface HandlerResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  errorStack?: string;
}
