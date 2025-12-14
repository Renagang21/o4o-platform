# @o4o/digital-signage-contract

Digital Signage Extension Contract - Types and Client for Extension development.

## Contract Version

**Current Version: v1.0**

## Installation

```bash
pnpm add @o4o/digital-signage-contract
```

## Usage

### Basic Example

```typescript
import { SignageContractClient } from '@o4o/digital-signage-contract';

const client = new SignageContractClient({
  baseUrl: process.env.SIGNAGE_API_URL || 'http://localhost:3001',
  appId: 'my-extension',
});

// Execute an action
const result = await client.executeAction({
  mediaListId: 'media-list-uuid',
  displaySlotId: 'display-slot-uuid',
  duration: 60,
  executeMode: 'replace',
});

if (result.success) {
  console.log('Action started:', result.executionId);
} else {
  console.error('Failed:', result.error);
}
```

### Control Actions

```typescript
// Pause
await client.pauseAction(executionId);

// Resume
await client.resumeAction(executionId);

// Stop
await client.stopAction(executionId, { reason: 'User requested' });
```

### Query Status

```typescript
// Get action status
const actionStatus = await client.getActionStatus(executionId);
console.log('Status:', actionStatus.data?.status);

// Get slot status
const slotStatus = await client.getSlotStatus(slotId);
console.log('Slot is:', slotStatus.data?.status);
```

## Types

### ExecuteActionRequest

```typescript
interface ExecuteActionRequest {
  sourceAppId: string;      // Auto-filled by client
  mediaListId: string;      // Required
  displaySlotId: string;    // Required
  duration?: number;        // Optional, default: 0 (unlimited)
  executeMode?: 'immediate' | 'replace' | 'reject';  // Optional, default: 'reject'
  priority?: number;        // Optional, 1-100, default: 50
  metadata?: Record<string, unknown>;  // Optional
}
```

### Execute Modes

| Mode | Description |
|------|-------------|
| `immediate` | Queue and execute in order |
| `replace` | Stop current action and execute immediately |
| `reject` | Fail if slot is already busy |

### Action Status

```typescript
type ActionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'STOPPED'
  | 'FAILED';
```

### Slot Status

```typescript
type SlotStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'ERROR';
```

## Contract Rules

### Extensions CAN:
- Request action execution
- Control actions (pause/resume/stop)
- Query action and slot status
- Include custom metadata

### Extensions CANNOT:
- Access Core internal data directly
- Control Player/Rendering directly
- Modify slot policies
- Communicate with Device Agent directly

## Documentation

See [Extension Contract Guide](../../docs/guides/digital-signage/extension-contract.md) for complete documentation.

## License

Proprietary - O4O Platform
