import { Database } from "sqlite3";
import { open } from "sqlite";
import fs from "fs/promises";

interface UserRecord {
  key: string;
  value: any;
}

// Interface for user records
interface IUserRecord {
  name: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

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

  async batchSet(records: UserRecord[]): Promise<void> {
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

class UserDatabaseManager {
  private db: SQLiteDatabase;
  private readonly USER_NAMESPACE: string = "users/";

  constructor(filename: string = "./db/database.db") {
    this.db = new SQLiteDatabase(filename);
  }

  private withNamespace(key: string): string {
    return `${this.USER_NAMESPACE}${key}`;
  }

  async addUsers(data: Record<string, any> | UserRecord[]): Promise<void> {
    if (Array.isArray(data)) {
      const namespacedRecords = data.map(({ key, value }) => ({
        key: this.withNamespace(key),
        value,
      }));
      await this.db.batchSet(namespacedRecords);
    } else {
      const records = Object.entries(data).map(([key, value]) => ({
        key: this.withNamespace(key),
        value,
      }));
      await this.db.batchSet(records);
    }
  }

  async updateUser(key: string, value: any): Promise<void> {
    await this.db.append(this.withNamespace(key), value);
  }

  async getUser(key: string): Promise<IUserRecord> {
    return await this.db.get(this.withNamespace(key));
  }

  async getAllUserKeys(): Promise<string[]> {
    const keys = await this.db.getAllKeys(this.USER_NAMESPACE);
    return keys.map((key) => key.replace(this.USER_NAMESPACE, ""));
  }

  async getRawDataMap(): Promise<Record<string, IUserRecord>> {
    const rawData = await this.db.getRawDataMap();
    const userMap: Record<string, IUserRecord> = {};
    for (const key in rawData) {
      if (key.startsWith(this.USER_NAMESPACE)) {
        const userKey = key.replace(this.USER_NAMESPACE, "");
        userMap[userKey] = rawData[key];
      }
    }
    return userMap;
  }

  async deleteUser(key: string): Promise<boolean> {
    return await this.db.delete(this.withNamespace(key));
  }

  async clearUsers(): Promise<void> {
    await this.db.clear();
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

class DatabaseFactory {
  // Map to store database managers by filename
  private static instances: Map<string, UserDatabaseManager> = new Map();

  static Instance(filename: string = "./db/database.db"): UserDatabaseManager {
    if (!filename) {
      throw new Error("Database filename must be provided");
    }
    if (!DatabaseFactory.instances.has(filename)) {
      DatabaseFactory.instances.set(
        filename,
        new UserDatabaseManager(filename)
      );
    }
    return DatabaseFactory.instances.get(filename)!;
  }

  // Optional: Method to close all database instances
  static async closeAll(): Promise<void> {
    const closePromises = Array.from(DatabaseFactory.instances.values()).map(
      (manager) => manager.close()
    );
    await Promise.all(closePromises);
    DatabaseFactory.instances.clear();
  }
}

/* 
// Example usage with multiple databases
async function main() {
  try {
    // Ensure the db directory exists
    await fs.mkdir("./db", { recursive: true });

    // Create multiple database instances
    const dbManagers = [
      DatabaseFactory.Instance("./db/litemap.db"),
      DatabaseFactory.Instance("./db/testmap.db"),
      DatabaseFactory.Instance("./db/anothermap.db"),
    ];

    // Sample user data
    const sampleUsers = {
      user1: {
        name: "Alice",
        role: "admin",
        createdAt: new Date().toISOString(),
      },
      user2: {
        name: "Bob",
        role: "editor",
        createdAt: new Date().toISOString(),
      },
    };

    // Add users to each database and perform operations
    for (const dbManager of dbManagers) {
      // Add sample users
      await dbManager.addUsers(sampleUsers);
      console.log(`Added users to ${dbManager.constructor.name}:`, Object.keys(sampleUsers));

      // Update user1's lastLogin
      await dbManager.updateUser("user1", {
        lastLogin: new Date().toISOString(),
      });
      console.log(`Updated user1 in ${dbManager.constructor.name}`);

      // Get all user keys
      const userKeys = await dbManager.getAllUserKeys();
      console.log(`All user keys in ${dbManager.constructor.name}:`, userKeys);

      // Get and log user details
      const users = [
        await dbManager.getUser("user1"),
        await dbManager.getUser("user2"),
      ];
      for (const user of users) {
        if (user) {
          console.log(`User ${user.name} has role: ${user.role} in ${dbManager.constructor.name}`);
        }
      }

      // Try to delete a non-existent user
      const deleted = await dbManager.deleteUser("user3");
      console.log(`Deleted user3 in ${dbManager.constructor.name}:`, deleted);
    }

    // Close all databases
    await DatabaseFactory.closeAll();
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
*/

module.exports = {
  DatabaseFactory,
  SQLiteDatabase,
  UserDatabaseManager,
};
export { IUserRecord, UserRecord }; // Exporting interfaces for external use
export { DatabaseFactory }; // Default export for easy access
export { SQLiteDatabase, UserDatabaseManager }; // Named exports for specific classes
