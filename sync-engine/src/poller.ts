import { getSyncCursor, updateSyncCursor, processEsslLogs } from "./db";
import { fetchNewLogs } from "./essl";

export async function pollOnce(): Promise<void> {
  const cursor = await getSyncCursor();
  const logs = await fetchNewLogs(cursor.lastSyncedAt, cursor.lastEsslId);

  if (logs.length === 0) {
    console.log(`[${new Date().toISOString()}] No new logs`);
    return;
  }

  const processed = await processEsslLogs(logs);
  const lastLog = logs[logs.length - 1];

  await updateSyncCursor(lastLog.LogDate, lastLog.DeviceLogId);
  console.log(`[${new Date().toISOString()}] Synced ${processed}/${logs.length} new punch records`);
}
