import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function cleanDatabase() {
  console.log("=== Starting Database Cleanup (Preserving Super Admin) ===");
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;

  // 1. Locate the Super Admin
  const superAdmin = await db.collection("members").findOne({ role: "Super Admin" });
  if (!superAdmin) {
    console.error("FATAL: No Super Admin found in members collection! Aborting cleanup to prevent complete data loss.");
    process.exit(1);
  }

  console.log(`Preserving Super Admin: ${superAdmin.name} (${superAdmin.email}) [ID: ${superAdmin._id}]`);

  // 2. Delete non-super-admin members
  const membersResult = await db.collection("members").deleteMany({ _id: { $ne: superAdmin._id } });
  console.log(`Deleted ${membersResult.deletedCount} non-super-admin members.`);

  // 3. Delete non-super-admin sessions (so Super Admin session stays active)
  const sessionsResult = await db.collection("sessions").deleteMany({ memberId: { $ne: superAdmin._id } });
  console.log(`Deleted ${sessionsResult.deletedCount} non-super-admin sessions.`);

  // 4. Delete all projects
  const projectsResult = await db.collection("projects").deleteMany({});
  console.log(`Deleted ${projectsResult.deletedCount} projects.`);

  // 5. Delete all tasks
  const tasksResult = await db.collection("tasks").deleteMany({});
  console.log(`Deleted ${tasksResult.deletedCount} tasks.`);

  // 6. Delete all warnings
  const warningsResult = await db.collection("warnings").deleteMany({});
  console.log(`Deleted ${warningsResult.deletedCount} warnings.`);

  // 7. Delete all committees
  const committeesResult = await db.collection("committees").deleteMany({});
  console.log(`Deleted ${committeesResult.deletedCount} committees.`);

  // 8. Reset auditlogs and insert a clean initial baseline
  const auditResult = await db.collection("auditlogs").deleteMany({});
  console.log(`Cleared ${auditResult.deletedCount} old audit logs.`);

  // Insert initial baseline audit entry
  await db.collection("auditlogs").insertOne({
    requestId: "clean-db-init-" + Date.now(),
    actor: {
      id: superAdmin._id.toString(),
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role,
    },
    action: "members.login",
    resource: {
      type: "Member",
      id: superAdmin._id.toString(),
      identifier: superAdmin.email,
    },
    previousState: null,
    newState: {
      id: superAdmin._id.toString(),
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role,
      status: "ACTIVE_SUPER_ADMIN",
    },
    decisionReason: "System cleaned and reset to fresh baseline. Preserved Super Admin account.",
    authorizationResult: "SUPER_ADMIN_OVERRIDE",
    timestamp: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("Created fresh baseline audit record.");

  // 9. Verify final collection counts
  console.log("\n=== Final Database Verification ===");
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`- ${col.name}: ${count} document(s)`);
  }

  const remainingMembers = await db.collection("members").find({}).toArray();
  console.log("\nRemaining member(s):");
  remainingMembers.forEach((m) => {
    console.log(`- ${m.name} (${m.email}) [Role: ${m.role}]`);
  });

  await mongoose.disconnect();
  console.log("\n=== Database Cleanup Successfully Completed ===");
}

cleanDatabase().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
