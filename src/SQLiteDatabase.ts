import { Database } from "sqlite3";
import { open } from "sqlite";

class SQLiteDatabase {
  private dbPromise: Promise<any>;
  private initialized: boolean = false;

  constructor(filename: string = "./db/litemap.db") {
    this.dbPromise = open({
      filename,
      driver: Database,
    });
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    const db = await this.dbPromise;

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_key ON users(key);
    `);
    this.initialized = true;
  }

  async set(key: string, value: any): Promise<void> {
    if (!key || value === undefined)
      throw new Error("Key and value must be provided");

    const db = await this.dbPromise;
    const valueString = JSON.stringify(value);

    await db.run("INSERT OR REPLACE INTO users (key, value) VALUES (?, ?)", [
      key,
      valueString,
    ]);
  }

  async batchSet(records: { key: string; value: any }[]): Promise<void> {
    if (!records.length) return;

    const db = await this.dbPromise;
    await db.run("BEGIN TRANSACTION");
    try {
      for (const { key, value } of records) {
        const valueString = JSON.stringify(value);
        await db.run(
          "INSERT OR REPLACE INTO users (key, value) VALUES (?, ?)",
          [key, valueString]
        );
      }
      await db.run("COMMIT");
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }
  }

  async append(key: string, value: any): Promise<void> {
    if (!key || value === undefined)
      throw new Error("Key and value must be provided");

    const db = await this.dbPromise;
    const existingRow = await db.get("SELECT value FROM users WHERE key = ?", [
      key,
    ]);

    const newValue = existingRow
      ? { ...JSON.parse(existingRow.value), ...value }
      : value;

    const valueString = JSON.stringify(newValue);
    await db.run("INSERT OR REPLACE INTO users (key, value) VALUES (?, ?)", [
      key,
      valueString,
    ]);
  }

  async get(key: string): Promise<any> {
    if (!key) throw new Error("Key must be provided");

    const db = await this.dbPromise;
    const row = await db.get("SELECT value FROM users WHERE key = ?", [key]);
    return row ? JSON.parse(row.value) : undefined;
  }

  async getAllKeys(prefix: string = ""): Promise<string[]> {
    const db = await this.dbPromise;
    const query = prefix
      ? "SELECT key FROM users WHERE key LIKE ?"
      : "SELECT key FROM users";
    const rows = await db.all(query, prefix ? [`${prefix}%`] : []);
    return rows.map((row: { key: string }) => row.key);
  }

  async delete(key: string): Promise<boolean> {
    if (!key) throw new Error("Key must be provided");

    const db = await this.dbPromise;
    const result = await db.run("DELETE FROM users WHERE key = ?", [key]);
    return result.changes > 0;
  }

  async getRawDataMap(): Promise<Record<string, any>> {
    const db = await this.dbPromise;
    const rows = await db.all("SELECT key, value FROM users");
    const dataMap: Record<string, any> = {};
    for (const row of rows) {
      dataMap[row.key] = JSON.parse(row.value);
    }
    return dataMap;
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    await db.run("DELETE FROM users");
  }

  async close(): Promise<void> {
    const db = await this.dbPromise;
    await db.close();
  }
}

export default SQLiteDatabase;