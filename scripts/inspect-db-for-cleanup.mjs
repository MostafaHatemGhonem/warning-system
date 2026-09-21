import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function inspect() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log("=== Collections and Counts ===");
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`${col.name}: ${count} documents`);
  }

  console.log("\n=== Super Admins in members collection ===");
  const superUsers = await db.collection("members").find({ role: "Super Admin" }).toArray();
  for (const su of superUsers) {
    console.log(`- ID: ${su._id}, Name: ${su.name}, Email: ${su.email}, Role: ${su.role}`);
  }

  console.log("\n=== All Members ===");
  const allMembers = await db.collection("members").find({}).toArray();
  for (const m of allMembers) {
    console.log(`- ID: ${m._id}, Name: ${m.name}, Email: ${m.email}, Role: ${m.role}`);
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);
