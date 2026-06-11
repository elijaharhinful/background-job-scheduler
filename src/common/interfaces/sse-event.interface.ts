export interface SseEvent<T = unknown> {
  event: string;
  data: T;
  id?: string;
}
