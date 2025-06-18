import fs from "fs/promises";
import DatabaseFactory from "./DatabaseFactory";
import SQLiteDatabase from "./SQLiteDatabase";
import UserDatabaseManager from "./UserDatabaseManager";
import { IUserRecord, UserRecord } from "./types";

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
export { IUserRecord, UserRecord };
export { DatabaseFactory };
export { SQLiteDatabase, UserDatabaseManager };
