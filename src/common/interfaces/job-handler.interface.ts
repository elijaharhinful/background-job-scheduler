import { HandlerResult } from './handler-result.interface';

export interface IJobHandler {
  readonly type: string;
  handle(
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HandlerResult>;
}
