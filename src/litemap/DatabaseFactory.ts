import UserDatabaseManager from "./DatabaseManager/UserDatabaseManager";

class DatabaseFactory {
  // Map to store database managers by filename
  private static instances: Map<string, UserDatabaseManager> = new Map();

  static Instance(filename: string = "./db/litemap.db"): UserDatabaseManager {
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

export default DatabaseFactory;