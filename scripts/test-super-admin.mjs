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
  console.log("=== Super Admin Universal Bypass Test Suite ===");

  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const membersCol = mongoose.connection.db.collection("members");
  const projectsCol = mongoose.connection.db.collection("projects");
  const warningsCol = mongoose.connection.db.collection("warnings");

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("password123", salt);

  // 1. Setup Super Admin
  const superAdminRes = await membersCol.findOneAndUpdate(
    { email: "super_test@example.com" },
    {
      $set: {
        name: "Super Admin User",
        email: "super_test@example.com",
        role: "Super Admin",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  // 2. Setup Standard Admin
  const adminRes = await membersCol.findOneAndUpdate(
    { email: "regular_admin_test@example.com" },
    {
      $set: {
        name: "Regular Admin User",
        email: "regular_admin_test@example.com",
        role: "Admin",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  // 3. Setup Target Member
  const memberRes = await membersCol.findOneAndUpdate(
    { email: "target_member_test@example.com" },
    {
      $set: {
        name: "Target Member User",
        email: "target_member_test@example.com",
        role: "Member",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  // 4. Setup Project
  const projectRes = await projectsCol.findOneAndUpdate(
    { name: "Super Admin Test Project" },
    {
      $set: {
        name: "Super Admin Test Project",
        description: "Project for Super Admin Testing",
        workspaceId: "infinity-explorers",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  const superAdminId = (superAdminRes?._id || superAdminRes?.value?._id).toString();
  const adminId = (adminRes?._id || adminRes?.value?._id).toString();
  const memberId = (memberRes?._id || memberRes?.value?._id).toString();
  const projectId = (projectRes?._id || projectRes?.value?._id).toString();

  // Login Super Admin
  const superLogin = await makeRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "super_test@example.com", password: "password123" }),
  });
  const superCookie = superLogin.headers.get("set-cookie")?.split(";")[0] || "";
  const superHeaders = { Cookie: superCookie };

  // Login Regular Admin
  const adminLogin = await makeRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "regular_admin_test@example.com", password: "password123" }),
  });
  const adminCookie = adminLogin.headers.get("set-cookie")?.split(";")[0] || "";
  const adminHeaders = { Cookie: adminCookie };

  console.log("\n--- Group 1: Super Admin Bypass on Global Warning ---");
  const superGlobal = await makeRequest("/api/warnings", {
    method: "POST",
    headers: { ...superHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      member: memberId,
      type: "Global",
      level: "Warning 1",
      severity: 1,
      points: 1,
      description: "Super Admin issued global warning",
      autoActivate: true,
    }),
  });

  assert(superGlobal.status === 201, "Super Admin created global warning -> 201");
  assert(
    superGlobal.data.data.status === "Active",
    "Super Admin bypasses committee hold: Global warning is immediately 'Active'"
  );
  assert(
    superGlobal.data.data.approvedBy !== null,
    "Super Admin auto-populates approvedBy"
  );
  assert(
    superGlobal.data.data.activeUntil !== null,
    "Super Admin auto-populates activeUntil (+30 days)"
  );

  console.log("\n--- Group 2: Super Admin Bypass on Direct Final Warning ---");
  const superDirectFinal = await makeRequest("/api/warnings", {
    method: "POST",
    headers: { ...superHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      member: memberId,
      project: projectId,
      type: "Project",
      level: "Final Warning",
      severity: 3,
      points: 3,
      isDirectFinalWarning: true,
      directIssuanceReason: "Executive override for severe misconduct",
      description: "Severe breach of security protocols",
      autoActivate: true,
    }),
  });

  assert(superDirectFinal.status === 201, "Super Admin created Direct Final Warning -> 201");
  assert(
    superDirectFinal.data.data.status === "Active",
    "Super Admin bypasses committee hold: Direct Final Warning is immediately 'Active'"
  );

  console.log("\n--- Group 3: Super Admin Self-Approval Bypass (Conflict of Interest Bypass) ---");
  // Create a warning in Pending_Approval by Super Admin
  const pendingWarningRes = await makeRequest("/api/warnings", {
    method: "POST",
    headers: { ...superHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      member: memberId,
      project: projectId,
      type: "Project",
      level: "Warning 2",
      severity: 2,
      points: 2,
      description: "Pending warning for self-approval test",
      autoActivate: false, // Explicitly keep in Pending_Approval
    }),
  });

  const pendingWarningId = pendingWarningRes.data.data._id;
  assert(pendingWarningRes.data.data.status === "Pending_Approval", "Warning in Pending_Approval created");

  // Super Admin approves their own warning
  const selfApproveRes = await makeRequest(`/api/warnings/${pendingWarningId}/approve`, {
    method: "POST",
    headers: { ...superHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "Approve" }),
  });

  assert(
    selfApproveRes.status === 200,
    "Super Admin approves own warning -> 200 (Conflict of interest bypassed)"
  );
  assert(
    selfApproveRes.data.data.status === "Active",
    "Warning successfully transitioned to 'Active' by Super Admin self-approval"
  );

  console.log("\n--- Group 4: Regular Admin Preserves Governance Strictness ---");
  // Regular Admin issuing Global Warning with autoActivate: true
  const adminGlobal = await makeRequest("/api/warnings", {
    method: "POST",
    headers: { ...adminHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      member: memberId,
      type: "Global",
      level: "Warning 1",
      severity: 1,
      points: 1,
      description: "Regular admin global warning",
      autoActivate: true, // Should be IGNORED for Regular Admin
    }),
  });

  assert(
    adminGlobal.data.data.status === "Pending_Approval",
    "Regular Admin cannot bypass committee: Global warning stays 'Pending_Approval'"
  );

  // Regular Admin trying to approve own warning
  const adminApproveSelf = await makeRequest(`/api/warnings/${adminGlobal.data.data._id}/approve`, {
    method: "POST",
    headers: { ...adminHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "Approve" }),
  });

  assert(
    adminApproveSelf.status === 403,
    "Regular Admin approving own warning is strictly blocked -> 403 (Neutral committee enforced)"
  );

  console.log("\n==========================================");
  console.log("Super Admin Universal Bypass Test Finished: ALL PASSED");
  console.log("==========================================");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
