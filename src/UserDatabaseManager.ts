import SQLiteDatabase from "./SQLiteDatabase";
import { UserRecord, IUserRecord } from "./types";

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

export default UserDatabaseManager;