export type StorageType = "JSONL" | "PlainText";

export type Timer<T extends StorageType, Extra extends object> =
    T extends "JSONL"
        ? {
              id: string;
              start: number;
              stop: number;
              extra: Extra;
          }
        : {
              id: string;
              start: number;
              stop: number;
          };

export type CreateTimerOptions<T extends StorageType> = T extends "JSONL"
    ? {
          length: number;
          title?: string;
          description?: string;
      } | number
    : T extends "PlainText"
      ? number
      : never;
