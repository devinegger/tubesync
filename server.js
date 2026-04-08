import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { enqueue, getJob } from './queue.js';
import { processNext } from './runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.post('/api/submit', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  const job = enqueue(url);
  processNext();
  res.json({ jobId: job.jobId, status: job.status });
});

app.get('/api/status/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ jobId: job.jobId, status: job.status, filename: job.filename });
});

app.listen(PORT, () => {
  console.log(`TubeSync listening on port ${PORT}`);
});

export default app;
