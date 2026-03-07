# eternal-timer

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/SUKEsann2000/eternal-timer/run_test.yml)
![NPM Downloads](https://img.shields.io/npm/dm/eternal-timer)

A simple and persistent timer library for Node.js. Timers are saved to a file and maintain their state even after process restart.

## Features

- **Monitor Timers (asynchronous)**: Start monitoring expired timers asynchronously; the function returns immediately and the callback is called when timers expire.
- **Persistence**: Save timer data to a file that persists across process restarts
- **Choice of Format**: Choose between JSON Lines for rich data or plain text for lightweight storage.

## Installation

```bash
npm install eternal-timer
```

## Usage

You can choose between two manager classes depending on the desired storage format.

### `JSONLTimersManager` (JSON Lines)

Use this manager to store timers in a `.jsonl` file, which allows for storing `title` and `description`.

```javascript
import { JSONLTimersManager } from 'eternal-timer';

async function main() {
    // By default, timers are stored in '.timers.jsonl' in the project root.
    const manager = new JSONLTimersManager();

    // Create a timer (5 seconds) with a title and description
    const timerId = await manager.createTimer({length: 5000, title: 'My Timer', description: 'This is a test timer.'});
    console.log('Timer created:', timerId);

    // Monitor timers (executes when timer expires)
    const interval = manager.checkTimers(async (timer) => {
        console.log('Timer expired:', timer.id, timer.title);
        // Once the timer expires, you can remove it
        await manager.removeTimer(timer.id);
    });

    // Display all timers
    const timers = await manager.showTimers();
    console.log('Active timers:', timers);

    // To stop monitoring, for example after 10 seconds
    setTimeout(() => {
        clearInterval(interval);
        console.log('Stopped monitoring timers.');
    }, 10000);
}

main();
```

### `PlainTextTimersManager` (Plain Text)

Use this manager for a more lightweight plain-text format.

```javascript
import { PlainTextTimersManager } from 'eternal-timer';

async function main() {
    // By default, timers are stored in '.timers' in the project root.
    const manager = new PlainTextTimersManager();

    // Create a timer (5 seconds)
    const timerId = await manager.createTimer(5000);
    console.log('Timer created:', timerId);

    // Monitor timers
    const interval = manager.checkTimers(async (timer) => {
        console.log('Timer expired:', timer.id);
        await manager.removeTimer(timer.id);
    });

    // Display all timers
    const timers = await manager.showTimers();
    console.log('Active timers:', timers);
    
    // Stop monitoring after a while
    setTimeout(() => {
        clearInterval(interval);
        console.log('Stopped monitoring timers.');
    }, 10000);
}

main();
```

## API

### `JSONLTimersManager`

#### `constructor(timerfiledir?: string)`
Creates a manager for timers stored in **JSON Lines** format.

- **`timerfiledir`** (optional, string): Path to the timer file. Defaults to `.timers.jsonl` in the project root.

### `PlainTextTimersManager`

#### `constructor(timerfiledir?: string)`
Creates a manager for timers stored in **plain-text** format.

- **`timerfiledir`** (optional, string): Path to the timer file. Defaults to `.timers` in the project root.

---

### `createTimer(options: CreateTimerOptions<T>): Promise<string>`

Creates a new timer and saves it to the file.

#### Parameters

- **`options`**

  When using `"PlainText"` storage:
  - `number` — Timer duration in milliseconds.

  When using `"JSONL"` storage:
  - `{ length: number; title?: string; description?: string }`
    - `length` (number): Timer duration in milliseconds.
    - `title` (optional, string): A title for the timer.
    - `description` (optional, string): A description for the timer.

  - `number` — Timer duration in milliseconds.  
    ⚠ Not recommended. See [Storage Formats](#storage-formats).

**Returns** A `Promise<string>` that resolves to the timer's unique ID (UUID).

**Throws** An error if: `length` is invalid (e.g., negative) or a file operation fails

### `removeTimer(id: string): Promise<void>`

Removes a timer by its ID.

- **`id`**: The ID of the timer to remove.

**Returns:** A `Promise` that resolves when the timer is removed.

**Throws:** An error if the timer with the specified ID is not found or if a file operation fails.

### `checkTimers(callback: (timer: Timer) => Promise<void>, interval?: number): NodeJS.Timeout`

Starts monitoring for expired timers at a specified interval. This function runs asynchronously and will not block execution.

When an expired timer is found, the provided `callback` function is invoked with the `timer` object. The entire process of checking for, and removing, expired timers is now atomic, preventing race conditions with other timer modification operations. The function waits for the `callback`'s `Promise` to resolve before proceeding to the next check. Error handling is within the `callback` to prevent the application from crashing if an error occurs during timer processing.

- **`callback`**: An async function that is called with the expired `timer` object.
- **`interval`** (optional, number): The interval in milliseconds to check for expired timers. Defaults to `200ms`.

**Returns:** A `NodeJS.Timeout` object that can be used with `clearInterval()` to stop monitoring.

**Throws:** An error if a file operation fails during monitoring.

### `showTimers(): Promise<Timer[]>`

Retrieves all active timers.

**Returns:** A `Promise` that resolves to an array of `Timer` objects.

**Throws:** An error if a file operation fails.

### `adjustRemainingTime(id: string, delay: number): Promise<void>`

Adjusts the remaining time of a specified timer. This can be used to extend or shorten a timer's duration.

- **`id`**: The ID of the timer to modify.
- **`delay`**: The amount of time in milliseconds to add to (if positive) or subtract from (if negative) the timer's remaining duration.

**Returns:** A `Promise<void>` that resolves when the timer's remaining time has been adjusted.

**Throws:** An error if: the timer with the specified ID is not found, the resulting remaining time would be negative, or a file operation fails.

## Type Definition

The `StorageType` has the following structure:
```typescript
type StorageType = "JSONL" | "PlainText"
```

The `Timer` object has the following structure:

```typescript
type Timer<T extends StorageType> = {
  id: string;
  start: number;
  stop: number;
} & (T extends "JSONL"
  ? { title?: string; description?: string }
  : object);
```

## Scripts

- `npm run dev`: Run in development mode with nodemon
- `npm run build`: Compile TypeScript
- `npm start`: Run compiled JavaScript
- `npm run test`: Test the compiled code
- `npm run lint`: Lint all codes

## Storage Formats

You can choose between two storage formats by selecting the appropriate manager class.

### 1. JSON Lines (via `JSONLTimersManager`)
This is the recommended format for storing rich metadata.

- **Pros**: Allows for storing `title` and `description`. Improved memory efficiency due to line-by-line file reading.
- **Cons**: Involves JSON parsing, which may have a minor performance overhead.
- **Default File**: `.timers.jsonl`
- **Format**:
  ```json
  {"id":"...","start":1678886400000,"stop":1678886405000,"title":"My Timer","description":"..."}
  ```

### 2. Plain Text (via `PlainTextTimersManager`)
This format is more lightweight and slightly faster.

- **Pros**: Simple and efficient. Improved memory efficiency due to line-by-line file reading.
- **Cons**: Cannot store additional data like `title` or `description`.
- **Default File**: `.timers`
- **Format**:
  ```
  {id} {start_timestamp} {stop_timestamp}
  ```

## License

Apache-2.0

Licensed under the Apache License, Version 2.0. See the `LICENSE` file for details.

## Repository

https://github.com/SUKEsann2000/eternal-timer
