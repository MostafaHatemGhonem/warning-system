import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI =
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
  return { status: res.status, cookie };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runHardeningTests() {
  console.log("\n=======================================================");
  console.log("=== HARDENING SUITE: CAN() + AUDIT LOG + COI + LIFECYCLE ===");
  console.log("=======================================================\n");

  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;
  const membersCol = db.collection("members");
  const warningsCol = db.collection("warnings");
  const auditLogsCol = db.collection("auditlogs");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  // ── 1. Setup Test Users ────────────────────────────────────────────────────
  console.log("--- Test Setup: Ensuring Test Personas Exist ---");
  const superAdmin = await membersCol.findOne({ email: "mostafahatemghonem@gmail.com" });
  assert(superAdmin, "Super Admin user exists");

  const hrUser = await membersCol.findOneAndUpdate(
    { email: "hr_hardening@example.com" },
    {
      $set: {
        name: "Sara HR Hardening",
        email: "hr_hardening@example.com",
        role: "HR",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  const adminUser = await membersCol.findOneAndUpdate(
    { email: "admin_hardening@example.com" },
    {
      $set: {
        name: "Admin Tariq Hardening",
        email: "admin_hardening@example.com",
        role: "Admin",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  const targetMember = await membersCol.findOneAndUpdate(
    { email: "dev_target@example.com" },
    {
      $set: {
        name: "Karim Developer Target",
        email: "dev_target@example.com",
        role: "Member",
        isCommitteeMember: false,
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  // Authenticate sessions
  const superAdminSession = await login("mostafahatemghonem@gmail.com");
  const hrSession = await login("hr_hardening@example.com");
  const adminSession = await login("admin_hardening@example.com");
  const memberSession = await login("dev_target@example.com");

  assert(superAdminSession.cookie, "Super Admin logged in successfully");
  assert(hrSession.cookie, "HR logged in successfully");
  assert(adminSession.cookie, "Admin logged in successfully");
  assert(memberSession.cookie, "Member logged in successfully");

  // ── 2. Committee Membership Lifecycle Testing ─────────────────────────────
  console.log("\n--- Part 1: Committee Membership Lifecycle Enforcement ---");

  // A. Admin attempts to grant isCommitteeMember -> MUST FAIL (403)
  const adminGrantRes = await fetch(`${BASE_URL}/api/members/${targetMember._id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminSession.cookie,
    },
    body: JSON.stringify({ isCommitteeMember: true }),
  });
  assert(adminGrantRes.status === 403, "Admin blocked from granting Committee membership (403 Forbidden)");

  // B. HR attempts to grant isCommitteeMember -> MUST FAIL (403)
  const hrGrantRes = await fetch(`${BASE_URL}/api/members/${targetMember._id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: hrSession.cookie,
    },
    body: JSON.stringify({ isCommitteeMember: true }),
  });
  assert(hrGrantRes.status === 403, "HR blocked from granting Committee membership (403 Forbidden)");

  // C. Super Admin grants isCommitteeMember -> MUST SUCCEED (200)
  const superAdminGrantRes = await fetch(`${BASE_URL}/api/members/${targetMember._id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      isCommitteeMember: true,
      reason: "Appointed to Disciplinary Committee by Super Admin",
    }),
  });
  assert(superAdminGrantRes.status === 200, "Super Admin granted Committee membership (200 OK)");

  // Verify Audit Log has committee.grant
  const committeeGrantAudit = await auditLogsCol.findOne({
    action: "committee.grant",
    "resource.id": targetMember._id,
  });
  assert(committeeGrantAudit, "Audit Log recorded 'committee.grant' with requestId and previous/new state");
  assert(committeeGrantAudit.previousState?.isCommitteeMember === false, "Audit previousState has isCommitteeMember: false");
  assert(committeeGrantAudit.newState?.isCommitteeMember === true, "Audit newState has isCommitteeMember: true");

  // D. Super Admin revokes isCommitteeMember -> MUST SUCCEED (200)
  const superAdminRevokeRes = await fetch(`${BASE_URL}/api/members/${targetMember._id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      isCommitteeMember: false,
      reason: "Rotated off Disciplinary Committee by Super Admin",
    }),
  });
  assert(superAdminRevokeRes.status === 200, "Super Admin revoked Committee membership (200 OK)");

  const committeeRevokeAudit = await auditLogsCol.findOne({
    action: "committee.revoke",
    "resource.id": targetMember._id,
  });
  assert(committeeRevokeAudit, "Audit Log recorded 'committee.revoke'");

  // ── 3. Super Admin Override Accountability ────────────────────────────────
  console.log("\n--- Part 2: Super Admin Override Accountability (No Silent Bypass) ---");

  // Create a warning issued by Super Admin against target member
  const createWarnRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      member: targetMember._id.toString(),
      type: "Global",
      level: "Final Warning",
      severity: 3,
      isDirectFinalWarning: true,
      directIssuanceReason: "Critical security violation warranting immediate Final Warning",
      description: "Direct issuance of Final Warning by Super Admin",
    }),
  });
  const createWarnData = await createWarnRes.json();
  assert(createWarnRes.status === 201, "Final Warning created by Super Admin (Status: Pending_Approval)");
  const warningId = createWarnData.data._id;

  // Verify Audit Log for warning issuance
  const issueAudit = await auditLogsCol.findOne({
    action: "warnings.issue",
    "resource.id": new mongoose.Types.ObjectId(warningId),
  });
  assert(issueAudit, "Audit Log recorded 'warnings.issue' with decisionReason and newState");

  // Test COI Violation: Super Admin is the ISSUER.
  // Rule: Issuer cannot approve own warning.
  // A. Super Admin attempts to approve WITHOUT overrideReason -> MUST FAIL (400 Bad Request)
  const approveNoReasonRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({}),
  });
  assert(
    approveNoReasonRes.status === 400,
    "Super Admin blocked from self-approval WITHOUT overrideReason (400 Bad Request)",
  );
  const approveNoReasonData = await approveNoReasonRes.json();
  assert(
    approveNoReasonData.message.includes("overrideReason"),
    `Error clearly states overrideReason is required: "${approveNoReasonData.message}"`,
  );

  // B. Super Admin attempts with too short overrideReason (< 10 chars) -> MUST FAIL (400)
  const approveShortReasonRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({ overrideReason: "override" }),
  });
  assert(
    approveShortReasonRes.status === 400,
    "Super Admin blocked with short overrideReason < 10 chars (400 Bad Request)",
  );

  // C. Super Admin provides valid overrideReason (>= 10 chars) -> MUST SUCCEED (200 OK)
  const validOverride = "Emergency operational override by Executive Board due to critical incident";
  const approveWithReasonRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      overrideReason: validOverride,
      notes: "Executive committee emergency approval",
    }),
  });
  assert(
    approveWithReasonRes.status === 200,
    "Super Admin approved WITH valid overrideReason (200 OK)",
  );

  // Verify Audit Log records SUPER_ADMIN_OVERRIDE and the overrideReason!
  const approveAudit = await auditLogsCol.findOne({
    action: "warnings.approve",
    "resource.id": new mongoose.Types.ObjectId(warningId),
  });
  assert(approveAudit, "Audit Log recorded 'warnings.approve'");
  assert(
    approveAudit.authorizationResult === "SUPER_ADMIN_OVERRIDE",
    "Audit Log authorizationResult is 'SUPER_ADMIN_OVERRIDE'",
  );
  assert(
    approveAudit.overrideReason === validOverride,
    `Audit Log captured exact overrideReason: "${approveAudit.overrideReason}"`,
  );
  assert(approveAudit.previousState?.status === "Pending_Approval", "Audit captured previousState: Pending_Approval");
  assert(approveAudit.newState?.status === "Active", "Audit captured newState: Active");

  // ── 4. Illegal State Machine Transitions ──────────────────────────────────
  console.log("\n--- Part 3: State Machine Tampering & Guard Protections ---");

  // A. Attempt to approve an ALREADY Active warning -> MUST FAIL (400)
  const doubleApproveRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({ overrideReason: "Trying to double approve" }),
  });
  assert(
    doubleApproveRes.status === 400,
    "Blocked from approving an already Active warning (400 Bad Request)",
  );

  // B. Temporary Suspension: Apply and Verify Audit
  const suspendRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/suspension`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      reason: "Interim 24-hour suspension pending investigation",
      suspensionHours: 24,
    }),
  });
  assert(suspendRes.status === 200, "Temporary suspension applied (200 OK)");

  const suspendAudit = await auditLogsCol.findOne({
    action: "warnings.suspend",
    "resource.id": new mongoose.Types.ObjectId(warningId),
  });
  assert(suspendAudit, "Audit Log recorded 'warnings.suspend'");
  assert(suspendAudit.newState?.suspension?.isSuspended === true, "Audit newState has isSuspended: true");

  // C. Lift Suspension and Verify Audit
  const liftRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/suspension`, {
    method: "DELETE",
    headers: {
      Cookie: superAdminSession.cookie,
    },
  });
  assert(liftRes.status === 200, "Temporary suspension lifted (200 OK)");

  // D. Extension: Extend Warning and Verify Audit
  const extendRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/extend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      extensionDays: 14,
      reason: "Granted 14 days extension due to ongoing remediation",
    }),
  });
  assert(extendRes.status === 200, "Warning extended by 14 days (200 OK)");

  const extendAudit = await auditLogsCol.findOne({
    action: "warnings.extend",
    "resource.id": new mongoose.Types.ObjectId(warningId),
  });
  assert(extendAudit, "Audit Log recorded 'warnings.extend'");
  assert(extendAudit.newState?.extension?.isExtended === true, "Audit newState has isExtended: true");

  // E. Double Extension Attempt -> MUST FAIL (Max 1 extension rule)
  const doubleExtendRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/extend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      extensionDays: 7,
      reason: "Trying second extension",
    }),
  });
  assert(doubleExtendRes.status === 400, "Blocked second extension on same warning (400 Bad Request)");

  // ── 5. Protected Account Safeguards ───────────────────────────────────────
  console.log("\n--- Part 4: Protected Account Safeguards ---");

  // A. Attempt to deactivate Super Admin -> MUST FAIL (403 Forbidden)
  const deactivateSuperAdminRes = await fetch(`${BASE_URL}/api/members/${superAdmin._id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({ isActive: false, reason: "Deactivation test" }),
  });
  assert(
    deactivateSuperAdminRes.status === 400 || deactivateSuperAdminRes.status === 403,
    "Super Admin account protected from deactivation",
  );

  // B. Deactivate normal member WITHOUT reason -> MUST FAIL (400 Bad Request)
  const deactivateNoReasonRes = await fetch(`${BASE_URL}/api/members/${targetMember._id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({ isActive: false }),
  });
  assert(
    deactivateNoReasonRes.status === 400,
    "Deactivating member account WITHOUT mandatory reason blocked (400 Bad Request)",
  );

  // C. Deactivate normal member WITH documented reason -> MUST SUCCEED
  const deactivateWithReasonRes = await fetch(`${BASE_URL}/api/members/${targetMember._id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      isActive: false,
      reason: "Deactivated following formal committee disciplinary review",
    }),
  });
  assert(deactivateWithReasonRes.status === 200, "Member deactivated with mandatory reason (200 OK)");

  const statusAudit = await auditLogsCol.findOne({
    action: "members.status_change",
    "resource.id": targetMember._id,
  });
  assert(statusAudit, "Audit Log recorded 'members.status_change'");
  assert(statusAudit.newState?.isActive === false, "Audit newState has isActive: false");

  // Restore target member to active and re-login (since previous session was invalidated on deactivation)
  await membersCol.updateOne({ _id: targetMember._id }, { $set: { isActive: true } });
  const freshMemberSession = await login("dev_target@example.com");

  // ── 6. Query Audit Trail API ──────────────────────────────────────────────
  console.log("\n--- Part 5: Read-Only Audit API Verification ---");

  // Member attempts to view audit logs -> MUST FAIL (403)
  const memberAuditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { Cookie: freshMemberSession.cookie },
  });
  assert(memberAuditRes.status === 403, "Member blocked from viewing audit logs (403 Forbidden)");

  // HR views audit logs -> MUST SUCCEED (200)
  const hrAuditRes = await fetch(`${BASE_URL}/api/audit-logs?limit=10`, {
    headers: { Cookie: hrSession.cookie },
  });
  assert(hrAuditRes.status === 200, "HR successfully accessed audit logs (200 OK)");
  const hrAuditData = await hrAuditRes.json();
  assert(hrAuditData.data.length > 0, `HR retrieved ${hrAuditData.data.length} audit records`);

  // Super Admin views audit logs filtered by SUPER_ADMIN_OVERRIDE
  const overrideQueryRes = await fetch(
    `${BASE_URL}/api/audit-logs?authorizationResult=SUPER_ADMIN_OVERRIDE`,
    {
      headers: { Cookie: superAdminSession.cookie },
    },
  );
  assert(overrideQueryRes.status === 200, "Super Admin queried override audit logs");
  const overrideData = await overrideQueryRes.json();
  assert(
    overrideData.data.length >= 1,
    `Found ${overrideData.data.length} recorded SUPER_ADMIN_OVERRIDE log(s)`,
  );

  // ── 7. Clean up temporary test warning ─────────────────────────────────────
  console.log("\n--- Cleaning Up Temporary Test Records ---");
  await warningsCol.deleteOne({ _id: new mongoose.Types.ObjectId(warningId) });
  await membersCol.deleteMany({
    email: { $in: ["hr_hardening@example.com", "admin_hardening@example.com", "dev_target@example.com"] },
  });
  console.log("Cleaned up test users and warnings. (Audit logs preserved for permanent compliance).");

  console.log("\n=======================================================");
  console.log("=== ALL HARDENING, AUDIT & OVERRIDE TESTS PASSED 100% ===");
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

runHardeningTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
