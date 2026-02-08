export type StorageType = "JSON" | "PlainText"

export type Timer<T extends StorageType> = {
    id: string,
    start: number,
    stop: number,
} & (T extends "JSON"
    ? { title?: string, description?: string }
    : object
)

export type CreateTimerOptions<T extends StorageType> = (T extends "JSON"
    ? { title?: string, description?: string }
    : object
)
