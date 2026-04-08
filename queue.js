import { v4 as uuidv4 } from 'uuid';

// jobs: Map<jobId, { jobId, url, status, filename }>
const jobs = new Map();
const queue = [];
let processing = false;

export function enqueue(url) {
  const jobId = uuidv4();
  const job = { jobId, url, status: 'queued', filename: null };
  jobs.set(jobId, job);
  queue.push(jobId);
  return job;
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

export function setStatus(jobId, status, filename = null) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = status;
  if (filename) job.filename = filename;
}

export function isProcessing() {
  return processing;
}

export function setProcessing(value) {
  processing = value;
}

export function dequeue() {
  return queue.shift() || null;
}
