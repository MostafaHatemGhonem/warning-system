import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function setupTestData() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const membersCol = mongoose.connection.db.collection("members");

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("password123", salt);

  // Ensure Admin
  const adminRes = await membersCol.findOneAndUpdate(
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
    { upsert: true, returnDocument: "after" }
  );

  // Ensure Team Leader
  const leaderRes = await membersCol.findOneAndUpdate(
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
    { upsert: true, returnDocument: "after" }
  );

  // Ensure Member
  const memberRes = await membersCol.findOneAndUpdate(
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
    { upsert: true, returnDocument: "after" }
  );

  // Ensure a Target Member to test GET/PATCH/status against
  const targetRes = await membersCol.findOneAndUpdate(
    { email: "target.test@example.com" },
    {
      $set: {
        name: "Target Test Member",
        email: "target.test@example.com",
        role: "Member",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  const targetId = (targetRes?._id || targetRes?.value?._id).toString();

  await mongoose.disconnect();
  return { targetId };
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
  console.log("Setting up test accounts in MongoDB...");
  const { targetId } = await setupTestData();
  console.log(`Target Member ID: ${targetId}\n`);

  const results = [];

  function record(testName, expected, actual, passed) {
    results.push({ testName, expected, actual, status: passed ? "PASS" : "FAIL" });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${testName} -> Expected: ${expected}, Got: ${actual}`);
  }

  // ── 1. Unauthenticated (No Login) ─────────────────────────────────────────
  console.log("--- 1. Testing Unauthenticated Access (Expected: 401) ---");

  const unauthGet = await fetch(`${BASE_URL}/api/members`);
  record("Unauth GET /api/members", 401, unauthGet.status, unauthGet.status === 401);

  const unauthPost = await fetch(`${BASE_URL}/api/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "X", email: "x@example.com" })
  });
  record("Unauth POST /api/members", 401, unauthPost.status, unauthPost.status === 401);

  const unauthGetOne = await fetch(`${BASE_URL}/api/members/${targetId}`);
  record("Unauth GET /api/members/:id", 401, unauthGetOne.status, unauthGetOne.status === 401);

  const unauthPatch = await fetch(`${BASE_URL}/api/members/${targetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Updated Name" })
  });
  record("Unauth PATCH /api/members/:id", 401, unauthPatch.status, unauthPatch.status === 401);

  const unauthStatus = await fetch(`${BASE_URL}/api/members/${targetId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive: false })
  });
  record("Unauth PATCH /api/members/:id/status", 401, unauthStatus.status, unauthStatus.status === 401);

  // ── 2. Member Role ────────────────────────────────────────────────────────
  console.log("\n--- 2. Testing Member Role ---");
  const memberAuth = await login("member@example.com", "password123");

  const mGet = await fetch(`${BASE_URL}/api/members`, {
    headers: { Cookie: memberAuth.cookie }
  });
  record("Member GET /api/members", 200, mGet.status, mGet.status === 200);

  const mPost = await fetch(`${BASE_URL}/api/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberAuth.cookie },
    body: JSON.stringify({ name: "Forbidden Member", email: "forb@example.com" })
  });
  record("Member POST /api/members", 403, mPost.status, mPost.status === 403);

  const mGetOne = await fetch(`${BASE_URL}/api/members/${targetId}`, {
    headers: { Cookie: memberAuth.cookie }
  });
  record("Member GET /api/members/:id", 200, mGetOne.status, mGetOne.status === 200);

  const mPatch = await fetch(`${BASE_URL}/api/members/${targetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: memberAuth.cookie },
    body: JSON.stringify({ name: "Member Update Attempt" })
  });
  record("Member PATCH /api/members/:id", 403, mPatch.status, mPatch.status === 403);

  const mStatus = await fetch(`${BASE_URL}/api/members/${targetId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: memberAuth.cookie },
    body: JSON.stringify({ isActive: false })
  });
  record("Member PATCH /api/members/:id/status", 403, mStatus.status, mStatus.status === 403);

  // ── 3. Team Leader Role ───────────────────────────────────────────────────
  console.log("\n--- 3. Testing Team Leader Role ---");
  const leaderAuth = await login("leader@example.com", "password123");

  const lGet = await fetch(`${BASE_URL}/api/members`, {
    headers: { Cookie: leaderAuth.cookie }
  });
  record("Team Leader GET /api/members", 200, lGet.status, lGet.status === 200);

  const randEmail = `tl_created_${Date.now()}@example.com`;
  const lPost = await fetch(`${BASE_URL}/api/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({ name: "TL Created Member", email: randEmail, role: "Member" })
  });
  record("Team Leader POST /api/members", 201, lPost.status, lPost.status === 201);

  const lGetOne = await fetch(`${BASE_URL}/api/members/${targetId}`, {
    headers: { Cookie: leaderAuth.cookie }
  });
  record("Team Leader GET /api/members/:id", 200, lGetOne.status, lGetOne.status === 200);

  const lPatch = await fetch(`${BASE_URL}/api/members/${targetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({ name: "TL Updated Name", email: "target.test@example.com" })
  });
  record("Team Leader PATCH /api/members/:id", 200, lPatch.status, lPatch.status === 200);

  const lStatus = await fetch(`${BASE_URL}/api/members/${targetId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({ isActive: false })
  });
  record("Team Leader PATCH /api/members/:id/status", 403, lStatus.status, lStatus.status === 403);

  // ── 4. Admin Role ─────────────────────────────────────────────────────────
  console.log("\n--- 4. Testing Admin Role ---");
  const adminAuth = await login("admin@example.com", "password123");

  const aGet = await fetch(`${BASE_URL}/api/members`, {
    headers: { Cookie: adminAuth.cookie }
  });
  record("Admin GET /api/members", 200, aGet.status, aGet.status === 200);

  const randAdminEmail = `admin_created_${Date.now()}@example.com`;
  const aPost = await fetch(`${BASE_URL}/api/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ name: "Admin Created Member", email: randAdminEmail, role: "Member" })
  });
  record("Admin POST /api/members", 201, aPost.status, aPost.status === 201);

  const aGetOne = await fetch(`${BASE_URL}/api/members/${targetId}`, {
    headers: { Cookie: adminAuth.cookie }
  });
  record("Admin GET /api/members/:id", 200, aGetOne.status, aGetOne.status === 200);

  const aPatch = await fetch(`${BASE_URL}/api/members/${targetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ name: "Admin Updated Name", email: "target.test@example.com" })
  });
  record("Admin PATCH /api/members/:id", 200, aPatch.status, aPatch.status === 200);

  const aStatus = await fetch(`${BASE_URL}/api/members/${targetId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ isActive: false })
  });
  record("Admin PATCH /api/members/:id/status (deactivate)", 200, aStatus.status, aStatus.status === 200);

  // Reactivate target member back
  await fetch(`${BASE_URL}/api/members/${targetId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ isActive: true })
  });

  console.log("\n=================================");
  console.log("       STEP 8C TEST SUMMARY      ");
  console.log("=================================");
  const allPassed = results.every(r => r.status === "PASS");
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.status === "PASS").length}`);
  console.log(`Failed: ${results.filter(r => r.status === "FAIL").length}`);
  console.log(`Overall Result: ${allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
}

runTests().catch(console.error);
