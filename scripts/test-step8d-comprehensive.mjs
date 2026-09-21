import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function setupTestData() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const membersCol = mongoose.connection.db.collection("members");
  const projectsCol = mongoose.connection.db.collection("projects");

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("password123", salt);

  // 1. Admin 1 (Committee)
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

  // 2. Team Leader 1 (Issuer)
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

  // 3. Team Leader 2 (Neutral Leader)
  const leader2Res = await membersCol.findOneAndUpdate(
    { email: "leader2@example.com" },
    {
      $set: {
        name: "Team Leader Two",
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

  // 4. Standard Member
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

  // 5. Test Project
  const projectRes = await projectsCol.findOneAndUpdate(
    { title: "E2E Governance Project" },
    {
      $set: {
        title: "E2E Governance Project",
        description: "Project for Full Warning Lifecycle",
        status: "In_Progress",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  const admin1Id = (admin1Res?._id || admin1Res?.value?._id).toString();
  const leader1Id = (leader1Res?._id || leader1Res?.value?._id).toString();
  const leader2Id = (leader2Res?._id || leader2Res?.value?._id).toString();
  const member1Id = (member1Res?._id || member1Res?.value?._id).toString();
  const projectId = (projectRes?._id || projectRes?.value?._id).toString();

  await mongoose.disconnect();

  return { admin1Id, leader1Id, leader2Id, member1Id, projectId };
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
  console.log("=== Comprehensive End-to-End Warning System Lifecycle Test ===\n");
  const testData = await setupTestData();

  const admin1Auth = await login("admin1@example.com", "password123");
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

  // -------------------------------------------------------------------------
  // Stage 1: Warning Creation (W1, Pending_Approval)
  // -------------------------------------------------------------------------
  console.log("--- Stage 1: Issuing Warning ---");
  const createRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leader1Auth.cookie },
    body: JSON.stringify({
      member: testData.member1Id,
      project: testData.projectId,
      type: "Project",
      level: "Warning 1",
      severity: 1,
      incidentDate: new Date().toISOString(),
      description: "E2E lifecycle test warning",
    }),
  });
  const createData = await createRes.json();
  assert("Warning 1 created by Leader 1 -> 201", createRes.status === 201);
  const warningId = createData.data?._id;
  assert("Initial status is 'Pending_Approval'", createData.data?.status === "Pending_Approval");

  // -------------------------------------------------------------------------
  // Stage 2: Neutral Approval & Validity Activation
  // -------------------------------------------------------------------------
  console.log("\n--- Stage 2: Neutral Approval ---");
  // Conflict of interest check: Leader 1 cannot approve own warning
  const issuerApprove = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: { Cookie: leader1Auth.cookie },
  });
  assert("Issuer Leader 1 cannot approve own warning -> 403", issuerApprove.status === 403);

  // Neutral Leader 2 approves
  const neutralApprove = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: { Cookie: leader2Auth.cookie },
  });
  const neutralApproveData = await neutralApprove.json();
  assert("Neutral Leader 2 approves warning -> 200", neutralApprove.status === 200);
  assert("Warning status is now 'Active'", neutralApproveData.data?.status === "Active");
  assert("notifiedAt is set", !!neutralApproveData.data?.notifiedAt);
  assert("appealDeadline is set 7 days ahead", !!neutralApproveData.data?.review?.appealDeadline);

  // -------------------------------------------------------------------------
  // Stage 3: Protective Temporary Suspension (≤ 48h)
  // -------------------------------------------------------------------------
  console.log("\n--- Stage 3: Temporary Suspension ---");
  const suspendRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin1Auth.cookie },
    body: JSON.stringify({ reason: "Protective precautionary measure", suspensionHours: 24 }),
  });
  const suspendData = await suspendRes.json();
  assert("Apply 24h protective suspension -> 200", suspendRes.status === 200);
  assert("suspension.isSuspended is true", suspendData.data?.suspension?.isSuspended === true);
  assert("Warning status remains 'Active' (suspension independent)", suspendData.data?.status === "Active");

  // Lift suspension
  const liftRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/suspension`, {
    method: "DELETE",
    headers: { Cookie: admin1Auth.cookie },
  });
  const liftData = await liftRes.json();
  assert("Lift suspension -> 200", liftRes.status === 200);
  assert("suspension.isSuspended is false", liftData.data?.suspension?.isSuspended === false);

  // -------------------------------------------------------------------------
  // Stage 4: Single Extension Limit
  // -------------------------------------------------------------------------
  console.log("\n--- Stage 4: Extension Governance ---");
  const extendRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leader2Auth.cookie },
    body: JSON.stringify({ extensionDays: 14, reason: "Educational midterm extension" }),
  });
  const extendData = await extendRes.json();
  assert("Single extension (14 days) -> 200", extendRes.status === 200);
  assert("Warning status is 'Extended'", extendData.data?.status === "Extended");

  // Second extension attempt is blocked
  const secondExtend = await fetch(`${BASE_URL}/api/warnings/${warningId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leader2Auth.cookie },
    body: JSON.stringify({ extensionDays: 7, reason: "Second extension attempt" }),
  });
  assert("Second extension blocked -> 400", secondExtend.status === 400);

  // -------------------------------------------------------------------------
  // Stage 5: Appeal Request & Neutral Review
  // -------------------------------------------------------------------------
  console.log("\n--- Stage 5: Review / Appeal ---");
  const appealRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: member1Auth.cookie },
    body: JSON.stringify({ reason: "Member requests review and offers commitment to structured improvement" }),
  });
  const appealData = await appealRes.json();
  assert("Member submits appeal within 7-day window -> 200", appealRes.status === 200);
  assert("Warning status is 'Under_Review'", appealData.data?.status === "Under_Review");

  // Neutral Admin decides Improvement_Plan
  const reviewDecisionRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/review/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin1Auth.cookie },
    body: JSON.stringify({
      decision: "Improvement_Plan",
      decisionNotes: "Review committee refers member to a 30-day structured improvement plan.",
    }),
  });
  const reviewDecisionData = await reviewDecisionRes.json();
  assert("Neutral Admin adjudicates 'Improvement_Plan' -> 200", reviewDecisionRes.status === 200);
  assert("Warning status is 'Active'", reviewDecisionData.data?.status === "Active");
  assert("review.decision is 'Improvement_Plan'", reviewDecisionData.data?.review?.decision === "Improvement_Plan");

  // -------------------------------------------------------------------------
  // Stage 6: Improvement Plan Lifecycle & Graduation to Resolved
  // -------------------------------------------------------------------------
  console.log("\n--- Stage 6: Improvement Plan & Resolution ---");
  const initPlanRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/improvement-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin1Auth.cookie },
    body: JSON.stringify({
      problemSummary: "Delivery turnaround delays",
      desiredBehavior: "Timely delivery and proactive communication",
      actionSteps: ["Attend daily standup", "Submit deliverables 24h ahead of demo"],
      durationDays: 30,
      measurableSuccessCriteria: "Complete all assigned tasks over 4 sprints",
      supervisorId: testData.leader2Id,
    }),
  });
  const initPlanData = await initPlanRes.json();
  assert("Initiate Improvement Plan -> 201", initPlanRes.status === 201);
  assert("improvementPlan.isActive is true", initPlanData.data?.improvementPlan?.isActive === true);

  // Evaluate as Accepted -> Warning graduates to Resolved
  const evalPlanRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/improvement-plan/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin1Auth.cookie },
    body: JSON.stringify({
      finalDecision: "Accepted",
      finalNotes: "Member met all success criteria and improved communication consistently.",
    }),
  });
  const evalPlanData = await evalPlanRes.json();
  assert("Evaluate plan as 'Accepted' -> 200", evalPlanRes.status === 200);
  assert("Warning status successfully transitions to 'Resolved'", evalPlanData.data?.status === "Resolved");
  assert("improvementPlan.isActive is false", evalPlanData.data?.improvementPlan?.isActive === false);

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n==========================================");
  console.log(`E2E Lifecycle Test Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("E2E Test execution fatal error:", err);
  process.exit(1);
});
