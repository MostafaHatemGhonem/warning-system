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

  // 1. Ensure Admin
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

  // 2. Ensure Team Leader
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

  // 3. Ensure Member
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

  // 4. Ensure Other Member (to test privacy / access controls)
  const otherRes = await membersCol.findOneAndUpdate(
    { email: "other.member@example.com" },
    {
      $set: {
        name: "Other Member",
        email: "other.member@example.com",
        role: "Member",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  // 5. Ensure a Test Project
  const projectRes = await projectsCol.findOneAndUpdate(
    { title: "Warnings Test Project" },
    {
      $set: {
        title: "Warnings Test Project",
        description: "Test Project for Warnings CRUD",
        status: "In_Progress",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  const adminId = (adminRes?._id || adminRes?.value?._id).toString();
  const leaderId = (leaderRes?._id || leaderRes?.value?._id).toString();
  const memberId = (memberRes?._id || memberRes?.value?._id).toString();
  const otherMemberId = (otherRes?._id || otherRes?.value?._id).toString();
  const projectId = (projectRes?._id || projectRes?.value?._id).toString();

  // Create a warning for member
  const memberWarning = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(memberId),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: new Date(),
    description: "Initial warning for member",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(adminId),
    activeFrom: new Date(),
    activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    extensionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create a warning for other member
  const otherWarning = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(otherMemberId),
    project: null,
    type: "Global",
    level: "Warning 2",
    severity: 2,
    points: 2,
    incidentDate: new Date(),
    description: "Global warning for other member",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(adminId),
    activeFrom: new Date(),
    activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    extensionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await mongoose.disconnect();

  return {
    adminId,
    leaderId,
    memberId,
    otherMemberId,
    projectId,
    memberWarningId: memberWarning.insertedId.toString(),
    otherWarningId: otherWarning.insertedId.toString(),
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
  console.log("=== Step 8D-2A Warning CRUD + Authorization Test Suite ===");
  const testData = await setupTestData();
  console.log("Setup complete. Test IDs:", testData);

  // Log in users
  const adminAuth = await login("admin@example.com", "password123");
  const leaderAuth = await login("leader@example.com", "password123");
  const memberAuth = await login("member@example.com", "password123");

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

  // -------------------------------------------------------------
  // 1. Unauthenticated Checks (All must return 401)
  // -------------------------------------------------------------
  console.log("\n--- Group 1: Unauthenticated Tests ---");

  // GET list
  const unauthList = await fetch(`${BASE_URL}/api/warnings`);
  assert("Unauth GET /api/warnings -> 401", unauthList.status === 401, `Got ${unauthList.status}`);

  // GET detail
  const unauthDetail = await fetch(`${BASE_URL}/api/warnings/${testData.memberWarningId}`);
  assert("Unauth GET /api/warnings/:id -> 401", unauthDetail.status === 401, `Got ${unauthDetail.status}`);

  // POST
  const unauthPost = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      member: testData.memberId,
      type: "Global",
      level: "Warning 1",
      severity: 1,
      incidentDate: new Date().toISOString(),
      description: "Test unauth",
    }),
  });
  assert("Unauth POST /api/warnings -> 401", unauthPost.status === 401, `Got ${unauthPost.status}`);

  // PATCH
  const unauthPatch = await fetch(`${BASE_URL}/api/warnings/${testData.memberWarningId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "Updated" }),
  });
  assert("Unauth PATCH /api/warnings/:id -> 401", unauthPatch.status === 401, `Got ${unauthPatch.status}`);

  // -------------------------------------------------------------
  // 2. Member Role Checks (VIEW_WARNINGS=true, MANAGE_WARNINGS=false)
  // -------------------------------------------------------------
  console.log("\n--- Group 2: Member Role Tests ---");

  // GET list: Member can view warnings
  const memberListRes = await fetch(`${BASE_URL}/api/warnings`, {
    headers: { Cookie: memberAuth.cookie }
  });
  const memberListData = await memberListRes.json();
  assert("Member GET /api/warnings -> 200", memberListRes.status === 200, `Got ${memberListRes.status}`);
  // Privacy check: standard member must only see their own warnings
  const onlyOwn = memberListData.data && memberListData.data.every(w => {
    const memId = typeof w.member === "object" ? w.member._id : w.member;
    return memId === testData.memberId;
  });
  assert("Member only sees own warnings in list", onlyOwn, `Returned count: ${memberListData.data?.length}`);

  // GET detail (own warning) -> 200
  const memberOwnRes = await fetch(`${BASE_URL}/api/warnings/${testData.memberWarningId}`, {
    headers: { Cookie: memberAuth.cookie }
  });
  assert("Member GET own /api/warnings/:id -> 200", memberOwnRes.status === 200, `Got ${memberOwnRes.status}`);

  // GET detail (other member's warning) -> 403
  const memberOtherRes = await fetch(`${BASE_URL}/api/warnings/${testData.otherWarningId}`, {
    headers: { Cookie: memberAuth.cookie }
  });
  assert("Member GET other member's /api/warnings/:id -> 403", memberOtherRes.status === 403, `Got ${memberOtherRes.status}`);

  // POST: Member cannot create warnings -> 403
  const memberPostRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberAuth.cookie },
    body: JSON.stringify({
      member: testData.otherMemberId,
      type: "Global",
      level: "Warning 1",
      severity: 1,
      incidentDate: new Date().toISOString(),
      description: "Member attempting creation",
    }),
  });
  assert("Member POST /api/warnings -> 403 (MANAGE_WARNINGS forbidden)", memberPostRes.status === 403, `Got ${memberPostRes.status}`);

  // PATCH: Member cannot edit warnings -> 403
  const memberPatchRes = await fetch(`${BASE_URL}/api/warnings/${testData.memberWarningId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: memberAuth.cookie },
    body: JSON.stringify({ description: "Member editing" }),
  });
  assert("Member PATCH /api/warnings/:id -> 403 (MANAGE_WARNINGS forbidden)", memberPatchRes.status === 403, `Got ${memberPatchRes.status}`);

  // -------------------------------------------------------------
  // 3. Validation Tests (via Team Leader or Admin)
  // -------------------------------------------------------------
  console.log("\n--- Group 3: Business Validation Tests ---");

  // Rule 1: Project Warning without project -> 400
  const noProjectRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      member: testData.memberId,
      type: "Project", // Missing project
      level: "Warning 1",
      severity: 1,
      incidentDate: new Date().toISOString(),
      description: "Project warning without project ID",
    }),
  });
  const noProjectData = await noProjectRes.json();
  assert("Project Warning without project -> 400", noProjectRes.status === 400, `Got ${noProjectRes.status}: ${noProjectData.message}`);

  // Rule 2: Global Warning with project -> 400
  const globalWithProjectRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      member: testData.memberId,
      project: testData.projectId, // Invalid for Global
      type: "Global",
      level: "Warning 1",
      severity: 1,
      incidentDate: new Date().toISOString(),
      description: "Global warning with project ID",
    }),
  });
  const globalWithProjectData = await globalWithProjectRes.json();
  assert("Global Warning with project -> 400", globalWithProjectRes.status === 400, `Got ${globalWithProjectRes.status}: ${globalWithProjectData.message}`);

  // Rule 3: Direct Final Warning without reason -> 400
  const directFinalNoReasonRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      member: testData.memberId,
      type: "Global",
      level: "Final Warning",
      severity: 3,
      isDirectFinalWarning: true,
      // directIssuanceReason missing
      incidentDate: new Date().toISOString(),
      description: "Direct final warning without justification reason",
    }),
  });
  const directFinalNoReasonData = await directFinalNoReasonRes.json();
  assert("Direct Final Warning without directIssuanceReason -> 400", directFinalNoReasonRes.status === 400, `Got ${directFinalNoReasonRes.status}: ${directFinalNoReasonData.message}`);

  // -------------------------------------------------------------
  // 4. Team Leader Role Checks
  // -------------------------------------------------------------
  console.log("\n--- Group 4: Team Leader Role Tests ---");

  // GET list -> 200
  const leaderListRes = await fetch(`${BASE_URL}/api/warnings`, {
    headers: { Cookie: leaderAuth.cookie }
  });
  assert("Team Leader GET /api/warnings -> 200", leaderListRes.status === 200, `Got ${leaderListRes.status}`);

  // GET detail -> 200
  const leaderDetailRes = await fetch(`${BASE_URL}/api/warnings/${testData.memberWarningId}`, {
    headers: { Cookie: leaderAuth.cookie }
  });
  assert("Team Leader GET /api/warnings/:id -> 200", leaderDetailRes.status === 200, `Got ${leaderDetailRes.status}`);

  // POST: Create valid Project Warning
  let createdWarningIdLeader = "";
  const leaderPostRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      member: testData.memberId,
      project: testData.projectId,
      type: "Project",
      level: "Warning 1",
      severity: 1,
      incidentDate: new Date().toISOString(),
      description: "Team leader created project warning for repeated unexcused absence",
      // Security test: try to spoof issuedBy as another member
      issuedBy: testData.adminId,
    }),
  });
  const leaderPostData = await leaderPostRes.json();
  assert("Team Leader POST /api/warnings -> 201", leaderPostRes.status === 201, `Got ${leaderPostRes.status}: ${leaderPostData.message}`);
  if (leaderPostData.data) {
    createdWarningIdLeader = leaderPostData.data._id;
    // Security check: issuedBy must be leaderId, not spoofed adminId
    const isOwnerLeader = (leaderPostData.data.issuedBy?._id || leaderPostData.data.issuedBy) === testData.leaderId;
    assert("Security: issuedBy is strictly authenticated user, not client input", isOwnerLeader, `issuedBy is ${leaderPostData.data.issuedBy}`);
    assert("Newly created warning status is Pending_Approval", leaderPostData.data.status === "Pending_Approval");
    assert("Active period not set before committee approval (activeUntil is null)", leaderPostData.data.activeUntil === null || leaderPostData.data.activeUntil === undefined);
  }

  // PATCH: Team Leader updates warning description
  const leaderPatchRes = await fetch(`${BASE_URL}/api/warnings/${createdWarningIdLeader}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      description: "Updated description by Team Leader",
      // Security test: try to modify protected field 'status' or 'approvedBy'
      status: "Approved",
      approvedBy: testData.adminId,
    }),
  });
  const leaderPatchData = await leaderPatchRes.json();
  assert("Team Leader PATCH /api/warnings/:id -> 200", leaderPatchRes.status === 200, `Got ${leaderPatchRes.status}`);
  if (leaderPatchData.data) {
    assert("PATCH updated allowed field 'description'", leaderPatchData.data.description === "Updated description by Team Leader");
    assert("Security: PATCH ignored tampering with protected 'status'", leaderPatchData.data.status !== "Approved", `Status was changed to: ${leaderPatchData.data.status}`);
    assert("Security: PATCH ignored tampering with 'approvedBy'", !leaderPatchData.data.approvedBy, `approvedBy was set to: ${leaderPatchData.data.approvedBy}`);
  }

  // -------------------------------------------------------------
  // 5. Admin Role Checks
  // -------------------------------------------------------------
  console.log("\n--- Group 5: Admin Role Tests ---");

  // GET list -> 200
  const adminListRes = await fetch(`${BASE_URL}/api/warnings`, {
    headers: { Cookie: adminAuth.cookie }
  });
  assert("Admin GET /api/warnings -> 200", adminListRes.status === 200, `Got ${adminListRes.status}`);

  // GET detail -> 200
  const adminDetailRes = await fetch(`${BASE_URL}/api/warnings/${testData.otherWarningId}`, {
    headers: { Cookie: adminAuth.cookie }
  });
  assert("Admin GET /api/warnings/:id -> 200", adminDetailRes.status === 200, `Got ${adminDetailRes.status}`);

  // POST: Admin creates Direct Final Warning (with required reason)
  const adminPostRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      member: testData.otherMemberId,
      type: "Global",
      level: "Final Warning",
      severity: 3,
      isDirectFinalWarning: true,
      directIssuanceReason: "Severe breach of ethical and collaboration principles (Clause 7.2)",
      incidentDate: new Date().toISOString(),
      description: "Direct final warning issued by Admin",
    }),
  });
  const adminPostData = await adminPostRes.json();
  assert("Admin POST Direct Final Warning -> 201", adminPostRes.status === 201, `Got ${adminPostRes.status}: ${adminPostData.message}`);
  if (adminPostData.data) {
    assert("Direct Final Warning created with Pending_Approval status", adminPostData.data.status === "Pending_Approval");
    assert("Direct Final Warning has isDirectFinalWarning true", adminPostData.data.isDirectFinalWarning === true);
    assert("Direct Final Warning preserves directIssuanceReason", !!adminPostData.data.directIssuanceReason);
  }

  // PATCH: Admin updates severity and points
  const adminPatchRes = await fetch(`${BASE_URL}/api/warnings/${testData.otherWarningId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      severity: 3,
      points: 3,
      description: "Severity escalated to 3 by Admin",
    }),
  });
  const adminPatchData = await adminPatchRes.json();
  assert("Admin PATCH /api/warnings/:id -> 200", adminPatchRes.status === 200, `Got ${adminPatchRes.status}`);
  if (adminPatchData.data) {
    assert("Admin PATCH updated severity and points", adminPatchData.data.severity === 3 && adminPatchData.data.points === 3);
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
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
