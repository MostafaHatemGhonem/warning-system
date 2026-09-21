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

async function runTests() {
  console.log("=======================================================");
  console.log("=== ADMIN DASHBOARD HUB & API VERIFICATION ===");
  console.log("=======================================================\n");

  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;
  const membersCol = db.collection("members");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  // 1. Setup personas
  console.log("--- 1. Persona Setup & Sessions ---");
  const superAdmin = await membersCol.findOneAndUpdate(
    { role: "Super Admin" },
    { $set: { passwordHash, isActive: true } },
    { returnDocument: "after" },
  );
  assert(superAdmin, "Super Admin persona located in DB and password reset");

  const admin = await membersCol.findOneAndUpdate(
    { email: "admin_test_hub@example.com" },
    {
      $set: {
        name: "Admin Hub Tester",
        email: "admin_test_hub@example.com",
        passwordHash,
        role: "Admin",
        isActive: true,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  assert(admin, "Admin persona setup complete");

  const hr = await membersCol.findOneAndUpdate(
    { email: "hr_test_hub@example.com" },
    {
      $set: {
        name: "HR Hub Tester",
        email: "hr_test_hub@example.com",
        passwordHash,
        role: "HR",
        isActive: true,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  assert(hr, "HR persona setup complete");

  const member = await membersCol.findOneAndUpdate(
    { email: "member_test_hub@example.com" },
    {
      $set: {
        name: "Member Hub Tester",
        email: "member_test_hub@example.com",
        passwordHash,
        role: "Member",
        isActive: true,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  assert(member, "Member persona setup complete");

  const superAdminAuth = await loginUser(superAdmin.email);
  assert(superAdminAuth.cookie.length > 0, "Super Admin session obtained");

  const adminAuth = await loginUser(admin.email);
  assert(adminAuth.cookie.length > 0, "Admin session obtained");

  const hrAuth = await loginUser(hr.email);
  assert(hrAuth.cookie.length > 0, "HR session obtained");

  const memberAuth = await loginUser(member.email);
  assert(memberAuth.cookie.length > 0, "Member session obtained");

  console.log("\n--- 2. Unauthenticated Access Protection ---");
  const unauthRes = await fetch(`${BASE_URL}/api/admin/overview`);
  assert(unauthRes.status === 401, "Unauthenticated request returns 401 Unauthorized");

  console.log("\n--- 3. Strict Role-Based Access Control ---");
  const hrRes = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { Cookie: hrAuth.cookie },
  });
  assert(hrRes.status === 403, "HR strictly blocked with 403 Forbidden");

  const memberRes = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { Cookie: memberAuth.cookie },
  });
  assert(memberRes.status === 403, "Regular Member strictly blocked with 403 Forbidden");

  console.log("\n--- 4. Authorized Access: Admin & Super Admin ---");
  const adminRes = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { Cookie: adminAuth.cookie },
  });
  assert(adminRes.status === 200, "Admin granted access with 200 OK");
  const adminData = await adminRes.json();
  assert(adminData.success === true, "Admin overview response success is true");
  assert(adminData.data.viewerRole === "Admin", "viewerRole correctly identified as Admin");
  assert(adminData.data.isSuperAdmin === false, "isSuperAdmin is false for Admin");

  const superAdminRes = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { Cookie: superAdminAuth.cookie },
  });
  assert(superAdminRes.status === 200, "Super Admin granted access with 200 OK");
  const saData = await superAdminRes.json();
  assert(saData.data.isSuperAdmin === true, "isSuperAdmin is true for Super Admin");

  console.log("\n--- 5. Executive Overview Data Integrity ---");
  const d = saData.data;
  assert(d.systemHealth.database === "Connected", "Database health reports Connected");
  assert(typeof d.systemHealth.activeSessions === "number", "Active sessions count is numeric");
  assert(typeof d.systemHealth.totalAuditLogs === "number", "Total audit logs count is numeric");
  assert(typeof d.kpis.totalMembers === "number", "Total members KPI is numeric");
  assert(typeof d.kpis.tiedCommitteesCount === "number", "Tied committees count is numeric");
  assert(typeof d.kpis.clause14ReferralsCount === "number", "Clause 14 referrals count is numeric");
  assert(typeof d.kpis.activeSuspensionsCount === "number", "Active suspensions count is numeric");
  assert(typeof d.roleBreakdown.superAdmin === "number", "Role breakdown tracks superAdmin");
  assert(typeof d.roleBreakdown.admin === "number", "Role breakdown tracks admin");
  assert(typeof d.roleBreakdown.hr === "number", "Role breakdown tracks hr");
  assert(Array.isArray(d.escalations.tiedCommittees), "Escalations tiedCommittees is an array");
  assert(Array.isArray(d.escalations.clause14Referrals), "Escalations clause14Referrals is an array");
  assert(Array.isArray(d.recentOverrides), "recentOverrides is an array");
  assert(Array.isArray(d.recentAdminActions), "recentAdminActions is an array");

  // Cleanup test members
  await membersCol.deleteMany({
    email: { $in: ["admin_test_hub@example.com", "hr_test_hub@example.com", "member_test_hub@example.com"] },
  });

  console.log("\n=======================================================");
  console.log("=== ALL ADMIN DASHBOARD TESTS PASSED SUCCESSFULLY! ===");
  console.log("=======================================================");

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
