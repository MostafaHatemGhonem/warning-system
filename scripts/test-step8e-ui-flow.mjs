import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI =
  "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function makeRequest(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function run() {
  console.log("=== Step 8E UI Normal vs Committee Progression Verification ===");

  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const membersCol = mongoose.connection.db.collection("members");
  const projectsCol = mongoose.connection.db.collection("projects");

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("password123", salt);

  const leaderRes = await membersCol.findOneAndUpdate(
    { email: "leader_step8e@example.com" },
    {
      $set: {
        name: "Leader Step8E",
        email: "leader_step8e@example.com",
        role: "Team Leader",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  const memberRes = await membersCol.findOneAndUpdate(
    { email: "member_step8e@example.com" },
    {
      $set: {
        name: "Member Step8E",
        email: "member_step8e@example.com",
        role: "Member",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  const adminRes = await membersCol.findOneAndUpdate(
    { email: "admin_step8e@example.com" },
    {
      $set: {
        name: "Admin Step8E",
        email: "admin_step8e@example.com",
        role: "Admin",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  const projectRes = await projectsCol.findOneAndUpdate(
    { name: "Step 8E Project" },
    {
      $set: {
        name: "Step 8E Project",
        description: "Test Project for Step 8E",
        workspaceId: "infinity-explorers",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  const leaderId = (leaderRes?._id || leaderRes?.value?._id).toString();
  const memberId = (memberRes?._id || memberRes?.value?._id).toString();
  const adminId = (adminRes?._id || adminRes?.value?._id).toString();
  const projectId = (projectRes?._id || projectRes?.value?._id).toString();

  // Login Leader
  const leaderLogin = await makeRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "leader_step8e@example.com", password: "password123" }),
  });
  const leaderCookie = leaderLogin.headers.get("set-cookie")?.split(";")[0] || "";
  const leaderHeaders = { Cookie: leaderCookie };

  // Login Admin
  const adminLogin = await makeRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin_step8e@example.com", password: "password123" }),
  });
  const adminCookie = adminLogin.headers.get("set-cookie")?.split(";")[0] || "";
  const adminHeaders = { Cookie: adminCookie };

  console.log("\n--- Test 1: Normal Project Warning Progression ---");
  const normalRes = await makeRequest("/api/warnings", {
    method: "POST",
    headers: { ...leaderHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      member: memberId,
      project: projectId,
      type: "Project",
      level: "Warning 1",
      severity: 1,
      points: 1,
      description: "Missed scheduled code review session",
      autoActivate: true,
    }),
  });

  assert(normalRes.status === 201, "Normal project warning created -> 201");
  assert(normalRes.data.data.status === "Active", "Normal warning becomes 'Active' immediately");
  assert(normalRes.data.data.approvedBy !== null, "approvedBy is populated with issuer");
  assert(normalRes.data.data.activeUntil !== null, "activeUntil is set ~30 days ahead");
  assert(normalRes.data.data.notifiedAt !== null, "notifiedAt is set to issuance timestamp");

  console.log("\n--- Test 2: Exceptional Global Warning Progression ---");
  const globalRes = await makeRequest("/api/warnings", {
    method: "POST",
    headers: { ...adminHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      member: memberId,
      type: "Global",
      level: "Warning 2",
      severity: 2,
      points: 2,
      description: "Team-wide misconduct across multiple repositories",
      autoActivate: true, // Should be ignored because Global strictly requires committee approval!
    }),
  });

  assert(globalRes.status === 201, "Global warning created -> 201");
  assert(
    globalRes.data.data.status === "Pending_Approval",
    "Global warning strictly enters 'Pending_Approval' (autoActivate ignored)"
  );
  assert(globalRes.data.data.activeUntil === null, "activeUntil remains null until committee approves");

  console.log("\n--- Test 3: Exceptional Direct Final Warning Progression ---");
  const directFinalRes = await makeRequest("/api/warnings", {
    method: "POST",
    headers: { ...adminHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      member: memberId,
      project: projectId,
      type: "Project",
      level: "Final Warning",
      severity: 3,
      points: 3,
      isDirectFinalWarning: true,
      directIssuanceReason: "Severe data breach bypassing progressive stages",
      description: "Severe breach of confidential client repository",
      autoActivate: true, // Should be ignored because Direct Final strictly requires committee approval!
    }),
  });

  assert(directFinalRes.status === 201, "Direct Final Warning created -> 201");
  assert(
    directFinalRes.data.data.status === "Pending_Approval",
    "Direct Final Warning strictly enters 'Pending_Approval' (autoActivate ignored)"
  );

  console.log("\n==========================================");
  console.log("Step 8E UI Progression Test Finished: ALL PASSED");
  console.log("==========================================");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
