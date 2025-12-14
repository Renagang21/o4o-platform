# Digital Signage Device Agent

Store-side agent for Digital Signage playback - Phase 7.

## Overview

The Device Agent runs on store displays and connects to the Digital Signage Core server to receive and execute playback commands.

### What the Agent Does

- Connects to Core server (WebSocket + HTTP fallback)
- Registers display and slots with Core
- Receives ActionExecution commands
- Runs local player for media playback
- Reports status via heartbeat

### What the Agent Does NOT Do

- Content selection or recommendation
- Scheduling or policy decisions
- Business logic of any kind

## Installation

```bash
pnpm install
```

## Configuration

Set environment variables:

```bash
# Required
CORE_SERVER_URL=http://localhost:3001
CORE_SERVER_WS_URL=ws://localhost:3001

# Optional
HARDWARE_ID=custom-device-id
DEVICE_NAME=Store Display 1
HEARTBEAT_INTERVAL_MS=5000
LOG_LEVEL=info
```

## Usage

### Run Agent

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### Programmatic Usage

```typescript
import { AgentBootstrap } from '@o4o/digital-signage-agent';

const agent = new AgentBootstrap({
  coreServerUrl: 'http://localhost:3001',
  coreServerWsUrl: 'ws://localhost:3001',
});

agent.on('stateChange', (state) => {
  console.log('State:', state);
});

await agent.start();
```

## Architecture

```
[Digital Signage Core]
        ↑   ↓  (WebSocket / HTTP)
[Device Agent]
        ↓
[Local Player Runtime]
        ↓
[Display / Screen]
```

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `agent:connected` | Agent → Core | Agent connected |
| `agent:heartbeat` | Agent → Core | Status heartbeat |
| `action:execute` | Core → Agent | Start playback |
| `action:pause` | Core → Agent | Pause playback |
| `action:resume` | Core → Agent | Resume playback |
| `action:stop` | Core → Agent | Stop playback |
| `action:status` | Agent → Core | Status update |

## Safety Rules

1. **Network Disconnect**: Immediately stops all active actions
2. **Zombie Prevention**: Forces player stop when slot is terminated
3. **Single Action**: Only one action per slot at a time

## License

Proprietary - O4O Platform
