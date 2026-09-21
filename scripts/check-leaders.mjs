import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;

  const projects = await db.collection("projects").find({}).toArray();
  console.log("Projects in DB:", projects.map(p => ({ _id: p._id.toString(), name: p.name, lead: p.lead, leadId: p.leadId })));

  const eligibleRoles = ["Super Admin", "Admin", "Team Leader"];
  const members = await db.collection("members").find({
    role: { $in: eligibleRoles },
    isActive: { $ne: false },
  }).toArray();

  console.log("Eligible Leaders in DB:", members.map(m => ({ _id: m._id.toString(), name: m.name, role: m.role, email: m.email })));

  await mongoose.disconnect();
}

main().catch(console.error);
