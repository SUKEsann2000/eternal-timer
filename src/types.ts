export type StorageType = "JSONL" | "PlainText";

export type Timer<T extends StorageType, Extra extends object> =
    T extends "JSONL"
        ? {
              id: string;
              start: number;
              stop: number;
              extra: Extra
          }
        : {
              id: string;
              start: number;
              stop: number;
          };

export type CreateTimerOptions<T extends StorageType, Extra extends object> = T extends "JSONL"
    ? {
          length: number;
          extra: Extra
      }
    : T extends "PlainText"
      ? number
      : never;

export type TimerEvents<T extends StorageType, Extra extends object> = {
  started: void,
  stopped: void,
  expired: Timer<T, Extra>
  errored: Error
  interval: void
  created: Timer<T, Extra>
  removed: Timer<T, Extra>
  updated: { old: Timer<T, Extra>, new: Timer<T, Extra> }
}

export type ListenerMap<T extends StorageType, Extra extends object> = {
  [K in keyof TimerEvents<T, Extra>]?: ((
    payload: TimerEvents<T, Extra>[K]
  ) => void | Promise<void>)[]
}
