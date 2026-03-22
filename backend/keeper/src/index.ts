import dotenv from 'dotenv';
import { settleExpiredMarkets } from './services/settlement';

dotenv.config();

const POLLING_INTERVAL = Number(process.env.POLLING_INTERVAL) || 3000;

const startKeeper = async () => {
  console.log(`🚀 BitDrum Keeper Service Started`);
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
