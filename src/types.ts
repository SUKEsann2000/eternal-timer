export type StorageType = "JSONL" | "PlainText";

export type Timer<T extends StorageType> = {
    id: string;
    start: number;
    stop: number;
} & (T extends "JSONL" ? { title?: string; description?: string } : object);

export type CreateTimerOptions<T extends StorageType> = T extends "JSONL"
    ? {
          length: number;
          title?: string;
          description?: string;
      } | number
    : T extends "PlainText"
      ? number
      : never;

export type TimersManagerOptions = {
    timerfiledir?: string;
    disableCache?: boolean;
} | string;