import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function setupTestData() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const membersCol = mongoose.connection.db.collection("members");
  const projectsCol = mongoose.connection.db.collection("projects");

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("password123", salt);

  // Ensure Admin
  await membersCol.updateOne(
    { email: "admin@example.com" },
    {
      $set: {
        name: "Admin User",
        email: "admin@example.com",
        role: "Admin",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  // Ensure Team Leader
  await membersCol.updateOne(
    { email: "leader@example.com" },
    {
      $set: {
        name: "Team Leader User",
        email: "leader@example.com",
        role: "Team Leader",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  // Ensure Member
  await membersCol.updateOne(
    { email: "member@example.com" },
    {
      $set: {
        name: "Standard Member",
        email: "member@example.com",
        role: "Member",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  // Ensure a test project exists
  let project = await projectsCol.findOne({ title: "Test Tasks Project" });
  if (!project) {
    const res = await projectsCol.insertOne({
      title: "Test Tasks Project",
      description: "Project for testing tasks RBAC",
      status: "in-progress",
      progress: 0,
      teamMembers: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    project = { _id: res.insertedId };
  }

  await mongoose.disconnect();
  return project._id.toString();
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const cookieHeader = res.headers.get("set-cookie");
  let cookie = "";
  if (cookieHeader) {
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match) {
      cookie = `session_token=${match[1]}`;
    }
  }
  return { status: res.status, cookie };
}

async function runTests() {
  console.log("Setting up test accounts and project in MongoDB...");
  const projectId = await setupTestData();
  console.log(`Test project ID: ${projectId}\n`);

  const results = [];

  function record(testName, expected, actual, passed) {
    results.push({ testName, expected, actual, status: passed ? "PASS" : "FAIL" });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${testName} -> Expected: ${expected}, Got: ${actual}`);
  }

  // ── 1. Unauthenticated (No Login) ─────────────────────────────────────────
  console.log("--- 1. Testing Unauthenticated Access (Expected: 401) ---");

  const unauthGet = await fetch(`${BASE_URL}/api/tasks?projectId=${projectId}`);
  record("Unauthenticated GET /api/tasks", 401, unauthGet.status, unauthGet.status === 401);

  const unauthPost = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, title: "Unauth Task" })
  });
  record("Unauthenticated POST /api/tasks", 401, unauthPost.status, unauthPost.status === 401);

  const fakeTaskId = new mongoose.Types.ObjectId().toString();

  const unauthPatch = await fetch(`${BASE_URL}/api/tasks/${fakeTaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Updated" })
  });
  record("Unauthenticated PATCH /api/tasks/:id", 401, unauthPatch.status, unauthPatch.status === 401);

  const unauthDelete = await fetch(`${BASE_URL}/api/tasks/${fakeTaskId}`, {
    method: "DELETE"
  });
  record("Unauthenticated DELETE /api/tasks/:id", 401, unauthDelete.status, unauthDelete.status === 401);

  // ── 2. Member Role ────────────────────────────────────────────────────────
  console.log("\n--- 2. Testing Member Role (Expected: GET/POST/PATCH 200/201, DELETE 403) ---");
  const memberAuth = await login("member@example.com", "password123");

  const memberGet = await fetch(`${BASE_URL}/api/tasks?projectId=${projectId}`, {
    headers: { Cookie: memberAuth.cookie }
  });
  record("Member GET /api/tasks", 200, memberGet.status, memberGet.status === 200);

  const memberPost = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberAuth.cookie },
    body: JSON.stringify({ projectId, title: "Member Created Task" })
  });
  const memberTask = await memberPost.json();
  record("Member POST /api/tasks", 201, memberPost.status, memberPost.status === 201);

  const memberTaskId = memberTask._id;

  const memberPatch = await fetch(`${BASE_URL}/api/tasks/${memberTaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: memberAuth.cookie },
    body: JSON.stringify({ title: "Member Updated Task Title" })
  });
  record("Member PATCH /api/tasks/:id", 200, memberPatch.status, memberPatch.status === 200);

  const memberDelete = await fetch(`${BASE_URL}/api/tasks/${memberTaskId}`, {
    method: "DELETE",
    headers: { Cookie: memberAuth.cookie }
  });
  record("Member DELETE /api/tasks/:id", 403, memberDelete.status, memberDelete.status === 403);

  // ── 3. Team Leader Role ───────────────────────────────────────────────────
  console.log("\n--- 3. Testing Team Leader Role (Expected: All Allowed) ---");
  const leaderAuth = await login("leader@example.com", "password123");

  const leaderGet = await fetch(`${BASE_URL}/api/tasks?projectId=${projectId}`, {
    headers: { Cookie: leaderAuth.cookie }
  });
  record("Team Leader GET /api/tasks", 200, leaderGet.status, leaderGet.status === 200);

  const leaderPost = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({ projectId, title: "Leader Created Task" })
  });
  const leaderTask = await leaderPost.json();
  record("Team Leader POST /api/tasks", 201, leaderPost.status, leaderPost.status === 201);

  const leaderTaskId = leaderTask._id;

  const leaderPatch = await fetch(`${BASE_URL}/api/tasks/${leaderTaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({ title: "Leader Updated Task Title" })
  });
  record("Team Leader PATCH /api/tasks/:id", 200, leaderPatch.status, leaderPatch.status === 200);

  const leaderDelete = await fetch(`${BASE_URL}/api/tasks/${leaderTaskId}`, {
    method: "DELETE",
    headers: { Cookie: leaderAuth.cookie }
  });
  record("Team Leader DELETE /api/tasks/:id", 200, leaderDelete.status, leaderDelete.status === 200);

  // ── 4. Admin Role ─────────────────────────────────────────────────────────
  console.log("\n--- 4. Testing Admin Role (Expected: All Allowed) ---");
  const adminAuth = await login("mostafahatemghonem@gmail.com", "password123");

  const adminGet = await fetch(`${BASE_URL}/api/tasks?projectId=${projectId}`, {
    headers: { Cookie: adminAuth.cookie }
  });
  record("Admin GET /api/tasks", 200, adminGet.status, adminGet.status === 200);

  const adminPost = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ projectId, title: "Admin Created Task" })
  });
  const adminTask = await adminPost.json();
  record("Admin POST /api/tasks", 201, adminPost.status, adminPost.status === 201);

  const adminTaskId = adminTask._id;

  const adminPatch = await fetch(`${BASE_URL}/api/tasks/${adminTaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ title: "Admin Updated Task Title" })
  });
  record("Admin PATCH /api/tasks/:id", 200, adminPatch.status, adminPatch.status === 200);

  const adminDelete = await fetch(`${BASE_URL}/api/tasks/${adminTaskId}`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookie }
  });
  record("Admin DELETE /api/tasks/:id", 200, adminDelete.status, adminDelete.status === 200);

  // Clean up member task using admin
  await fetch(`${BASE_URL}/api/tasks/${memberTaskId}`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookie }
  });

  console.log("\n=================================");
  console.log("       STEP 8B TEST SUMMARY      ");
  console.log("=================================");
  const allPassed = results.every(r => r.status === "PASS");
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.status === "PASS").length}`);
  console.log(`Failed: ${results.filter(r => r.status === "FAIL").length}`);
  console.log(`Overall Result: ${allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
}

runTests().catch(console.error);
