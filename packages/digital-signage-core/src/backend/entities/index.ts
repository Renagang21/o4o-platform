// Media management
export * from './MediaSource.entity.js';
export * from './MediaList.entity.js';
export * from './MediaListItem.entity.js';

// Display management
export * from './Display.entity.js';
export * from './DisplaySlot.entity.js';

// Schedule management
export * from './Schedule.entity.js';

// Action execution
export * from './ActionExecution.entity.js';

// All entities for TypeORM registration
import { MediaSource } from './MediaSource.entity.js';
import { MediaList } from './MediaList.entity.js';
import { MediaListItem } from './MediaListItem.entity.js';
import { Display } from './Display.entity.js';
import { DisplaySlot } from './DisplaySlot.entity.js';
import { Schedule } from './Schedule.entity.js';
import { ActionExecution } from './ActionExecution.entity.js';

export const SignageEntities = [
  MediaSource,
  MediaList,
  MediaListItem,
  Display,
  DisplaySlot,
  Schedule,
  ActionExecution,
] as const;
