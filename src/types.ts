export type StorageType = "JSONL" | "PlainText";

export type Timer<T extends StorageType, Extra extends object> =
    T extends "JSONL"
        ? {
              id: string;
              start: number;
              stop: number;
              extra: Extra | Record<string, never>
          }
        : {
              id: string;
              start: number;
              stop: number;
          };

export type CreateTimerOptions<T extends StorageType, Extra extends object> = T extends "JSONL"
    ? {
          length: number;
          extra?: Extra
      } | number
    : T extends "PlainText"
      ? number
      : never;
