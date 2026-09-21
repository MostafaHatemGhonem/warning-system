import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;
  const myEmail = "mostafahatemghonem@gmail.com";

  // 1. Members
  const user = await db.collection("members").findOne({ email: myEmail });
  if (!user) {
    console.error(`ERROR: Your account (${myEmail}) was not found in database!`);
    process.exit(1);
  }
  console.log(`Found your account: ${user.name} (${user.email}), Role: ${user.role}`);

  // Delete all members except your account
  const deleteMembersResult = await db.collection("members").deleteMany({
    email: { $ne: myEmail },
  });
  console.log(`Deleted ${deleteMembersResult.deletedCount} other member(s).`);

  // Ensure your account is Super Admin and Active
  await db.collection("members").updateOne(
    { email: myEmail },
    {
      $set: {
        role: "Super Admin",
        isActive: true,
        updatedAt: new Date(),
      },
    }
  );
  console.log(`Confirmed ${myEmail} is Super Admin and Active.`);

  // 2. Projects
  const deleteProjectsResult = await db.collection("projects").deleteMany({});
  console.log(`Deleted ${deleteProjectsResult.deletedCount} project(s).`);

  // 3. Tasks
  const deleteTasksResult = await db.collection("tasks").deleteMany({});
  console.log(`Deleted ${deleteTasksResult.deletedCount} task(s).`);

  // 4. Warnings
  const deleteWarningsResult = await db.collection("warnings").deleteMany({});
  console.log(`Deleted ${deleteWarningsResult.deletedCount} warning(s).`);

  console.log("\n=== Database Cleaned Successfully! ===");
  console.log(`Only your account (${myEmail}) remains in the system with full Super Admin privileges.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
