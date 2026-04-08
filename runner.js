import { spawn } from 'child_process';
import { dequeue, getJob, isProcessing, setProcessing, setStatus } from './queue.js';
import { triggerPlexScan } from './plex.js';

const MUSIC_DIR = process.env.MUSIC_DIR || '/Users/devinegger/Music/Karen';
const YTDLP_BIN = '/usr/local/bin/yt-dlp';

export function processNext() {
  if (isProcessing()) return;

  const jobId = dequeue();
  if (!jobId) return;

  const job = getJob(jobId);
  if (!job) return processNext();

  setProcessing(true);
  setStatus(jobId, 'downloading');
  console.log(`[TubeSync] Starting download: ${job.url} (job ${jobId})`);

  const args = [
    '-x',
    '--audio-format', 'mp3',
    '--embed-metadata',
    '--no-overwrites',
    '--no-playlist',
    '--extractor-args', 'youtube:player_client=web', 
    '--print', 'after_move:filepath',
    '-o', `${MUSIC_DIR}/%(title)s.%(ext)s`,
    job.url,
  ];

  const child = spawn(YTDLP_BIN, args);
  let outputPath = null;

  child.stdout.on('data', (data) => {
    const line = data.toString().trim();
    console.log(`[yt-dlp] ${line}`);
    if (line.endsWith('.mp3')) {
      outputPath = line;
    }
  });

  child.stderr.on('data', (data) => {
    console.error(`[yt-dlp] ${data.toString().trim()}`);
  });

  child.on('close', async (code) => {
    if (code === 0) {
      const filename = outputPath ? outputPath.split('/').pop() : null;
      setStatus(jobId, 'done', filename);
      console.log(`[TubeSync] Job ${jobId} done. File: ${filename}`);
      await triggerPlexScan();
    } else {
      setStatus(jobId, 'failed');
      console.error(`[TubeSync] Job ${jobId} failed with exit code ${code}`);
    }
    setProcessing(false);
    processNext();
  });

  child.on('error', (err) => {
    console.error(`[TubeSync] Failed to spawn yt-dlp: ${err.message}`);
    setStatus(jobId, 'failed');
    setProcessing(false);
    processNext();
  });
}
