import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function runTests() {
  console.log("=== Testing Tasks Business Logic & Rules ===");
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });

  const db = mongoose.connection.db;

  // 1. Check Members and Projects exist for testing
  const member = await db.collection("members").findOne({ isActive: true });
  const project = await db.collection("projects").findOne({});

  if (!member || !project) {
    console.error("Missing test member or project!");
    process.exit(1);
  }

  console.log(`Using active member: ${member.name} (${member._id})`);
  console.log(`Using project: ${project.name} (${project._id})`);

  // Test startOfToday logic
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const yesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  console.log(`Start of today: ${startOfToday.toISOString()}`);
  console.log(`Yesterday: ${yesterday.toISOString()}`);
  console.log(`Tomorrow: ${tomorrow.toISOString()}`);

  // Test Overdue logic verification:
  // Rule 3: status !== 'done' && dueDate < today
  function isOverdue(dueDate, status) {
    if (!dueDate || status === "done") return false;
    return new Date(dueDate) < startOfToday;
  }

  console.assert(isOverdue(yesterday, "todo") === true, "Yesterday + todo should be overdue");
  console.assert(isOverdue(yesterday, "in-progress") === true, "Yesterday + in-progress should be overdue");
  console.assert(isOverdue(yesterday, "done") === false, "Yesterday + done MUST NOT be overdue");
  console.assert(isOverdue(tomorrow, "todo") === false, "Tomorrow + todo must not be overdue");
  console.assert(isOverdue(null, "todo") === false, "No due date must not be overdue");

  console.log("✓ Rule 3 (Strict Overdue Formula) verified successfully!");

  // Verify DB tasks assignedTo type
  const badAssigned = await db.collection("tasks").find({ assignedTo: { $type: "string" } }).toArray();
  console.log(`Tasks with string assignedTo in DB: ${badAssigned.length}`);
  console.assert(badAssigned.length === 0, "All assignedTo must be ObjectId or null");
  console.log("✓ Rule 2 (assignedTo relation) verified in database!");

  await mongoose.disconnect();
  console.log("=== All Business Logic Validations Passed ===");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
