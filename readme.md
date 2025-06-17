# Litemap


## Usage
```js
const { DatabaseFactory } = require("litemap");
const fs = require("fs/promises");

// if you want to update the user.name, role, or email, you can do so at the main.d.ts of litemap 
// node_modules/litemap/build/main.d.ts => IUserRecord

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