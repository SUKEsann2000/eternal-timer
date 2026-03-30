# eternal-timer

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/SUKEsann2000/eternal-timer/run_test.yml)
![NPM Downloads](https://img.shields.io/npm/dm/eternal-timer)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/SUKEsann2000/eternal-timer)

A simple and persistent timer library for Node.js. Timers are saved to a file and maintain their state even after process restart.

## Features

- **Monitor Timers (event-driven)**: Start monitoring expired timers and react to events like `expired`, `created`, `removed`, and `updated` through an event system.
- **Persistence**: Save timer data to a file that persists across process restarts
- **Choice of Format**: Choose between JSON Lines for rich data or plain text for lightweight storage.

## Installation

```bash
npm install eternal-timer
```

## Usage

You can choose between two manager classes depending on the desired storage format.

### `JSONLTimersManager` (JSON Lines)

Use this manager to store timers in a `.jsonl` file, which allows for storing `extra` data.

```javascript
import { JSONLTimersManager } from 'eternal-timer';

async function main() {
    // By default, timers are stored in '.timers.jsonl' in the project root.
    const manager = new JSONLTimersManager();

    // Create a timer (5 seconds) with a title and description
    const timerId = await manager.createTimer({length: 5000, extra: { title: 'My Timer', description: 'This is a test timer.' }});
    console.log('Timer created:', timerId);

    // Start monitoring for expired timers
    const interval = await manager.checkStart();

    // Listen for 'expired' events
    manager.on('expired', (timer) => {
        console.log('Timer expired:', timer.id, timer.extra?.title);
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

    // Start monitoring for expired timers
    const interval = await manager.checkStart();

    // Listen for 'expired' events
    manager.on('expired', (timer) => {
        console.log('Timer expired:', timer.id);
    });

    // Display all timers
    const timers = await manager.showTimers();
    console.log('Active timers:', timers);
    
    // Stop monitoring after a while
    setTimeout(() => {
        clearInterval(interval);
        console.log('Stopped monitoring for timers.');
    }, 10000);
}

main();
```

## API

### `JSONLTimersManager`

#### `constructor(timerfiledir?: string)`
Creates a manager for timers stored in **JSON Lines** format.

- **`timerfiledir`** (optional, string): Path to the timer file. Defaults to `.timers.jsonl` in the project root.

#### `changeExtra(id: string, newExtra: Extra): Promise<void>`
Changes the `extra` data of an existing timer.

- **`id`**: The ID of the timer to modify.
- **`newExtra`**: The new `extra` object for the timer.

**Returns:** A `Promise<void>` that resolves when the timer's `extra` data has been updated.

**Throws:** An error if: the timer with the specified ID is not found, or a file operation fails.

#### Using the `Extra` Type Parameter

The `JSONLTimersManager` is a generic class that accepts a type parameter `Extra`. This allows you to define the structure of the `extra` object that will be stored with your timers. By default, `Extra` is an empty object `{}`.

**Example:** Defining and using a custom `Extra` type

```typescript
import { JSONLTimersManager } from 'eternal-timer';

interface MyTimerExtra {
  title?: string;
  description?: string;
  category?: string;
}

async function main() {
    // Specify MyTimerExtra as the type argument for JSONLTimersManager
    const manager = new JSONLTimersManager<MyTimerExtra>();

    // Create a timer with custom extra data
    const timerId = await manager.createTimer({
        length: 10000,
        extra: {
            title: 'Project Alpha Deadline',
            description: 'Final submission for project Alpha.',
            category: 'Work'
        }
    });
    console.log('Timer created:', timerId);

    // Retrieve and access the custom extra data
    const timers = await manager.showTimers();
    const myTimer = timers.find(t => t.id === timerId);
    if (myTimer) {
        console.log('Timer title:', myTimer.extra?.title);
        console.log('Timer category:', myTimer.extra?.category);
    }
}

main();
```

### `PlainTextTimersManager`

#### `constructor(timerfiledir?: string)`
Creates a manager for timers stored in **plain-text** format.

- **`timerfiledir`** (optional, string): Path to the timer file. Defaults to `.timers` in the project root.

---

### `createTimer(options: CreateTimerOptions<T, Extra>): Promise<string>`

Creates a new timer and saves it to the file.

#### Parameters

- **`options`** (`CreateTimerOptions<T, Extra>`)
  - When using `PlainTextTimersManager` (type `PlainText`):
    - `number` — The timer's duration in milliseconds.
  - When using `JSONLTimersManager` (type `JSONL`):
    - `{ length: number; extra?: Extra }`
      - `length` (number): The timer's duration in milliseconds.
      - `extra` (optional, `Extra` object): An object containing arbitrary user-defined metadata for the timer.

**Returns** A `Promise<string>` that resolves to the timer's unique ID (UUID).

**Throws** An error if: `length` is invalid (e.g., negative) or a file operation fails.

**Examples:**

```javascript
// For PlainTextTimersManager with a custom Extra type
import { PlainTextTimersManager } from 'eternal-timer';

// For PlainTextTimersManager
const manager = new PlainTextTimersManager();
const newTimerId = await manager.createTimer(5000); // Create a 5-second timer
console.log('Created PlainText timer with ID:', newTimerId);
```

```typescript
// For JSONLTimersManager with a custom Extra type
import { JSONLTimersManager } from 'eternal-timer';

interface MyCustomExtra {
  purpose: string;
  userId: string;
}

const jsonlManager = new JSONLTimersManager<MyCustomExtra>();
const jsonlTimerId = await jsonlManager.createTimer({
  length: 10000, // 10 seconds
  extra: {
    purpose: "Session Timeout",
    userId: "user-123"
  }
});
console.log('Created JSONL timer with ID:', jsonlTimerId);
```
### `removeTimer(id: string): Promise<void>`

Removes a timer by its ID.

- **`id`**: The ID of the timer to remove.

**Returns:** A `Promise` that resolves when the timer is removed.

**Throws:** An error if the timer with the specified ID is not found or if a file operation fails.

### `checkStart(interval?: number): Promise<NodeJS.Timeout>`

Starts the timer checking loop. This method should be called once after creating an instance of a `TimersManager` to begin detecting expired timers. Events like `expired`, `errored`, `created`, `removed`, and `updated` are emitted, which can be listened to using the `on` method.

- **`interval`** (optional, number): Polling interval in milliseconds (default: 200ms)

**Returns:** The interval ID which can be used to stop the loop with `clearInterval()`.

**Throws:** If file operation fails during checking.

### `on<K extends keyof TimerEvents<T, Extra>>(event: K, listener: (payload: TimerEvents<T, Extra>[K]) => void | Promise<void>): void`

Registers an event listener for a specific timer event.

- **`event`**: The name of the event to listen for (e.g., `'expired'`, `'created'`, `'removed'`, `'updated'`, `'errored'`).
- **`listener`**: The callback function to execute when the event is emitted. It receives the event payload as an argument.

**Returns:** `void`

**Example:**
```javascript
manager.on('expired', (timer) => {
    console.log(`Timer ${timer.id} expired!`);
});

manager.on('errored', (error) => {
    console.error('Timer event error:', error);
});
```

### `once<K extends keyof TimerEvents<T, Extra>>(event: K, listener: (payload: TimerEvents<T, Extra>[K]) => void | Promise<void>): void`

Registers a one-time event listener for a specific timer event. The listener will be invoked only once for the specified event, after which it will be automatically removed.

- **`event`**: The name of the event to listen for.
- **`listener`**: The callback function to execute when the event is emitted.

**Returns:** `void`

### `off<K extends keyof TimerEvents<T, Extra>>(event: K, listener: (payload: TimerEvents<T, Extra>[K]) => void | Promise<void>): void`

Removes a specific event listener for a given event.

- **`event`**: The name of the event from which to remove the listener.
- **`listener`**: The listener function to remove.

**Returns:** `void`

### `offAll<K extends keyof TimerEvents<T, Extra>>(event: K): void`

Removes all event listeners for a specific event.

- **`event`**: The name of the event for which to remove all listeners.

**Returns:** `void`

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

**Example:**
```javascript
// Assuming 'timerId' is the ID of an existing timer
await manager.adjustRemainingTime(timerId, 60000); // Add 1 minute to the timer
await manager.adjustRemainingTime(timerId, -30000); // Subtract 30 seconds from the timer
```

### `checkStop(): Promise<void>`

Asynchronously checks for any running `checkStart` intervals and clears them if found. This effectively stops the timer monitoring process.

**Returns:** A `Promise<void>` that resolves when all intervals have been cleared.

**Throws:** An error if any underlying file operation fails during the process of checking and stopping.

### `isBusy: boolean`

A getter that returns `true` if the manager is currently monitoring for expired timers (i.e., `checkStart` has been called and `checkStop` has not yet been called), and `false` otherwise.

**Returns:** `boolean` - `true` if monitoring, `false` otherwise.

## Type Definition

The `StorageType` has the following structure:
```typescript
type StorageType = "JSONL" | "PlainText"
```

The `Timer` object has the following structure:

```typescript
type Timer<T extends StorageType, Extra extends object> =
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
```
`Extra` is a generic type parameter that represents an object containing arbitrary user-defined metadata for JSONL timers. By default, it's `object`. For example, it can be `{ title?: string; description?: string }`.

The `CreateTimerOptions` type is used when creating new timers:
```typescript
type CreateTimerOptions<T extends StorageType, Extra extends object> = T extends "JSONL"
    ? {
          length: number;
          extra: Extra
      }
    : T extends "PlainText"
      ? number
      : never;
```

The `TimerEvents` type defines the events emitted by `TimersManager`:
```typescript
type TimerEvents<T extends StorageType, Extra extends object> = {
  expired: Timer<T, Extra>
  errored: Error
  interval: void
  created: Timer<T, Extra>
  removed: Timer<T, Extra>
  updated: { old: Timer<T, Extra>, new: Timer<T, Extra> }
}
```
## Scripts

- `npm run build`: Compile TypeScript
- `npm run test`: Test the compiled code
- `npm run lint`: Lint all codes
- `npm run lint:fix`: Lint all codes and fix

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
