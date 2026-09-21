import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function setupTestData() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const membersCol = mongoose.connection.db.collection("members");
  const projectsCol = mongoose.connection.db.collection("projects");
  const warningsCol = mongoose.connection.db.collection("warnings");

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("password123", salt);

  // 1. Admin 1 (Issuer / Subject)
  const admin1Res = await membersCol.findOneAndUpdate(
    { email: "admin1@example.com" },
    {
      $set: {
        name: "Admin One",
        email: "admin1@example.com",
        role: "Admin",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  // 2. Admin 2 (Neutral Committee Member)
  const admin2Res = await membersCol.findOneAndUpdate(
    { email: "admin2@example.com" },
    {
      $set: {
        name: "Neutral Admin Two",
        email: "admin2@example.com",
        role: "Admin",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  // 3. Team Leader 1 (Issuer)
  const leader1Res = await membersCol.findOneAndUpdate(
    { email: "leader1@example.com" },
    {
      $set: {
        name: "Team Leader One",
        email: "leader1@example.com",
        role: "Team Leader",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  // 4. Team Leader 2 (Neutral Team Leader)
  const leader2Res = await membersCol.findOneAndUpdate(
    { email: "leader2@example.com" },
    {
      $set: {
        name: "Neutral Team Leader Two",
        email: "leader2@example.com",
        role: "Team Leader",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  // 5. Standard Member
  const member1Res = await membersCol.findOneAndUpdate(
    { email: "member1@example.com" },
    {
      $set: {
        name: "Standard Member One",
        email: "member1@example.com",
        role: "Member",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  // 6. Test Project
  const projectRes = await projectsCol.findOneAndUpdate(
    { title: "Approval Test Project" },
    {
      $set: {
        title: "Approval Test Project",
        description: "Project for Warning Approval Tests",
        status: "In_Progress",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  const admin1Id = (admin1Res?._id || admin1Res?.value?._id).toString();
  const admin2Id = (admin2Res?._id || admin2Res?.value?._id).toString();
  const leader1Id = (leader1Res?._id || leader1Res?.value?._id).toString();
  const leader2Id = (leader2Res?._id || leader2Res?.value?._id).toString();
  const member1Id = (member1Res?._id || member1Res?.value?._id).toString();
  const projectId = (projectRes?._id || projectRes?.value?._id).toString();

  const now = new Date();

  // Warning A: Project Warning (W1) issued by Leader 1 against Member 1 (Pending_Approval)
  const warnProjectW1 = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: now,
    description: "Project Warning 1 issued by Leader 1",
    status: "Pending_Approval",
    issuedBy: new mongoose.Types.ObjectId(leader1Id),
    approvedBy: null,
    approvedAt: null,
    activeFrom: null,
    activeUntil: null,
    createdAt: now,
    updatedAt: now,
  });

  // Warning B: Global Warning issued by Leader 1 against Member 1 (Pending_Approval)
  const warnGlobal = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: null,
    type: "Global",
    level: "Warning 2",
    severity: 2,
    points: 2,
    incidentDate: now,
    description: "Global Warning issued by Leader 1",
    status: "Pending_Approval",
    issuedBy: new mongoose.Types.ObjectId(leader1Id),
    approvedBy: null,
    approvedAt: null,
    activeFrom: null,
    activeUntil: null,
    createdAt: now,
    updatedAt: now,
  });

  // Warning C: Direct Final Warning issued by Leader 1 against Member 1 (Pending_Approval)
  const warnFinal = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: null,
    type: "Global",
    level: "Final Warning",
    severity: 3,
    points: 3,
    isDirectFinalWarning: true,
    directIssuanceReason: "Critical ethical breach",
    incidentDate: now,
    description: "Direct Final Warning issued by Leader 1",
    status: "Pending_Approval",
    issuedBy: new mongoose.Types.ObjectId(leader1Id),
    approvedBy: null,
    approvedAt: null,
    activeFrom: null,
    activeUntil: null,
    createdAt: now,
    updatedAt: now,
  });

  // Warning D: Warning issued by Admin 1 against Member 1 (for Admin self-approval test)
  const warnAdminIssued = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: null,
    type: "Global",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: now,
    description: "Global Warning issued by Admin 1",
    status: "Pending_Approval",
    issuedBy: new mongoose.Types.ObjectId(admin1Id),
    approvedBy: null,
    approvedAt: null,
    activeFrom: null,
    activeUntil: null,
    createdAt: now,
    updatedAt: now,
  });

  // Warning E: Warning issued against Leader 2 (to test subject self-approval)
  const warnAgainstLeader2 = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(leader2Id),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: now,
    description: "Warning issued against Leader 2",
    status: "Pending_Approval",
    issuedBy: new mongoose.Types.ObjectId(admin1Id),
    approvedBy: null,
    approvedAt: null,
    activeFrom: null,
    activeUntil: null,
    createdAt: now,
    updatedAt: now,
  });

  // Warning F: Already Active Warning (for state machine check)
  const warnAlreadyActive = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: now,
    description: "Already active warning",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(leader1Id),
    approvedBy: new mongoose.Types.ObjectId(admin2Id),
    approvedAt: now,
    activeFrom: now,
    activeUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });

  await mongoose.disconnect();

  return {
    admin1Id,
    admin2Id,
    leader1Id,
    leader2Id,
    member1Id,
    projectId,
    warnProjectW1Id: warnProjectW1.insertedId.toString(),
    warnGlobalId: warnGlobal.insertedId.toString(),
    warnFinalId: warnFinal.insertedId.toString(),
    warnAdminIssuedId: warnAdminIssued.insertedId.toString(),
    warnAgainstLeader2Id: warnAgainstLeader2.insertedId.toString(),
    warnAlreadyActiveId: warnAlreadyActive.insertedId.toString(),
  };
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
  console.log("=== Step 8D-2C-1 Warning Approval & Neutral Authority Test Suite ===\n");
  const testData = await setupTestData();

  const admin1Auth = await login("admin1@example.com", "password123");
  const admin2Auth = await login("admin2@example.com", "password123");
  const leader1Auth = await login("leader1@example.com", "password123");
  const leader2Auth = await login("leader2@example.com", "password123");
  const member1Auth = await login("member1@example.com", "password123");

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // =========================================================================
  // 1. Unauthenticated & Unauthorized Role Checks
  // =========================================================================
  console.log("--- Group 1: Basic Authentication & Role Authorization ---");

  // 1.1 Unauthenticated -> 401
  const unauthRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnProjectW1Id}/approve`, {
    method: "POST",
  });
  assert("Unauthenticated POST /approve -> 401", unauthRes.status === 401, `Got ${unauthRes.status}`);

  // 1.2 Member -> 403 (APPROVE_WARNINGS forbidden)
  const memberRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnProjectW1Id}/approve`, {
    method: "POST",
    headers: { Cookie: member1Auth.cookie },
  });
  assert("Member POST /approve -> 403 (APPROVE_WARNINGS forbidden)", memberRes.status === 403, `Got ${memberRes.status}`);

  // =========================================================================
  // 2. Conflict of Interest (Neutral Committee / Neutral Authority Principle)
  // =========================================================================
  console.log("\n--- Group 2: Conflict of Interest (Issuer & Subject Restrictions) ---");

  // 2.1 Team Leader 1 attempting to approve a warning THEY ISSUED -> 403
  const leader1SelfApprove = await fetch(`${BASE_URL}/api/warnings/${testData.warnProjectW1Id}/approve`, {
    method: "POST",
    headers: { Cookie: leader1Auth.cookie },
  });
  const leader1SelfData = await leader1SelfApprove.json();
  assert("Issuer (Team Leader) cannot approve own warning -> 403", leader1SelfApprove.status === 403, leader1SelfData.message);
  assert("Conflict of interest message returned for issuer", leader1SelfData.message?.includes("issuer"));

  // 2.2 Admin 1 attempting to approve a warning THEY ISSUED -> 403
  const admin1SelfApprove = await fetch(`${BASE_URL}/api/warnings/${testData.warnAdminIssuedId}/approve`, {
    method: "POST",
    headers: { Cookie: admin1Auth.cookie },
  });
  const admin1SelfData = await admin1SelfApprove.json();
  assert("Issuer (Admin) cannot approve own warning -> 403", admin1SelfApprove.status === 403, admin1SelfData.message);

  // 2.3 Member/Subject attempting to approve a warning issued against THEMSELVES -> 403
  const subjectSelfApprove = await fetch(`${BASE_URL}/api/warnings/${testData.warnAgainstLeader2Id}/approve`, {
    method: "POST",
    headers: { Cookie: leader2Auth.cookie }, // Leader 2 is the subject member of this warning
  });
  const subjectSelfData = await subjectSelfApprove.json();
  assert("Subject cannot approve warning issued against themselves -> 403", subjectSelfApprove.status === 403, subjectSelfData.message);
  assert("Conflict of interest message returned for subject", subjectSelfData.message?.includes("against yourself"));

  // =========================================================================
  // 3. Authority Scope Checks (Team Leader vs Committee / Admin)
  // =========================================================================
  console.log("\n--- Group 3: Authority Scope (Team Leader vs Admin / Committee) ---");

  // 3.1 Neutral Team Leader 2 attempting to approve a GLOBAL Warning -> 403
  const leaderApproveGlobal = await fetch(`${BASE_URL}/api/warnings/${testData.warnGlobalId}/approve`, {
    method: "POST",
    headers: { Cookie: leader2Auth.cookie },
  });
  const leaderApproveGlobalData = await leaderApproveGlobal.json();
  assert("Team Leader cannot approve Global Warning -> 403", leaderApproveGlobal.status === 403, leaderApproveGlobalData.message);
  assert("Global warning requires Committee / Admin approval message", leaderApproveGlobalData.message?.includes("Committee"));

  // 3.2 Neutral Team Leader 2 attempting to approve a FINAL Warning -> 403
  const leaderApproveFinal = await fetch(`${BASE_URL}/api/warnings/${testData.warnFinalId}/approve`, {
    method: "POST",
    headers: { Cookie: leader2Auth.cookie },
  });
  const leaderApproveFinalData = await leaderApproveFinal.json();
  assert("Team Leader cannot approve Final Warning -> 403", leaderApproveFinal.status === 403, leaderApproveFinalData.message);

  // 3.3 Neutral Team Leader 2 approving a standard PROJECT Warning (Warning 1) -> 200
  const leaderApproveProject = await fetch(`${BASE_URL}/api/warnings/${testData.warnProjectW1Id}/approve`, {
    method: "POST",
    headers: { Cookie: leader2Auth.cookie },
  });
  const leaderApproveProjectData = await leaderApproveProject.json();
  assert("Neutral Team Leader can approve Project Warning 1 -> 200", leaderApproveProject.status === 200, leaderApproveProjectData.message);

  if (leaderApproveProjectData.data) {
    const w = leaderApproveProjectData.data;
    assert("Project warning status transitioned to 'Active'", w.status === "Active");
    const approverId = typeof w.approvedBy === "object" ? w.approvedBy._id : w.approvedBy;
    assert("approvedBy recorded as Neutral Team Leader 2", approverId === testData.leader2Id);
    assert("approvedAt recorded", !!w.approvedAt);
    assert("activeFrom equals approvedAt", new Date(w.activeFrom).getTime() === new Date(w.approvedAt).getTime());

    // Check 30 days active period for Warning 1
    const diffDays = Math.round((new Date(w.activeUntil).getTime() - new Date(w.activeFrom).getTime()) / (1000 * 60 * 60 * 24));
    assert("Project Warning 1 activeUntil is exactly 30 days from activeFrom", diffDays === 30, `Got ${diffDays} days`);
  }

  // =========================================================================
  // 4. Committee / Admin Approval Checks
  // =========================================================================
  console.log("\n--- Group 4: Committee / Admin Approval Checks ---");

  // 4.1 Neutral Admin 2 approving Global Warning -> 200
  const adminApproveGlobal = await fetch(`${BASE_URL}/api/warnings/${testData.warnGlobalId}/approve`, {
    method: "POST",
    headers: { Cookie: admin2Auth.cookie },
  });
  const adminApproveGlobalData = await adminApproveGlobal.json();
  assert("Neutral Admin approves Global Warning -> 200", adminApproveGlobal.status === 200, adminApproveGlobalData.message);
  if (adminApproveGlobalData.data) {
    const w = adminApproveGlobalData.data;
    assert("Global warning status is 'Active'", w.status === "Active");
    const approverId = typeof w.approvedBy === "object" ? w.approvedBy._id : w.approvedBy;
    assert("approvedBy recorded as Admin 2", approverId === testData.admin2Id);
  }

  // 4.2 Neutral Admin 2 approving Direct Final Warning -> 200
  const adminApproveFinal = await fetch(`${BASE_URL}/api/warnings/${testData.warnFinalId}/approve`, {
    method: "POST",
    headers: { Cookie: admin2Auth.cookie },
  });
  const adminApproveFinalData = await adminApproveFinal.json();
  assert("Neutral Admin approves Direct Final Warning -> 200", adminApproveFinal.status === 200, adminApproveFinalData.message);
  if (adminApproveFinalData.data) {
    const w = adminApproveFinalData.data;
    assert("Final Warning status is 'Active'", w.status === "Active");
    const diffDays = Math.round((new Date(w.activeUntil).getTime() - new Date(w.activeFrom).getTime()) / (1000 * 60 * 60 * 24));
    assert("Final Warning activeUntil is exactly 60 days from activeFrom", diffDays === 60, `Got ${diffDays} days`);
  }

  // =========================================================================
  // 5. State Machine Validation (Only Pending_Approval can be approved)
  // =========================================================================
  console.log("\n--- Group 5: State Machine Enforcement ---");

  // Attempt to approve an already Active warning -> 400
  const approveActive = await fetch(`${BASE_URL}/api/warnings/${testData.warnAlreadyActiveId}/approve`, {
    method: "POST",
    headers: { Cookie: admin2Auth.cookie },
  });
  const approveActiveData = await approveActive.json();
  assert("Attempting to approve an already Active warning -> 400", approveActive.status === 400, approveActiveData.message);
  assert("Error explains that only Pending_Approval can be approved", approveActiveData.message?.includes("Pending_Approval"));

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n==========================================");
  console.log(`Test Execution Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
