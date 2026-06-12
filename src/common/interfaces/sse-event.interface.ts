export interface SseEvent<T = unknown> {
  type?: string;
  data: T;
  id?: string;
}
