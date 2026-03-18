export type StorageType = "JSONL" | "PlainText";

export type Timer<T extends StorageType> =
    T extends "JSONL"
        ? {
              id: string;
              start: number;
              stop: number;
              extra: {
                [key: string]: unknown
              }
          }
        : {
              id: string;
              start: number;
              stop: number;
          };

export type CreateTimerOptions<T extends StorageType> = T extends "JSONL"
    ? {
          length: number;
          extra?: {
            [key: string]: unknown;
          }
      } | number
    : T extends "PlainText"
      ? number
      : never;
