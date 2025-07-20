import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env';

dotenv.config({ 
  path: path.resolve(process.cwd(), envFile) 
});

import { AppDataSource } from './connection';

export default AppDataSource;