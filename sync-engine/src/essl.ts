import sql from "mssql";
import { EsslLog } from "./db";

function getMssqlConfig(): sql.config {
  return {
    server: process.env.ESSL_DB_SERVER || "localhost",
    port: parseInt(process.env.ESSL_DB_PORT || "1433", 10),
    user: process.env.ESSL_DB_USER,
    password: process.env.ESSL_DB_PASSWORD,
    database: process.env.ESSL_DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };
}

export async function fetchNewLogs(
  lastSyncedAt: Date | null,
  lastEsslId: string | null
): Promise<EsslLog[]> {
  const tableName = process.env.ESSL_TABLE_NAME || "DeviceLogs";
  const pool = await sql.connect(getMssqlConfig());

  let query: string;
  let request = pool.request();

  if (lastSyncedAt) {
    request = request.input("lastSyncedAt", sql.DateTime, lastSyncedAt);
    if (lastEsslId) {
      request = request.input("lastEsslId", sql.VarChar, lastEsslId);
      query = `
        SELECT DeviceLogId, UserId, LogDate, DeviceId, Direction
        FROM ${tableName}
        WHERE LogDate > @lastSyncedAt
           OR (LogDate = @lastSyncedAt AND DeviceLogId > @lastEsslId)
        ORDER BY LogDate ASC, DeviceLogId ASC
      `;
    } else {
      query = `
        SELECT DeviceLogId, UserId, LogDate, DeviceId, Direction
        FROM ${tableName}
        WHERE LogDate > @lastSyncedAt
        ORDER BY LogDate ASC, DeviceLogId ASC
      `;
    }
  } else {
    query = `
      SELECT TOP 1000 DeviceLogId, UserId, LogDate, DeviceId, Direction
      FROM ${tableName}
      ORDER BY LogDate ASC, DeviceLogId ASC
    `;
  }

  const result = await request.query(query);
  await pool.close();

  return result.recordset.map((row: Record<string, unknown>) => ({
    DeviceLogId: String(row.DeviceLogId),
    UserId: String(row.UserId),
    LogDate: new Date(row.LogDate as string),
    DeviceId: String(row.DeviceId || ""),
    Direction: row.Direction ? String(row.Direction) : undefined,
  }));
}

export async function testConnection(): Promise<boolean> {
  try {
    const pool = await sql.connect(getMssqlConfig());
    await pool.request().query("SELECT 1");
    await pool.close();
    return true;
  } catch (err) {
    console.error("eSSL connection failed:", err);
    return false;
  }
}
