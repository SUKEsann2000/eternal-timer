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
    const timerId = await manager.createTimer(5000, 'My Timer', 'This is a test timer.');
    console.log('Timer created:', timerId);

    // Monitor timers (executes when timer expires)
    const interval = manager.checkTimers(async (timer) => {
        console.log('Timer expired:', timer.id, timer.title);
    });

    // Display all timers
    const timers = await manager.showTimers();
    console.log('Active timers:', timers);

    // Remove a timer
    await manager.removeTimer(timerId);
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
    });
    
    // Remove a timer
	await manager.removeTimer(timerId);
}

main();
```

## API

### `new JSONLTimersManager(timerfiledir?: string)`

Creates a manager for timers stored in the **JSON Lines** format.

**Parameters:**
- `timerfiledir` (string, optional): The path to the timer file. If omitted, the default is `.timers.jsonl` in the project root.

### `new PlainTextTimersManager(timerfiledir?: string)`

Creates a manager for timers stored in the **plain-text** format.

**Parameters:**
- `timerfiledir` (string, optional): The path to the timer file. If omitted, the default is `.timers` in the project root.

---

### `createTimer(length: number, title?: string, description?: string): Promise<string>`

Creates a new timer.

**Parameters:**
- `length` (number): Timer duration in milliseconds
- `title` (string, optional): A title for the timer. **Only available for `JSONLTimersManager`**.
- `description` (string, optional): A description for the timer. **Only available for `JSONLTimersManager`**.

**Returns:** Promise that resolves to the timer ID (UUID)

**Throws:** If length is invalid(e.g. length < 0) or file operation fails

### `removeTimer(id: string): Promise<void>`

Removes a timer by ID.

**Parameters:**
- `id` (string): ID of the timer to remove

**Returns:** void

**Throws:** If the timer with the specified ID is not found or if a file operation fails.

### `checkTimers(callback: (timer: Timer) => Promise<void>, interval?: number): Promise<NodeJS.Timeout>`

Starts monitoring expired timers and returns immediately.

The callback is invoked when a timer expires during periodic checks.
The callback is awaited before the next timer check continues.

**Parameters:**
- `callback`: Function invoked when an expired timer is detected (called during periodic checks and awaited)
- `interval` (number, optional): Check interval in milliseconds (default: 200ms)

**Returns:** interval id of checkTimers

**Throws:** If file operation fails

### `showTimers(): Promise<Timer[]>`

Retrieves all active timers.

**Returns:** Array of `Timer` objects

**Throws:** If file operation fails

## Type Definition

```typescript
type Timer = {
    id: string;      // Unique timer identifier (UUID)
    start: number;   // Timer start timestamp
    stop: number;    // Timer end timestamp
    title?: string;
    description?: string;
}
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

- **Pros**: Allows for storing `title` and `description`.
- **Cons**: Involves JSON parsing, which may have a minor performance overhead.
- **Default File**: `.timers.jsonl`
- **Format**:
  ```json
  {"id":"...","start":1678886400000,"stop":1678886405000,"title":"My Timer","description":"..."}
  ```

### 2. Plain Text (via `PlainTextTimersManager`)
This format is more lightweight and slightly faster.

- **Pros**: Simple and efficient.
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
