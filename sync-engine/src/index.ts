import "dotenv/config";
import { pollOnce } from "./poller";
import { testConnection } from "./essl";

const POLL_INTERVAL = (parseInt(process.env.POLL_INTERVAL_SECONDS || "60", 10)) * 1000;
const MOCK_MODE = process.env.MOCK_MODE === "true";

async function main() {
  console.log("FLAME Biometric Sync Engine starting...");

  if (MOCK_MODE) {
    console.log("Running in MOCK_MODE — eSSL connection skipped. Set MOCK_MODE=false to connect.");
    console.log(`Polling every ${POLL_INTERVAL / 1000}s (no-op in mock mode)`);

    setInterval(() => {
      console.log(`[${new Date().toISOString()}] Mock poll — waiting for eSSL connection`);
    }, POLL_INTERVAL);
    return;
  }

  const connected = await testConnection();
  if (!connected) {
    console.error("Cannot connect to eSSL database. Exiting.");
    process.exit(1);
  }

  console.log("Connected to eSSL database");
  console.log(`Polling every ${POLL_INTERVAL / 1000}s`);

  await pollOnce();

  setInterval(async () => {
    try {
      await pollOnce();
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, POLL_INTERVAL);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
