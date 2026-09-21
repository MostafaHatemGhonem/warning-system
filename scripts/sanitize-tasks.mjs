import mongoose from "mongoose";

const URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function sanitize() {
  await mongoose.connect(URI, { dbName: "infinity_explorers" });
  const res = await mongoose.connection.db.collection("tasks").updateMany(
    { assignedTo: { $type: "string" } },
    { $set: { assignedTo: null } }
  );
  console.log("Sanitized tasks:", res.modifiedCount);
  await mongoose.disconnect();
  process.exit(0);
}

sanitize();
