const PLEX_TOKEN = process.env.PLEX_TOKEN;
const PLEX_SECTION_ID = process.env.PLEX_SECTION_ID;

export async function triggerPlexScan() {
  if (!PLEX_TOKEN || !PLEX_SECTION_ID) {
    console.warn('[Plex] PLEX_TOKEN or PLEX_SECTION_ID not set — skipping scan');
    return;
  }
  const url = `http://localhost:32400/library/sections/${PLEX_SECTION_ID}/refresh?X-Plex-Token=${PLEX_TOKEN}`;
  try {
    const res = await fetch(url);
    console.log(`[Plex] Library scan triggered — HTTP ${res.status}`);
  } catch (err) {
    console.error(`[Plex] Scan request failed: ${err.message}`);
  }
}
