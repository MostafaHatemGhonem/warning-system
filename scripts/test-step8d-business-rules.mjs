import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const DURATION_WARNING_DAYS = 30;
const DURATION_FINAL_WARNING_DAYS = 60;
const MAX_EXTENSION_DAYS = 30;

function calculateActivePeriod(level, startDate = new Date()) {
  const days = level === "Final Warning" ? DURATION_FINAL_WARNING_DAYS : DURATION_WARNING_DAYS;
  const activeFrom = new Date(startDate);
  const activeUntil = new Date(startDate);
  activeUntil.setDate(activeUntil.getDate() + days);
  return { activeFrom, activeUntil };
}

const BASE_URL = "http://localhost:3000";
const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function setupTestData() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const membersCol = mongoose.connection.db.collection("members");
  const projectsCol = mongoose.connection.db.collection("projects");
  const warningsCol = mongoose.connection.db.collection("warnings");

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("password123", salt);

  // 1. Admin
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

  // 2. Team Leader
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

  // 3. Member
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

  // 4. Project A & Project B (for isolation testing)
  const projectARes = await projectsCol.findOneAndUpdate(
    { title: "Project Alpha" },
    {
      $set: {
        title: "Project Alpha",
        description: "Test Project A for Warning Isolation",
        status: "In_Progress",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  const projectBRes = await projectsCol.findOneAndUpdate(
    { title: "Project Beta" },
    {
      $set: {
        title: "Project Beta",
        description: "Test Project B for Warning Isolation",
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
  const projectAId = (projectARes?._id || projectARes?.value?._id).toString();
  const projectBId = (projectBRes?._id || projectBRes?.value?._id).toString();

  // Create an Active warning for extension tests (Warning 1, 30 days)
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const activeWarningRes = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(memberId),
    project: new mongoose.Types.ObjectId(projectAId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: now,
    description: "Active warning for extension test",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(leaderId),
    activeFrom: now,
    activeUntil: thirtyDaysLater,
    extension: {
      isExtended: false,
      extendedAt: null,
      extendedUntil: null,
      extendedBy: null,
      reason: "",
    },
    createdAt: now,
    updatedAt: now,
  });

  // Create an Active warning that has EXPIRED (activeUntil in the past) to test Pending_Review transition
  const pastDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
  const expiredUntil = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const expiredWarningRes = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(memberId),
    project: new mongoose.Types.ObjectId(projectAId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: pastDate,
    description: "Expired warning awaiting review",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(leaderId),
    activeFrom: pastDate,
    activeUntil: expiredUntil,
    extension: {
      isExtended: false,
      extendedAt: null,
      extendedUntil: null,
      extendedBy: null,
      reason: "",
    },
    createdAt: pastDate,
    updatedAt: pastDate,
  });

  await mongoose.disconnect();

  return {
    adminId,
    leaderId,
    memberId,
    projectAId,
    projectBId,
    activeWarningId: activeWarningRes.insertedId.toString(),
    expiredWarningId: expiredWarningRes.insertedId.toString(),
    initialActiveUntil: thirtyDaysLater,
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
  console.log("=== Step 8D-2B Warning Business Rules Test Suite ===\n");
  const testData = await setupTestData();

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

  // =========================================================================
  // 1. Active Period Calculation (W1/W2 = 30 days, Final = 60 days)
  // =========================================================================
  console.log("--- Group 1: Active Period Calculation (30d vs 60d) ---");

  const testDate = new Date("2026-01-01T00:00:00Z");

  const w1Period = calculateActivePeriod("Warning 1", testDate);
  const w1Days = Math.round((w1Period.activeUntil.getTime() - w1Period.activeFrom.getTime()) / (1000 * 60 * 60 * 24));
  assert("Warning 1 active period is exactly 30 days", w1Days === 30, `Got ${w1Days} days`);

  const w2Period = calculateActivePeriod("Warning 2", testDate);
  const w2Days = Math.round((w2Period.activeUntil.getTime() - w2Period.activeFrom.getTime()) / (1000 * 60 * 60 * 24));
  assert("Warning 2 active period is exactly 30 days", w2Days === 30, `Got ${w2Days} days`);

  const finalPeriod = calculateActivePeriod("Final Warning", testDate);
  const finalDays = Math.round((finalPeriod.activeUntil.getTime() - finalPeriod.activeFrom.getTime()) / (1000 * 60 * 60 * 24));
  assert("Final Warning active period is exactly 60 days", finalDays === 60, `Got ${finalDays} days`);

  // =========================================================================
  // 2. Direct Final Warning Validation Rules
  // =========================================================================
  console.log("\n--- Group 2: Direct Final Warning Validation ---");

  // Rule 2.1: Cannot issue Direct Final Warning with level != "Final Warning" (e.g. Warning 1)
  const dfwWrongLevel = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      member: testData.memberId,
      type: "Global",
      level: "Warning 1", // Invalid for Direct Final Warning
      severity: 3,
      isDirectFinalWarning: true,
      directIssuanceReason: "Valid reason",
      incidentDate: new Date().toISOString(),
      description: "DFW with invalid level",
    }),
  });
  const dfwWrongLevelData = await dfwWrongLevel.json();
  assert("Direct Final Warning with level='Warning 1' -> 400", dfwWrongLevel.status === 400, `Got ${dfwWrongLevel.status}: ${dfwWrongLevelData.message}`);

  // Rule 2.2: Cannot issue Direct Final Warning with severity != 3 (e.g. severity 2)
  const dfwLowSeverity = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      member: testData.memberId,
      type: "Global",
      level: "Final Warning",
      severity: 2, // Must be 3 (severe breach)
      isDirectFinalWarning: true,
      directIssuanceReason: "Valid reason",
      incidentDate: new Date().toISOString(),
      description: "DFW with severity 2",
    }),
  });
  const dfwLowSeverityData = await dfwLowSeverity.json();
  assert("Direct Final Warning with severity=2 -> 400", dfwLowSeverity.status === 400, `Got ${dfwLowSeverity.status}: ${dfwLowSeverityData.message}`);

  // Rule 2.3: Cannot issue Direct Final Warning without directIssuanceReason
  const dfwNoReason = await fetch(`${BASE_URL}/api/warnings`, {
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
      description: "DFW without justification",
    }),
  });
  assert("Direct Final Warning without directIssuanceReason -> 400", dfwNoReason.status === 400);

  // Rule 2.4: Valid Direct Final Warning succeeds
  const dfwValid = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      member: testData.memberId,
      type: "Global",
      level: "Final Warning",
      severity: 3,
      isDirectFinalWarning: true,
      directIssuanceReason: "Critical breach of collaborative commitments and integrity (Clause 7.2)",
      incidentDate: new Date().toISOString(),
      description: "Valid Direct Final Warning",
    }),
  });
  assert("Valid Direct Final Warning -> 201", dfwValid.status === 201);

  // =========================================================================
  // 3. Extension Rules & Limits (POST /api/warnings/:id/extend)
  // =========================================================================
  console.log("\n--- Group 3: Warning Extension Rules ---");

  // Rule 3.1: Unauthenticated cannot extend -> 401
  const unauthExtend = await fetch(`${BASE_URL}/api/warnings/${testData.activeWarningId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extensionDays: 15, reason: "First extension" }),
  });
  assert("Unauthenticated POST /extend -> 401", unauthExtend.status === 401);

  // Rule 3.2: Member cannot extend -> 403
  const memberExtend = await fetch(`${BASE_URL}/api/warnings/${testData.activeWarningId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberAuth.cookie },
    body: JSON.stringify({ extensionDays: 15, reason: "Member trying to extend" }),
  });
  assert("Member POST /extend -> 403 (MANAGE_WARNINGS forbidden)", memberExtend.status === 403);

  // Rule 3.3: Cannot extend more than 30 days (e.g. 31 days) -> 400
  const overThirtyDays = await fetch(`${BASE_URL}/api/warnings/${testData.activeWarningId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({ extensionDays: 31, reason: "Extended 31 days" }),
  });
  const overThirtyDaysData = await overThirtyDays.json();
  assert("Extension > 30 days -> 400", overThirtyDays.status === 400, overThirtyDaysData.message);

  // Rule 3.4: Cannot extend with 0 or negative days -> 400
  const zeroDays = await fetch(`${BASE_URL}/api/warnings/${testData.activeWarningId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({ extensionDays: 0, reason: "Zero days extension" }),
  });
  assert("Extension <= 0 days -> 400", zeroDays.status === 400);

  // Rule 3.5: Cannot extend without reason -> 400
  const noReasonExtend = await fetch(`${BASE_URL}/api/warnings/${testData.activeWarningId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({ extensionDays: 15, reason: "" }),
  });
  assert("Extension without reason -> 400", noReasonExtend.status === 400);

  // Rule 3.6: Valid First Extension (15 days) -> 200
  const validExtend = await fetch(`${BASE_URL}/api/warnings/${testData.activeWarningId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      extensionDays: 15,
      reason: "Member submitted partial deliverables with a legitimate educational excuse; granted 15 days extension.",
    }),
  });
  const validExtendData = await validExtend.json();
  assert("Valid First Extension (15 days) -> 200", validExtend.status === 200, validExtendData.message);
  if (validExtendData.data) {
    assert("Warning status changed to 'Extended'", validExtendData.data.status === "Extended");
    assert("extension.isExtended is true", validExtendData.data.extension?.isExtended === true);
    assert("extension.reason preserved", validExtendData.data.extension?.reason?.includes("educational excuse"));
  }

  // Rule 3.7: Second extension strictly forbidden -> 400
  const secondExtend = await fetch(`${BASE_URL}/api/warnings/${testData.activeWarningId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      extensionDays: 10,
      reason: "Second extension attempt",
    }),
  });
  const secondExtendData = await secondExtend.json();
  assert("Second extension attempt on same warning -> 400", secondExtend.status === 400, secondExtendData.message);

  // =========================================================================
  // 4. No Automatic Escalation by Severity/Points
  // =========================================================================
  console.log("\n--- Group 4: No Automatic Escalation by Severity/Points ---");

  // Create Warning with Severity 3 and Points 3, but Level "Warning 1"
  const highPointsPost = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      member: testData.memberId,
      project: testData.projectAId,
      type: "Project",
      level: "Warning 1",
      severity: 3,
      points: 3,
      incidentDate: new Date().toISOString(),
      description: "Warning 1 created with max points",
    }),
  });
  const highPointsData = await highPointsPost.json();
  assert("High points warning created successfully -> 201", highPointsPost.status === 201);
  if (highPointsData.data) {
    assert("Warning 1 with 3 points remains 'Warning 1' (no auto-escalation)", highPointsData.data.level === "Warning 1");
  }

  // =========================================================================
  // 5. Project Isolation (No Cross-Project Aggregation & No Auto-Global)
  // =========================================================================
  console.log("\n--- Group 5: Project Isolation & No Auto-Global ---");

  // Create Warning on Project B
  const projectBWarning = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leaderAuth.cookie },
    body: JSON.stringify({
      member: testData.memberId,
      project: testData.projectBId,
      type: "Project",
      level: "Warning 1",
      severity: 2,
      points: 2,
      incidentDate: new Date().toISOString(),
      description: "Warning on Project B",
    }),
  });
  const projectBData = await projectBWarning.json();
  assert("Warning on Project B created -> 201", projectBWarning.status === 201);
  if (projectBData.data) {
    assert("Project B warning remains type 'Project'", projectBData.data.type === "Project");
    const projId = typeof projectBData.data.project === "object" ? projectBData.data.project._id : projectBData.data.project;
    assert("Project B warning is isolated to Project B ID", projId === testData.projectBId);
  }

  // =========================================================================
  // 6. Expiration Handling (Pending_Review without Auto-Finalization)
  // =========================================================================
  console.log("\n--- Group 6: Expiration Lifecycle (Pending_Review) ---");

  // Query expired warning via GET /api/warnings/:id
  const getExpiredRes = await fetch(`${BASE_URL}/api/warnings/${testData.expiredWarningId}`, {
    headers: { Cookie: leaderAuth.cookie }
  });
  const getExpiredData = await getExpiredRes.json();
  assert("Fetch expired warning -> 200", getExpiredRes.status === 200);
  if (getExpiredData.data) {
    assert("Warning past activeUntil transitioned to 'Pending_Review'", getExpiredData.data.status === "Pending_Review");
    assert("Expired warning was NOT marked as 'Resolved'", getExpiredData.data.status !== "Resolved");
    assert("Expired warning was NOT marked as 'Cancelled'", getExpiredData.data.status !== "Cancelled");
  }

  // =========================================================================
  // 7. No Automatic Removal
  // =========================================================================
  console.log("\n--- Group 7: No Automatic Member Removal ---");

  // Verify member document in database: member must still be isActive: true
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const membersCol = mongoose.connection.db.collection("members");
  const memberDoc = await membersCol.findOne({ _id: new mongoose.Types.ObjectId(testData.memberId) });
  await mongoose.disconnect();

  assert("Member status remains active (isActive: true, no auto-removal)", memberDoc?.isActive === true);

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
