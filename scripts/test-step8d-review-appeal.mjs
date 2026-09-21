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

  // 1. Admin 1 (Approver for some warnings)
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

  // 2. Admin 2 (Neutral Reviewer)
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

  // 3. Team Leader 1 (Issuer for some warnings)
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

  // 4. Standard Member 1 (Subject of appeals)
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

  // 5. Standard Member 2 (Other Member)
  const member2Res = await membersCol.findOneAndUpdate(
    { email: "member2@example.com" },
    {
      $set: {
        name: "Standard Member Two",
        email: "member2@example.com",
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
    { title: "Review Test Project" },
    {
      $set: {
        title: "Review Test Project",
        description: "Project for Warning Review / Appeal Tests",
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
  const member1Id = (member1Res?._id || member1Res?.value?._id).toString();
  const member2Id = (member2Res?._id || member2Res?.value?._id).toString();
  const projectId = (projectRes?._id || projectRes?.value?._id).toString();

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  // Warning 1: Active, notified 2 days ago (Valid within 7-day window for appeal)
  const warnValidAppeal = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: twoDaysAgo,
    description: "Warning eligible for appeal",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(leader1Id),
    approvedBy: new mongoose.Types.ObjectId(admin1Id),
    approvedAt: twoDaysAgo,
    notifiedAt: twoDaysAgo,
    activeFrom: twoDaysAgo,
    activeUntil: new Date(twoDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
    review: {
      status: "None",
      requestedAt: null,
      reason: "",
      appealDeadline: new Date(twoDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
      decision: null,
      decisionNotes: "",
      decidedAt: null,
      decidedBy: [],
      disciplinaryRecommendation: "None",
    },
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  });

  // Warning 2: Active, notified 10 days ago (Expired 7-day appeal window)
  const warnExpiredAppeal = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: tenDaysAgo,
    description: "Warning with expired appeal window",
    status: "Active",
    issuedBy: new mongoose.Types.ObjectId(leader1Id),
    approvedBy: new mongoose.Types.ObjectId(admin1Id),
    approvedAt: tenDaysAgo,
    notifiedAt: tenDaysAgo,
    activeFrom: tenDaysAgo,
    activeUntil: new Date(tenDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
    review: {
      status: "None",
      requestedAt: null,
      reason: "",
      appealDeadline: new Date(tenDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
      decision: null,
      decisionNotes: "",
      decidedAt: null,
      decidedBy: [],
      disciplinaryRecommendation: "None",
    },
    createdAt: tenDaysAgo,
    updatedAt: tenDaysAgo,
  });

  // Warning 3: Under_Review (For Neutrality Tests: Confirm, Cancel, Reduce, Improvement_Plan, Reinvestigate)
  const warnUnderReview = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 2",
    severity: 2,
    points: 2,
    incidentDate: twoDaysAgo,
    description: "Warning currently under review",
    status: "Under_Review",
    issuedBy: new mongoose.Types.ObjectId(leader1Id),
    approvedBy: new mongoose.Types.ObjectId(admin1Id),
    approvedAt: twoDaysAgo,
    notifiedAt: twoDaysAgo,
    activeFrom: twoDaysAgo,
    activeUntil: new Date(twoDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
    review: {
      status: "Requested",
      requestedAt: now,
      reason: "Member submitted medical documentation proving absence was fully justified.",
      appealDeadline: new Date(twoDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
      decision: null,
      decisionNotes: "",
      decidedAt: null,
      decidedBy: [],
      disciplinaryRecommendation: "None",
    },
    createdAt: twoDaysAgo,
    updatedAt: now,
  });

  // Warning 4: Another Under_Review warning for Cancel decision
  const warnForCancel = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: twoDaysAgo,
    description: "Warning under review for cancel test",
    status: "Under_Review",
    issuedBy: new mongoose.Types.ObjectId(leader1Id),
    approvedBy: new mongoose.Types.ObjectId(admin1Id),
    approvedAt: twoDaysAgo,
    notifiedAt: twoDaysAgo,
    activeFrom: twoDaysAgo,
    activeUntil: new Date(twoDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
    review: {
      status: "Requested",
      requestedAt: now,
      reason: "Factual error in initial incident report.",
      appealDeadline: new Date(twoDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
      decision: null,
      decisionNotes: "",
      decidedAt: null,
      decidedBy: [],
      disciplinaryRecommendation: "None",
    },
    createdAt: twoDaysAgo,
    updatedAt: now,
  });

  // Warning 5: Another Under_Review warning for Reinvestigate decision
  const warnForReinvestigate = await warningsCol.insertOne({
    member: new mongoose.Types.ObjectId(member1Id),
    project: new mongoose.Types.ObjectId(projectId),
    type: "Project",
    level: "Warning 1",
    severity: 1,
    points: 1,
    incidentDate: twoDaysAgo,
    description: "Warning under review for reinvestigation test",
    status: "Under_Review",
    issuedBy: new mongoose.Types.ObjectId(leader1Id),
    approvedBy: new mongoose.Types.ObjectId(admin1Id),
    approvedAt: twoDaysAgo,
    notifiedAt: twoDaysAgo,
    activeFrom: twoDaysAgo,
    activeUntil: new Date(twoDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
    review: {
      status: "Requested",
      requestedAt: now,
      reason: "Conflicting testimonies from team members.",
      appealDeadline: new Date(twoDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
      decision: null,
      decisionNotes: "",
      decidedAt: null,
      decidedBy: [],
      disciplinaryRecommendation: "None",
    },
    createdAt: twoDaysAgo,
    updatedAt: now,
  });

  await mongoose.disconnect();

  return {
    admin1Id,
    admin2Id,
    leader1Id,
    member1Id,
    member2Id,
    projectId,
    warnValidAppealId: warnValidAppeal.insertedId.toString(),
    warnExpiredAppealId: warnExpiredAppeal.insertedId.toString(),
    warnUnderReviewId: warnUnderReview.insertedId.toString(),
    warnForCancelId: warnForCancel.insertedId.toString(),
    warnForReinvestigateId: warnForReinvestigate.insertedId.toString(),
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
  console.log("=== Step 8D-2D Review & Appeal Test Suite ===\n");
  const testData = await setupTestData();

  const admin1Auth = await login("admin1@example.com", "password123");
  const admin2Auth = await login("admin2@example.com", "password123");
  const leader1Auth = await login("leader1@example.com", "password123");
  const member1Auth = await login("member1@example.com", "password123");
  const member2Auth = await login("member2@example.com", "password123");

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
  // 1. Appeal Request Rules (POST /api/warnings/:id/review)
  // =========================================================================
  console.log("--- Group 1: Appeal Submission & 7-Day Window Rules ---");

  // 1.1 Unauthenticated -> 401
  const unauthRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnValidAppealId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "Valid reason" }),
  });
  assert("Unauthenticated POST /review -> 401", unauthRes.status === 401);

  // 1.2 Missing / Empty Reason -> 400
  const noReasonRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnValidAppealId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: member1Auth.cookie },
    body: JSON.stringify({ reason: "   " }),
  });
  const noReasonData = await noReasonRes.json();
  assert("Appeal without reason -> 400", noReasonRes.status === 400, noReasonData.message);

  // 1.3 Other Member attempting to appeal someone else's warning -> 403
  const otherMemberRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnValidAppealId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: member2Auth.cookie },
    body: JSON.stringify({ reason: "Appealing on behalf of colleague" }),
  });
  assert("Other member appealing warning -> 403", otherMemberRes.status === 403);

  // 1.4 Expired 7-Day appeal window -> 400
  const expiredRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnExpiredAppealId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: member1Auth.cookie },
    body: JSON.stringify({ reason: "Late appeal attempt" }),
  });
  const expiredData = await expiredRes.json();
  assert("Appeal submitted after 7 calendar days -> 400", expiredRes.status === 400, expiredData.message);
  assert("Rejection mentions 7-day window expiry", expiredData.message?.includes("7-calendar-day"));

  // 1.5 Valid Appeal Submission within 7 days -> 200
  const validAppealRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnValidAppealId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: member1Auth.cookie },
    body: JSON.stringify({
      reason: "Deliverable was delayed due to university midterms, as previously communicated via email.",
    }),
  });
  const validAppealData = await validAppealRes.json();
  assert("Valid Appeal Submission within 7 days -> 200", validAppealRes.status === 200, validAppealData.message);
  if (validAppealData.data) {
    const w = validAppealData.data;
    assert("Warning status changed to 'Under_Review'", w.status === "Under_Review");
    assert("review.status set to 'Requested'", w.review?.status === "Requested");
    assert("review.reason preserved", w.review?.reason?.includes("university midterms"));
    assert("review.requestedAt recorded", !!w.review?.requestedAt);
  }

  // 1.6 Duplicate Appeal Attempt -> 400
  const duplicateRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnValidAppealId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: member1Auth.cookie },
    body: JSON.stringify({ reason: "Duplicate appeal attempt" }),
  });
  assert("Duplicate appeal attempt -> 400", duplicateRes.status === 400);

  // =========================================================================
  // 2. Strict Neutrality on Review Decision (POST /api/warnings/:id/review/decision)
  // =========================================================================
  console.log("\n--- Group 2: Neutrality & Conflict of Interest on Review Decision ---");

  // 2.1 Original Issuer (Leader 1) attempting to decide appeal -> 403
  const issuerDecide = await fetch(`${BASE_URL}/api/warnings/${testData.warnUnderReviewId}/review/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: leader1Auth.cookie },
    body: JSON.stringify({ decision: "Confirm", decisionNotes: "Issuer confirming own warning" }),
  });
  const issuerDecideData = await issuerDecide.json();
  assert("Original Issuer cannot decide appeal -> 403", issuerDecide.status === 403, issuerDecideData.message);
  assert("Conflict of interest message for issuer", issuerDecideData.message?.includes("issuer"));

  // 2.2 Original Approver (Admin 1) attempting to decide appeal -> 403
  const approverDecide = await fetch(`${BASE_URL}/api/warnings/${testData.warnUnderReviewId}/review/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin1Auth.cookie },
    body: JSON.stringify({ decision: "Confirm", decisionNotes: "Approver confirming own approval" }),
  });
  const approverDecideData = await approverDecide.json();
  assert("Original Approver cannot decide appeal -> 403", approverDecide.status === 403, approverDecideData.message);
  assert("Conflict of interest message for approver", approverDecideData.message?.includes("approved the original"));

  // 2.3 Subject Member (Member 1) attempting to decide appeal -> 403
  const memberDecide = await fetch(`${BASE_URL}/api/warnings/${testData.warnUnderReviewId}/review/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: member1Auth.cookie },
    body: JSON.stringify({ decision: "Cancel", decisionNotes: "Member attempting to cancel own warning" }),
  });
  assert("Subject member cannot decide appeal -> 403", memberDecide.status === 403);

  // =========================================================================
  // 3. Review Decisions Adjudicated by Neutral Authority (Admin 2)
  // =========================================================================
  console.log("\n--- Group 3: Neutral Review Decision Adjudication ---");

  // 3.1 Neutral Authority decides "Reduce" on warnUnderReview -> 200
  const reduceRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnUnderReviewId}/review/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin2Auth.cookie },
    body: JSON.stringify({
      decision: "Reduce",
      decisionNotes: "Evidence shows legitimate academic mitigating factors; downgraded from Warning 2 to Warning 1.",
      newLevel: "Warning 1",
      newPoints: 1,
      newSeverity: 1,
    }),
  });
  const reduceData = await reduceRes.json();
  assert("Neutral Authority decides 'Reduce' -> 200", reduceRes.status === 200, reduceData.message);
  if (reduceData.data) {
    const w = reduceData.data;
    assert("Status returns to 'Active'", w.status === "Active");
    assert("review.status is 'Completed'", w.review?.status === "Completed");
    assert("review.decision is 'Reduce'", w.review?.decision === "Reduce");
    assert("Warning level downgraded to 'Warning 1'", w.level === "Warning 1");
    assert("Warning points downgraded to 1", w.points === 1);
    assert("review.decidedBy recorded Neutral Admin 2", w.review?.decidedBy?.some(d => (d._id || d) === testData.admin2Id));
  }

  // 3.2 Neutral Authority decides "Cancel" on warnForCancel -> 200
  const cancelRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnForCancelId}/review/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin2Auth.cookie },
    body: JSON.stringify({
      decision: "Cancel",
      decisionNotes: "Review confirmed attendance records were mistakenly attributed; warning is revoked and struck from active record.",
    }),
  });
  const cancelData = await cancelRes.json();
  assert("Neutral Authority decides 'Cancel' -> 200", cancelRes.status === 200, cancelData.message);
  if (cancelData.data) {
    const w = cancelData.data;
    assert("Warning status transitioned to 'Cancelled'", w.status === "Cancelled");
    assert("review.status is 'Completed'", w.review?.status === "Completed");
    assert("review.decision is 'Cancel'", w.review?.decision === "Cancel");
  }

  // 3.3 Neutral Authority decides "Reinvestigate" on warnForReinvestigate -> 200
  const reinvestigateRes = await fetch(`${BASE_URL}/api/warnings/${testData.warnForReinvestigateId}/review/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin2Auth.cookie },
    body: JSON.stringify({
      decision: "Reinvestigate",
      decisionNotes: "Contradictory accounts require interviewing witnesses before final determination.",
    }),
  });
  const reinvestigateData = await reinvestigateRes.json();
  assert("Neutral Authority decides 'Reinvestigate' -> 200", reinvestigateRes.status === 200, reinvestigateData.message);
  if (reinvestigateData.data) {
    const w = reinvestigateData.data;
    assert("Warning status remains 'Under_Review'", w.status === "Under_Review");
    assert("review.status is 'In_Progress'", w.review?.status === "In_Progress");
    assert("review.decision is 'Reinvestigate'", w.review?.decision === "Reinvestigate");
  }

  // =========================================================================
  // 4. State Machine Validation
  // =========================================================================
  console.log("\n--- Group 4: State Machine Enforcement ---");

  // Attempting to decide on an already completed review (warnForCancel is Cancelled / Completed) -> 400
  const repeatDecision = await fetch(`${BASE_URL}/api/warnings/${testData.warnForCancelId}/review/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin2Auth.cookie },
    body: JSON.stringify({ decision: "Confirm", decisionNotes: "Attempting decision on completed review" }),
  });
  assert("Decision on already completed review -> 400", repeatDecision.status === 400);

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
