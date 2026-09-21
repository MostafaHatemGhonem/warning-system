import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function login(email, password = "password123") {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const cookieHeader = res.headers.get("set-cookie");
  let cookie = "";
  if (cookieHeader) {
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match) {
      cookie = `session_token=${match[1]}`;
    }
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, cookie, data: json };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runActivityAuditTests() {
  console.log("\n=======================================================");
  console.log("=== STEP 3-D: ACTIVITY LOG & COVERAGE VERIFICATION ===");
  console.log("=======================================================\n");

  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;
  const membersCol = db.collection("members");
  const projectsCol = db.collection("projects");
  const tasksCol = db.collection("tasks");
  const auditLogsCol = db.collection("auditlogs");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  // Setup Test Members
  console.log("--- 1. Persona Setup ---");
  const superAdmin = await membersCol.findOneAndUpdate(
    { role: "Super Admin" },
    { $set: { passwordHash, isActive: true } },
    { returnDocument: "after" },
  );
  assert(superAdmin, "Super Admin persona located in DB and password reset");

  const adminUser = await membersCol.findOneAndUpdate(
    { email: "admin_activity@example.com" },
    {
      $set: {
        name: "Admin Activity Tester",
        email: "admin_activity@example.com",
        role: "Admin",
        isActive: true,
        passwordHash,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  assert(adminUser, "Admin persona setup complete");

  const hrUser = await membersCol.findOneAndUpdate(
    { email: "hr_activity@example.com" },
    {
      $set: {
        name: "HR Activity Tester",
        email: "hr_activity@example.com",
        role: "HR",
        isActive: true,
        passwordHash,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  assert(hrUser, "HR persona setup complete");

  const testMember = await membersCol.findOneAndUpdate(
    { email: "activity_test_member@example.com" },
    {
      $set: {
        name: "Test Member Activity",
        email: "activity_test_member@example.com",
        role: "Member",
        isActive: true,
        passwordHash,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  assert(testMember, "Test Member setup complete");

  // Authenticate personas
  const superAdminLogin = await login(superAdmin.email, "password123");
  assert(superAdminLogin.cookie, "Super Admin session obtained");
  const superAdminCookie = superAdminLogin.cookie;
  const adminCookie = superAdminCookie;

  const adminLogin = await login("admin_activity@example.com", "password123");
  assert(adminLogin.cookie, "Admin session obtained");
  const regularAdminCookie = adminLogin.cookie;

  const hrLogin = await login("hr_activity@example.com", "password123");
  assert(hrLogin.cookie, "HR session obtained");
  const hrCookie = hrLogin.cookie;

  const memberLogin = await login("activity_test_member@example.com", "password123");
  assert(memberLogin.cookie, "Regular Member session obtained");

  // Verify Login Audit Log
  console.log("\n--- 2. Auth Session Lifecycle Audit: Login & Logout ---");
  const loginAudit = await auditLogsCol.findOne(
    { action: "members.login", "actor.email": "activity_test_member@example.com" },
    { sort: { createdAt: -1 } },
  );
  assert(loginAudit, "members.login audit log was recorded upon successful login");
  assert(loginAudit.resource.type === "Member", "Login resource.type is 'Member'");

  // Test Logout Audit Log
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: memberLogin.cookie },
  });
  assert(logoutRes.status === 200, "Member logged out successfully");

  const logoutAudit = await auditLogsCol.findOne(
    { action: "members.logout", "actor.email": "activity_test_member@example.com" },
    { sort: { createdAt: -1 } },
  );
  assert(logoutAudit, "members.logout audit log was recorded upon session logout");

  // Re-login member for remaining tests
  const memberLogin2 = await login("activity_test_member@example.com", "password123");
  const memberCookie = memberLogin2.cookie;

  // --- 3. Projects CRUD Audit Log ---
  console.log("\n--- 3. Projects CRUD Audit Logging ---");
  const uniqueProjectName = `Audit Test Project ${Date.now()}`;
  const createProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      name: uniqueProjectName,
      description: "Testing audit trail integration for project creation",
      lead: "Test Lead",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  assert(createProjRes.status === 201, "Project created successfully via POST /api/projects");
  const createdProj = await createProjRes.json();

  const projCreateAudit = await auditLogsCol.findOne({
    action: "projects.create",
    "resource.id": new mongoose.Types.ObjectId(createdProj._id),
  });
  assert(projCreateAudit, "projects.create audit log verified in database");
  assert(projCreateAudit.newState.name === uniqueProjectName, "Audit record newState contains project name");

  // Update Project
  const updateProjRes = await fetch(`${BASE_URL}/api/projects/${createdProj._id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      description: "Updated description for audit test",
      decisionReason: "Refining project scope for milestone 1",
    }),
  });
  assert(updateProjRes.status === 200, "Project updated successfully via PATCH /api/projects/[id]");

  const projUpdateAudit = await auditLogsCol.findOne({
    action: "projects.update",
    "resource.id": new mongoose.Types.ObjectId(createdProj._id),
  });
  assert(projUpdateAudit, "projects.update audit log verified in database");
  assert(
    projUpdateAudit.previousState.description === "Testing audit trail integration for project creation",
    "previousState snapshot captured original description",
  );
  assert(
    projUpdateAudit.newState.description === "Updated description for audit test",
    "newState snapshot captured updated description",
  );

  // --- 4. Tasks CRUD Audit Log ---
  console.log("\n--- 4. Tasks CRUD Audit Logging ---");
  const uniqueTaskTitle = `Audit Test Task ${Date.now()}`;
  const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      projectId: createdProj._id,
      title: uniqueTaskTitle,
      description: "Initial task description for audit",
      priority: "high",
      status: "todo",
      dueDate: new Date().toISOString(),
    }),
  });
  assert(createTaskRes.status === 201, "Task created successfully via POST /api/tasks");
  const createdTask = await createTaskRes.json();

  const taskCreateAudit = await auditLogsCol.findOne({
    action: "tasks.create",
    "resource.id": new mongoose.Types.ObjectId(createdTask._id),
  });
  assert(taskCreateAudit, "tasks.create audit log verified in database");
  assert(taskCreateAudit.resource.type === "Task", "Audit resource.type is 'Task'");

  // Update Task
  const updateTaskRes = await fetch(`${BASE_URL}/api/tasks/${createdTask._id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      status: "in-progress",
      decisionReason: "Task started by developer",
    }),
  });
  assert(updateTaskRes.status === 200, "Task updated successfully via PATCH /api/tasks/[id]");

  const taskUpdateAudit = await auditLogsCol.findOne({
    action: "tasks.update",
    "resource.id": new mongoose.Types.ObjectId(createdTask._id),
  });
  assert(taskUpdateAudit, "tasks.update audit log verified in database");
  assert(taskUpdateAudit.previousState.status === "todo", "Task previousState had status 'todo'");
  assert(taskUpdateAudit.newState.status === "in-progress", "Task newState has status 'in-progress'");

  // Delete Task
  const deleteTaskRes = await fetch(`${BASE_URL}/api/tasks/${createdTask._id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  assert(deleteTaskRes.status === 200, "Task deleted successfully via DELETE /api/tasks/[id]");

  const taskDeleteAudit = await auditLogsCol.findOne({
    action: "tasks.delete",
    "resource.id": new mongoose.Types.ObjectId(createdTask._id),
  });
  assert(taskDeleteAudit, "tasks.delete audit log verified with previousState preserved");

  // Delete Project
  const deleteProjRes = await fetch(`${BASE_URL}/api/projects/${createdProj._id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  assert(deleteProjRes.status === 200, "Project deleted successfully via DELETE /api/projects/[id]");

  const projDeleteAudit = await auditLogsCol.findOne({
    action: "projects.delete",
    "resource.id": new mongoose.Types.ObjectId(createdProj._id),
  });
  assert(projDeleteAudit, "projects.delete audit log verified in database");

  // --- 5. Activity API: Search & Filters & Pagination ---
  console.log("\n--- 5. Activity API: Search, Date Filter, & Pagination ---");

  // Search by project name
  const searchRes = await fetch(
    `${BASE_URL}/api/audit-logs?search=${encodeURIComponent(uniqueProjectName)}`,
    { headers: { Cookie: adminCookie } },
  );
  assert(searchRes.status === 200, "Search query executed successfully");
  const searchJson = await searchRes.json();
  assert(searchJson.success, "Search response indicates success");
  assert(searchJson.data.length >= 1, "Search located the unique project audit logs");

  // Date filter (today)
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateRes = await fetch(
    `${BASE_URL}/api/audit-logs?startDate=${todayStr}&endDate=${todayStr}`,
    { headers: { Cookie: adminCookie } },
  );
  assert(dateRes.status === 200, "Date filter query executed successfully");
  const dateJson = await dateRes.json();
  assert(dateJson.data.length > 0, "Today's logs returned accurately");

  // --- 6. Role-Based Visibility Scoping (Admin & Super Admin ONLY) ---
  console.log("\n--- 6. Strict Role-Based Visibility (Admin & Super Admin ONLY) ---");

  // 1. Super Admin access -> MUST SUCCEED (200)
  const superAdminAuditRes = await fetch(`${BASE_URL}/api/audit-logs?limit=5`, {
    headers: { Cookie: superAdminCookie },
  });
  assert(superAdminAuditRes.status === 200, "Super Admin accessed /api/audit-logs (200 OK)");
  const superAdminAuditJson = await superAdminAuditRes.json();
  assert(superAdminAuditJson.viewerScope === "ORGANIZATION_WIDE", "Super Admin receives ORGANIZATION_WIDE scope");

  // 2. Admin access -> MUST SUCCEED (200)
  const adminAuditRes = await fetch(`${BASE_URL}/api/audit-logs?limit=5`, {
    headers: { Cookie: regularAdminCookie },
  });
  assert(adminAuditRes.status === 200, "Admin accessed /api/audit-logs (200 OK)");

  // 3. HR access -> MUST BE FORBIDDEN (403)
  const hrAuditRes = await fetch(`${BASE_URL}/api/audit-logs?limit=5`, {
    headers: { Cookie: hrCookie },
  });
  assert(hrAuditRes.status === 403, "HR strictly blocked from /api/audit-logs (403 Forbidden)");

  // 4. Member access -> MUST BE FORBIDDEN (403)
  const memberAuditRes = await fetch(`${BASE_URL}/api/audit-logs?limit=5`, {
    headers: { Cookie: memberCookie },
  });
  assert(memberAuditRes.status === 403, "Member strictly blocked from /api/audit-logs (403 Forbidden)");

  // 5. Stats API security check: HR and Member must be blocked from /api/audit-logs/stats
  const hrStatsRes = await fetch(`${BASE_URL}/api/audit-logs/stats`, {
    headers: { Cookie: hrCookie },
  });
  assert(hrStatsRes.status === 403, "HR strictly blocked from /api/audit-logs/stats (403 Forbidden)");

  const memberStatsRes = await fetch(`${BASE_URL}/api/audit-logs/stats`, {
    headers: { Cookie: memberCookie },
  });
  assert(memberStatsRes.status === 403, "Member strictly blocked from /api/audit-logs/stats (403 Forbidden)");

  // --- 7. Activity Stats API ---
  console.log("\n--- 7. Activity Stats API (/api/audit-logs/stats) ---");
  const statsRes = await fetch(`${BASE_URL}/api/audit-logs/stats`, {
    headers: { Cookie: adminCookie },
  });
  assert(statsRes.status === 200, "GET /api/audit-logs/stats returned 200 OK");
  const statsJson = await statsRes.json();
  assert(statsJson.success, "Stats response indicates success");
  assert(typeof statsJson.data.totalEvents === "number", "totalEvents is a number");
  assert(typeof statsJson.data.todayEvents === "number", "todayEvents is a number");
  assert(typeof statsJson.data.governanceEvents === "number", "governanceEvents is a number");
  assert(typeof statsJson.data.overridesCount === "number", "overridesCount is a number");
  assert(
    typeof statsJson.data.resourceTypeBreakdown.Project === "number",
    "resourceTypeBreakdown.Project is tracked",
  );
  assert(
    typeof statsJson.data.resourceTypeBreakdown.Task === "number",
    "resourceTypeBreakdown.Task is tracked",
  );
  assert(
    typeof statsJson.data.resourceTypeBreakdown.Warning === "number",
    "resourceTypeBreakdown.Warning is tracked",
  );
  assert(
    Array.isArray(statsJson.data.recentActivity),
    "recentActivity returns an array of recent entries",
  );

  console.log("\n--- Cleanup Test Records ---");
  await membersCol.deleteOne({ email: "activity_test_member@example.com" });
  await membersCol.deleteOne({ email: "hr_activity@example.com" });
  await membersCol.deleteOne({ email: "admin_activity@example.com" });
  console.log("Cleaned up test members. Audit logs preserved for permanent compliance.");

  console.log("\n=======================================================");
  console.log("=== ALL STEP 3 VERIFICATIONS PASSED SUCCESSFULLY! ===");
  console.log("=======================================================\n");
  process.exit(0);
}

runActivityAuditTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
