# eternal-timer

A simple and persistent timer library for Node.js. Timers are saved to a file and maintain their state even after process restart.

## Features

- **Monitor Timers (asynchronous)**: Start monitoring expired timers asynchronously; the function returns immediately and the callback is called when timers expire.
- **Persistence**: Save timer data to a file that persists across process restarts

## Installation

```bash
npm install eternal-timer
```

## Usage

### Basic Example

```javascript
import { TimersManager } from 'eternal-timer';

async function main() {
    const manager = new TimersManager();

    // Create a timer (5 seconds)
    const timerId = await manager.createTimer(5000);
    console.log('Timer created:', timerId);

    // Monitor timers (executes when timer expires)
    manager.checkTimers(async (timer) => {
        console.log('Timer expired:', timer.id);
    });

    // Display all timers
    const timers = await manager.showTimers();
    console.log('Active timers:', timers);

    // Remove a timer
    await manager.removeTimer(timerId);
}

main();
```

## API

### `new TimersManager(timerfiledir?: string)`

Creates a new `TimersManager` instance.

**Parameters:**
- `timerfiledir` (string, optional): The path to the directory where the timer file is stored. If omitted, `.timers` under the project root is used.

### `createTimer(length: number): Promise<string>`

Creates a new timer.

**Parameters:**
- `length` (number): Timer duration in milliseconds

**Returns:** Promise that resolves to the timer ID (UUID)

**Throws:** If length is invalid(e.g. length < 0) or file operation fails

### `removeTimer(id: string): Promise<void>`

Removes a timer by ID.

**Parameters:**
- `id` (string): ID of the timer to remove

**Returns:** void

**Throws:** If the timer with the specified ID is not found or if a file operation fails.

### `checkTimers(callback: (timer: Timer) => Promise<void>, interval?: number): Promise<void>`

Starts monitoring expired timers and returns immediately.

The callback is invoked when a timer expires during periodic checks.
The callback is awaited before the next timer check continues.

**Parameters:**
- `callback`: Function invoked when an expired timer is detected (called during periodic checks and awaited)
- `interval` (number, optional): Check interval in milliseconds (default: 50ms)

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
}
```

## Scripts

- `npm run dev`: Run in development mode with nodemon
- `npm run build`: Compile TypeScript
- `npm start`: Run compiled JavaScript
- `npm run test`: Test the compiled code
- `npm run lint`: Lint all codes

## Storage

Timer data is stored in the `.timers` file in the project root. Each line follows this format:

```
{id} {start_timestamp} {stop_timestamp}
```

## License

Apache-2.0

Licensed under the Apache License, Version 2.0. See the `LICENSE` file for details.

## Repository

https://github.com/SUKEsann2000/eternal-timer


