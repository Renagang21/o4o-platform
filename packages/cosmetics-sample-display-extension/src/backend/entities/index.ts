/**
 * Cosmetics Sample & Display Extension - Entities
 */

export * from './sample-inventory.entity';
export * from './sample-usage-log.entity';
export * from './display-layout.entity';
export * from './sample-conversion.entity';

// Entity array for TypeORM registration
import { SampleInventory } from './sample-inventory.entity';
import { SampleUsageLog } from './sample-usage-log.entity';
import { DisplayLayout } from './display-layout.entity';
import { SampleConversion } from './sample-conversion.entity';

export const entities = [
  SampleInventory,
  SampleUsageLog,
  DisplayLayout,
  SampleConversion,
];
