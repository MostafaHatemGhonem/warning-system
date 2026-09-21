import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function loginUser(email, password = "password123") {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  const setCookie = res.headers.get("set-cookie");
  let cookie = "";
  if (setCookie) {
    const match = setCookie.match(/session_token=([^;]+)/);
    if (match) {
      cookie = `session_token=${match[1]}`;
    }
  }
  return { status: res.status, data, cookie };
}

async function runSettingsTests() {
  console.log("=======================================================");
  console.log("=== SETTINGS PAGE & PROFILE / PASSWORD VERIFICATION ===");
  console.log("=======================================================\n");

  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;
  const membersCol = db.collection("members");
  const auditLogsCol = db.collection("auditlogs");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  // Setup a test member for settings
  console.log("--- 1. Persona Setup ---");
  const testEmail = "settings_tester@infinityexplorers.org";
  await membersCol.findOneAndUpdate(
    { email: testEmail },
    {
      $set: {
        name: "Settings Original Name",
        email: testEmail,
        passwordHash,
        role: "Member",
        isActive: true,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  const auth = await loginUser(testEmail, "password123");
  assert(auth.cookie.length > 0, "Member authenticated and session cookie obtained");

  // 2. Unauthenticated GET /api/auth/me
  console.log("\n--- 2. Authentication Protection ---");
  const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
  assert(unauthRes.status === 401, "Unauthenticated GET /api/auth/me returns 401");

  // 3. Authenticated GET /api/auth/me
  console.log("\n--- 3. Fetch Settings Profile ---");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: auth.cookie },
  });
  assert(meRes.status === 200, "Authenticated GET /api/auth/me returns 200 OK");
  const meData = await meRes.json();
  assert(meData.data.email === testEmail, "Profile data matches test member email");
  assert(meData.data.name === "Settings Original Name", "Profile data matches original name");

  // 4. Update Profile Name via PATCH /api/auth/me
  console.log("\n--- 4. Update Profile Details ---");
  const updateRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: auth.cookie,
    },
    body: JSON.stringify({
      name: "Settings Updated Name",
      avatar: "https://example.com/avatar.jpg",
    }),
  });
  assert(updateRes.status === 200, "PATCH /api/auth/me returns 200 OK");
  const updateData = await updateRes.json();
  assert(updateData.data.name === "Settings Updated Name", "Updated name confirmed in response");

  // Verify audit log recorded
  const auditLog = await auditLogsCol.findOne({
    action: "members.update",
    "resource.identifier": testEmail,
  }, { sort: { timestamp: -1 } });
  assert(auditLog !== null, "Audit log recorded for profile update");
  assert(auditLog.newState.name === "Settings Updated Name", "Audit log newState captures updated name");

  // 5. Password Update Testing
  console.log("\n--- 5. Password Update & Verification ---");
  
  // Test invalid current password
  const badPassRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: auth.cookie,
    },
    body: JSON.stringify({
      currentPassword: "wrongpassword!",
      newPassword: "NewSecretPassword123!",
    }),
  });
  assert(badPassRes.status === 400, "Invalid current password returns 400 Bad Request");

  // Test successful password update
  const goodPassRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: auth.cookie,
    },
    body: JSON.stringify({
      currentPassword: "password123",
      newPassword: "NewSecretPassword123!",
    }),
  });
  assert(goodPassRes.status === 200, "Valid password update returns 200 OK");

  // Verify login with new password
  const newLogin = await loginUser(testEmail, "NewSecretPassword123!");
  assert(newLogin.status === 200, "Login with NEW password succeeded (200 OK)");

  // Clean up test member
  await membersCol.deleteOne({ email: testEmail });

  console.log("\n=======================================================");
  console.log("=== ALL SETTINGS TESTS PASSED SUCCESSFULLY! ===");
  console.log("=======================================================");

  await mongoose.disconnect();
  process.exit(0);
}

runSettingsTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
