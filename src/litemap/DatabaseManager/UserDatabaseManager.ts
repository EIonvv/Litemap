import SQLiteDatabase from "../SQLitedb/SQLiteDatabase";
import { UserRecord, IUserRecord } from "../type/types";

class DatabaseQueue {
  private queue: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }>;
  private isProcessing: boolean;

  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  enqueue(operation: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { operation, resolve, reject } = this.queue.shift()!;

    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }
}

class UserDatabaseManager {
  private db: SQLiteDatabase;
  private queue: DatabaseQueue;
  private readonly USER_NAMESPACE: string = "users/";
  private readonly ITEM_NAMESPACE: string = "items/";

  constructor(filename: string = "./db/database.db") {
    this.db = new SQLiteDatabase(filename);
    this.queue = new DatabaseQueue();
  }

  private withItemNamespace(key: string): string {
    return `${this.ITEM_NAMESPACE}${key}`;
  }

  private withUserNamespace(key: string): string {
    return `${this.USER_NAMESPACE}${key}`;
  }

  async addItems(data: Record<string, any> | UserRecord[]): Promise<void> {
    return this.queue.enqueue(async () => {
      if (Array.isArray(data)) {
        const namespacedRecords = data.map(({ key, value }) => ({
          key: this.withItemNamespace(key),
          value,
        }));
        await this.db.batchSetItems(namespacedRecords);
      } else {
        const records = Object.entries(data).map(([key, value]) => ({
          key: this.withItemNamespace(key),
          value,
        }));
        await this.db.batchSetItems(records);
      }
    });
  }

  async addUsers(data: Record<string, any> | UserRecord[]): Promise<void> {
    return this.queue.enqueue(async () => {
      if (Array.isArray(data)) {
        const namespacedRecords = data.map(({ key, value }) => ({
          key: this.withUserNamespace(key),
          value,
        }));
        await this.db.batchSetUsers(namespacedRecords);
      } else {
        const records = Object.entries(data).map(([key, value]) => ({
          key: this.withUserNamespace(key),
          value,
        }));
        await this.db.batchSetUsers(records);
      }
    });
  }

  async updateUser(key: string, value: any): Promise<void> {
    return this.queue.enqueue(async () => {
      await this.db.append(this.withUserNamespace(key), value);
    });
  }

  async getUser(key: string): Promise<IUserRecord> {
    return this.queue.enqueue(async () => {
      return await this.db.get(this.withUserNamespace(key));
    });
  }

  async getAllUserKeys(): Promise<string[]> {
    return this.queue.enqueue(async () => {
      const keys = await this.db.getAllKeys(this.USER_NAMESPACE);
      return keys.map((key) => key.replace(this.USER_NAMESPACE, ""));
    });
  }

  async getRawDataMap(): Promise<Record<string, IUserRecord>> {
    return this.queue.enqueue(async () => {
      const rawData = await this.db.getRawDataMap();
      const userMap: Record<string, IUserRecord> = {};
      for (const key in rawData) {
        if (key.startsWith(this.USER_NAMESPACE)) {
          const userKey = key.replace(this.USER_NAMESPACE, "");
          userMap[userKey] = rawData[key];
        }
      }
      return userMap;
    });
  }

  async deleteUser(key: string): Promise<boolean> {
    return this.queue.enqueue(async () => {
      return await this.db.delete(this.withUserNamespace(key));
    });
  }

  async clearUsers(): Promise<void> {
    return this.queue.enqueue(async () => {
      await this.db.clear();
    });
  }

  async close(): Promise<void> {
    return this.queue.enqueue(async () => {
      await this.db.close();
    });
  }
}

export default UserDatabaseManager;