# Litemap

A lightweight, persistent key-value database for Node.js, designed for simple user and item storage with SQLite as the backend. Litemap provides an easy-to-use API for managing users, items, and other records, making it ideal for bots, and other various apps.

## Usage
```js
const { DatabaseFactory } = require("litemap");
const fs = require("fs/promises");

(async () => {
  await fs.mkdir("./db", { recursive: true });
  const dbManager = DatabaseFactory.Instance("./db/litemap.db");

  if (!(await dbManager.getUser("user1"))) {
    await dbManager.addUsers([
      {
        key: "user1",
        value: {
          name: "Mad Hatter",
          role: "superadmin",
          email: "test@example.com",
          createdAt: new Date().toISOString(),
          lastLogin: null,
        },
      },
    ]);
  } else {
    console.log("user1 already exists, skipping creation.");
    if (
      (await dbManager.getUser("user1").lastLogin) !== new Date().toISOString()
    ) {
      await dbManager.updateUser("user1", {
        lastLogin: new Date().toISOString(),
      });
      console.log("Updated last login for user1.");
    }
    dbManager.getUser("user1").then((user) => {
      console.log("Current user1 data:", user);
    });
  }
})();
```

## Exports

```js
const { DatabaseFactory, SQLiteDatabase, UserDatabaseManager } = require("litemap");
```

## Types

You can import types for TypeScript:

```ts
import type { IUserRecord, UserRecord } from "litemap";
```