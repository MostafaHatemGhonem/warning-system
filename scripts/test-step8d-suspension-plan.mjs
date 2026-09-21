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

  // 3. Member 1 (Subject)
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

  // 4. Project
  const projectRes = await projectsCol.findOneAndUpdate(
    { title: "Suspension & Plan Test Project" },
    {
      $set: {
        title: "Suspension & Plan Test Project",
        description: "Project for Suspension and Plan Tests",
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
  const projectId = (projectRes?._id || projectRes?.value?._id).toString();

  const now = new Date();

  // Warning 1: for suspension tests
  const warnSuspension = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(memberId),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 2",
    severity: 2,
    points: 2,
    incidentDate: now,
    description: "Warning for suspension tests",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(leaderId),
    approvedBy: new mongoose.Types.ObjectId(adminId),
    approvedAt: now,
    notifiedAt: now,
    activeFrom: now,
    activeUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    suspension: {
      isSuspended: false,
      suspendedAt: null,
      suspendedUntil: null,
      reason: "",
      reviewedWithin48h: false,
    },
    createdAt: now,
    updatedAt: now,
  });

  // Warning 2: for Improvement Plan tests (Accepted)
  const warnPlanAccepted = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(memberId),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: now,
    description: "Warning for plan acceptance",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(leaderId),
    approvedBy: new mongoose.Types.ObjectId(adminId),
    approvedAt: now,
    notifiedAt: now,
    activeFrom: now,
    activeUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });

  // Warning 3: for Improvement Plan tests (Extended)
  const warnPlanExtended = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(memberId),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: now,
    description: "Warning for plan extension",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(leaderId),
    approvedBy: new mongoose.Types.ObjectId(adminId),
    approvedAt: now,
    notifiedAt: now,
    activeFrom: now,
    activeUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });

  // Warning 4: for Improvement Plan tests (Rejected)
  const warnPlanRejected = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(memberId),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: now,
    description: "Warning for plan rejection",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(leaderId),
    approvedBy: new mongoose.Types.ObjectId(adminId),
    approvedAt: now,
    notifiedAt: now,
    activeFrom: now,
    activeUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });

  await mongoose.disconnect();

  return {
    adminId,
    leaderId,
    memberId,
    projectId,
    warnSuspensionId: warnSuspension.insertedId.toString(),
    warnPlanAcceptedId: warnPlanAccepted.insertedId.toString(),
    warnPlanExtendedId: warnPlanExtended.insertedId.toString(),
    warnPlanRejectedId: warnPlanRejected.insertedId.toString(),
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
  console.log("=== Step 8D-2E Suspension & Improvement Plan Test Suite ===\n");
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
  // 1. Temporary Protective Suspension (≤ 48h)
  // =========================================================================
  console.log("--- Group 1: Temporary Suspension Governance (≤ 48h) ---");

  // 1.1 Unauthenticated -> 401
  const unauthRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "Unauthenticated test", suspensionHours: 24 }),
  });
  assert("Unauthenticated POST /suspension -> 401", unauthRes.status === 401);

  // 1.2 Member cannot suspend self -> 403
  const memberSelfRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberAuth.cookie },
    body: JSON.stringify({ reason: "Self suspend", suspensionHours: 24 }),
  });
  assert("Member cannot suspend -> 403 (Forbidden)", memberSelfRes.status === 403);

  // 1.3 Missing reason -> 400
  const noReasonRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ reason: "", suspensionHours: 24 }),
  });
  assert("Suspension with missing reason -> 400", noReasonRes.status === 400);

  // 1.4 Hours boundary tests:
  // -1h -> 400
  const negHours = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ reason: "Negative hours", suspensionHours: -1 }),
  });
  assert("Suspension with -1h -> 400", negHours.status === 400);

  // 0h -> 400
  const zeroHours = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ reason: "Zero hours", suspensionHours: 0 }),
  });
  assert("Suspension with 0h -> 400", zeroHours.status === 400);

  // 49h -> 400
  const fortyNineHours = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ reason: "49 hours test", suspensionHours: 49 }),
  });
  assert("Suspension with 49h -> 400 (> 48h cap)", fortyNineHours.status === 400);

  // 48.1h -> 400
  const overFractionHours = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ reason: "48.1 hours test", suspensionHours: 48.1 }),
  });
  assert("Suspension with 48.1h -> 400 (> 48h cap)", overFractionHours.status === 400);

  // 47.9h -> 200
  const fractionValid = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({ reason: "47.9 hours protective hold", suspensionHours: 47.9 }),
  });
  assert("Suspension with 47.9h -> 200", fractionValid.status === 200);

  // 48h -> 200
  const fortyEightHours = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      reason: "Precautionary protective measure during serious fact-finding investigation.",
      suspensionHours: 48,
    }),
  });
  const fortyEightData = await fortyEightHours.json();
  assert("Suspension with exactly 48h -> 200", fortyEightHours.status === 200);
  if (fortyEightData.data) {
    const s = fortyEightData.data.suspension;
    assert("suspension.isSuspended is true", s?.isSuspended === true);
    assert("suspension.reason preserved", s?.reason?.includes("fact-finding"));
    assert("warning.status remains 'Active' (suspension does not change warning status)", fortyEightData.data.status === "Active");
  }

  // 1.5 Lift Suspension -> 200
  const liftRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnSuspensionId}/suspension`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookie },
  });
  const liftData = await liftRes.json();
  assert("DELETE /suspension lifts suspension -> 200", liftRes.status === 200);
  if (liftData.data) {
    assert("suspension.isSuspended is now false", liftData.data.suspension?.isSuspended === false);
    assert("suspension.reviewedWithin48h is true", liftData.data.suspension?.reviewedWithin48h === true);
  }

  // =========================================================================
  // 2. Improvement Plan Initiation & Validation
  // =========================================================================
  console.log("\n--- Group 2: Improvement Plan Initiation & Validation ---");

  // 2.1 Duration < 7 days -> 400
  const shortPlan = await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanAcceptedId}/improvement-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      problemSummary: "Poor attendance",
      desiredBehavior: "Regular on-time presence",
      actionSteps: ["Attend standup daily"],
      durationDays: 6, // < 7
      measurableSuccessCriteria: "Zero unexcused absences",
    }),
  });
  assert("Plan duration < 7 days -> 400", shortPlan.status === 400);

  // 2.2 Duration > 60 days -> 400
  const longPlan = await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanAcceptedId}/improvement-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      problemSummary: "Poor attendance",
      desiredBehavior: "Regular on-time presence",
      actionSteps: ["Attend standup daily"],
      durationDays: 61, // > 60
      measurableSuccessCriteria: "Zero unexcused absences",
    }),
  });
  assert("Plan duration > 60 days -> 400", longPlan.status === 400);

  // 2.3 Missing measurable criteria -> 400
  const missingCriteria = await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanAcceptedId}/improvement-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      problemSummary: "Communication issues",
      desiredBehavior: "Proactive communication",
      actionSteps: ["Reply to messages"],
      durationDays: 30,
      measurableSuccessCriteria: "", // Empty
    }),
  });
  assert("Plan with missing measurable criteria -> 400", missingCriteria.status === 400);

  // 2.4 Empty action steps -> 400
  const emptySteps = await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanAcceptedId}/improvement-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      problemSummary: "Communication issues",
      desiredBehavior: "Proactive communication",
      actionSteps: [], // Empty
      durationDays: 30,
      measurableSuccessCriteria: "Respond within 4 hours",
    }),
  });
  assert("Plan with empty action steps -> 400", emptySteps.status === 400);

  // 2.5 Valid Plan Initiation -> 201
  const validPlanRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanAcceptedId}/improvement-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      problemSummary: "Inconsistent sprint deliverable completion.",
      desiredBehavior: "Submit complete deliverables on or before sprint demo dates.",
      actionSteps: [
        "Participate in weekly sprint sync",
        "Submit draft pull requests 48h before deadline",
        "Log impediment flags in project tracker promptly",
      ],
      durationDays: 30,
      measurableSuccessCriteria: "100% of assigned sprint deliverables submitted on time across 4 consecutive sprints.",
      supervisorId: testData.leaderId,
    }),
  });
  const validPlanData = await validPlanRes.json();
  assert("Valid Improvement Plan initiation -> 201", validPlanRes.status === 201);
  if (validPlanData.data) {
    const p = validPlanData.data.improvementPlan;
    assert("improvementPlan.isActive is true", p?.isActive === true);
    assert("improvementPlan.durationDays is 30", p?.durationDays === 30);
    assert("targetCompletionDate is set ~30 days ahead", !!p?.targetCompletionDate);
    assert("review.disciplinaryRecommendation is 'Refer_To_Improvement_Plan'", validPlanData.data.review?.disciplinaryRecommendation === "Refer_To_Improvement_Plan");
  }

  // =========================================================================
  // 3. Improvement Plan Follow-up & Evaluation (Accepted, Extended, Rejected)
  // =========================================================================
  console.log("\n--- Group 3: Improvement Plan Evaluation & Resolution ---");

  // 3.1 Accepted -> Warning transitions to "Resolved"
  const evaluateAccepted = await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanAcceptedId}/improvement-plan/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      finalDecision: "Accepted",
      finalNotes: "Member showed exemplary adherence to the action steps and completed all sprints successfully.",
    }),
  });
  const acceptedData = await evaluateAccepted.json();
  assert("Evaluation 'Accepted' -> 200", evaluateAccepted.status === 200);
  if (acceptedData.data) {
    assert("Warning status transitioned to 'Resolved'", acceptedData.data.status === "Resolved");
    assert("improvementPlan.isActive is false", acceptedData.data.improvementPlan?.isActive === false);
    assert("improvementPlan.finalDecision is 'Accepted'", acceptedData.data.improvementPlan?.finalDecision === "Accepted");
  }

  // 3.2 Extended -> Plan remains active, target completion date extended
  // First initiate plan on warnPlanExtended
  await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanExtendedId}/improvement-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      problemSummary: "Documentation gaps",
      desiredBehavior: "Write thorough task documentation",
      actionSteps: ["Update project wiki weekly"],
      durationDays: 14,
      measurableSuccessCriteria: "All user stories have complete docs",
    }),
  });

  const evaluateExtended = await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanExtendedId}/improvement-plan/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      finalDecision: "Extended",
      finalNotes: "Member showed significant improvement but needs 14 more days to complete documentation backlog.",
      extensionDays: 14,
    }),
  });
  const extendedData = await evaluateExtended.json();
  assert("Evaluation 'Extended' -> 200", evaluateExtended.status === 200);
  if (extendedData.data) {
    assert("improvementPlan.isActive remains true", extendedData.data.improvementPlan?.isActive === true);
    assert("improvementPlan.finalDecision is 'Extended'", extendedData.data.improvementPlan?.finalDecision === "Extended");
    assert("Warning remains in 'Active' state (not resolved yet)", extendedData.data.status === "Active");
  }

  // 3.3 Rejected -> Plan closed, referred to formal disciplinary review, NO automatic removal
  // First initiate plan on warnPlanRejected
  await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanRejectedId}/improvement-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      problemSummary: "Persistent non-collaboration",
      desiredBehavior: "Active participation in team meetings",
      actionSteps: ["Attend all scheduled syncs"],
      durationDays: 14,
      measurableSuccessCriteria: "100% meeting attendance",
    }),
  });

  const evaluateRejected = await fetch(`${BASE_URL}/api/warnings/${testData.warnPlanRejectedId}/improvement-plan/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      finalDecision: "Rejected",
      finalNotes: "Member failed to attend scheduled syncs without prior excuse; plan not completed. Referred to formal committee review.",
    }),
  });
  const rejectedData = await evaluateRejected.json();
  assert("Evaluation 'Rejected' -> 200", evaluateRejected.status === 200);
  if (rejectedData.data) {
    assert("improvementPlan.isActive is false", rejectedData.data.improvementPlan?.isActive === false);
    assert("improvementPlan.finalDecision is 'Rejected'", rejectedData.data.improvementPlan?.finalDecision === "Rejected");
    assert("review.disciplinaryRecommendation set to 'Refer_To_Formal_Removal_Review'", rejectedData.data.review?.disciplinaryRecommendation === "Refer_To_Formal_Removal_Review");
  }

  // Verify Member was NOT automatically removed
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const membersCol = mongoose.connection.db.collection("members");
  const memberDoc = await membersCol.findOne({ _id: new mongoose.Types.ObjectId(testData.memberId) });
  await mongoose.disconnect();
  assert("Member account remains active (isActive: true, NO auto-removal on rejection)", memberDoc?.isActive === true);

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
