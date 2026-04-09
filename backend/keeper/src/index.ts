import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { settleExpiredMarkets } from './services/settlement';

const POLLING_INTERVAL = Number(process.env.POLLING_INTERVAL) || 3000;

const startKeeper = async () => {
  console.log(`🚀 BitDrum Keeper Service Started V2`);
  console.log(`Interval: ${POLLING_INTERVAL}ms`);

  const loop = async () => {
    await settleExpiredMarkets();
    setTimeout(loop, POLLING_INTERVAL);
  };

  loop();
};

startKeeper().catch((err) => {
  console.error('Fatal Keeper Error:', err);
  process.exit(1);
});
