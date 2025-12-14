# eternal-timer

A simple and persistent timer library for Node.js. Timers are saved to a file and maintain their state even after process restart.

## Features

- **Create Timers**: Create timers for a specified duration
- **Remove Timers**: Delete timers by ID
- **Monitor Timers**: Handle expired timers with callback functions
- **List Timers**: Retrieve all active timers
- **Persistence**: Save timer data to a file that persists across process restarts

## Installation

```bash
npm install eternal-timer
```

## Usage

### Basic Example

```typescript
import { createTimer, checkTimers, removeTimer, showTimers } from 'eternal-timer';

// Create a timer (5 seconds)
const timerId = await createTimer(5000);
console.log('Timer created:', timerId);

// Monitor timers (executes when timer expires)
await checkTimers((timer) => {
  console.log('Timer expired:', timer.id);
});

// Display all timers
const timers = await showTimers();
console.log('Active timers:', timers);

// Remove a timer
await removeTimer(timerId);
```

## API

### `createTimer(length: number): Promise<string | null>`

Creates a new timer.

**Parameters:**
- `length` (number): Timer duration in milliseconds

**Returns:** Timer ID (UUID), or `null` on error

### `removeTimer(id: string): Promise<boolean>`

Removes a timer by ID.

**Parameters:**
- `id` (string): ID of the timer to remove

**Returns:** `true` on success, `false` on failure

### `checkTimers(callback: (timer: Timer) => void, interval?: number): Promise<void>`

Monitors expired timers and executes the callback function.

**Parameters:**
- `callback`: Function to execute when expired timers are found
- `interval` (number, optional): Check interval in milliseconds (default: 50ms)

### `showTimers(): Promise<Timer[]>`

Retrieves all active timers.

**Returns:** Array of `Timer` objects

## Type Definition

```typescript
type Timer = {
    id: string;      // Unique timer identifier (UUID)
    start: string;   // Timer start timestamp
    stop: string;    // Timer end timestamp
}
```

## Scripts

- `npm run dev`: Run in development mode with nodemon
- `npm run build`: Compile TypeScript
- `npm start`: Run compiled JavaScript

## Storage

Timer data is stored in the `.timers` file in the project root. Each line follows this format:

```
{id} {start_timestamp} {stop_timestamp}
```

## License

ISC

## Repository

https://github.com/SUKEsann2000/eternal-timer