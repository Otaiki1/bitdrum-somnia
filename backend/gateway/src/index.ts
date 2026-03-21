import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Main Router
app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'BitDrum Gateway' });
});

app.listen(PORT, () => {
  console.log(`🚀 BitDrum Gateway running on http://localhost:${PORT}`);
});
