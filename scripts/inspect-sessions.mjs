import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function inspectSessions() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;

  const sampleSession = await db.collection("sessions").findOne({});
  console.log("Sample session:", sampleSession);

  const superAdminId = new mongoose.Types.ObjectId("6aad967866f1da3b853bb06b");
  const superSessions = await db.collection("sessions").find({
    $or: [
      { memberId: superAdminId },
      { memberId: "6aad967866f1da3b853bb06b" },
      { userId: superAdminId },
      { userId: "6aad967866f1da3b853bb06b" },
    ]
  }).toArray();

  console.log(`Sessions belonging to Super Admin (${superAdminId}):`, superSessions.length);

  await mongoose.disconnect();
}

inspectSessions().catch(console.error);
