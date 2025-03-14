// project/faucet-backend/src/db.ts
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

export async function initDb() {
  db = await open({
    filename: './faucet.db',
    driver: sqlite3.Database
  });

  // Updated table schema
  await db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evmAddress TEXT,
      fractionId REAL,
      xrplTxHash TEXT,
      xrplevmTxHash TEXT,   -- if you plan to store the bridging transaction from EVM side
      amountId REAL,
      xrplTxTime INTEGER,
      xrplevmTxTime INTEGER,
      status TEXT,
      bridgingTimeMs INTEGER,
      destinationTxHash TEXT
    )
  `);
}

export function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
