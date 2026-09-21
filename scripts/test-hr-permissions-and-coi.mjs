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

async function runTests() {
  console.log("=== Testing HR Governance, Permissions Matrix & Conflict of Interest (COI) ===");

  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;
  const membersCol = db.collection("members");
  const projectsCol = db.collection("projects");
  const warningsCol = db.collection("warnings");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  // 1. Setup Test Users
  // Super Admin
  const superAdmin = await membersCol.findOne({ email: "mostafahatemghonem@gmail.com" });
  if (!superAdmin) {
    console.error("FAIL: Super Admin not found");
    process.exit(1);
  }

  // HR Officer
  const hrUserRes = await membersCol.findOneAndUpdate(
    { email: "hr_test@example.com" },
    {
      $set: {
        name: "Sara HR Officer",
        email: "hr_test@example.com",
        role: "HR",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  // Committee Member (Neutral)
  const committeeUserRes = await membersCol.findOneAndUpdate(
    { email: "committee_test@example.com" },
    {
      $set: {
        name: "Dr. Khaled Committee",
        email: "committee_test@example.com",
        role: "Committee",
        isCommitteeMember: true,
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  // Team Leader (Issuer)
  const leaderRes = await membersCol.findOneAndUpdate(
    { email: "lead_issuer@example.com" },
    {
      $set: {
        name: "Lead Tarek Issuer",
        email: "lead_issuer@example.com",
        role: "Team Leader",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  // Subject Member
  const subjectRes = await membersCol.findOneAndUpdate(
    { email: "subject_dev@example.com" },
    {
      $set: {
        name: "Junior Dev Subject",
        email: "subject_dev@example.com",
        role: "Member",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  // Test Project
  const projectRes = await projectsCol.findOneAndUpdate(
    { name: "COI Governance Test Project" },
    {
      $set: {
        name: "COI Governance Test Project",
        description: "Test project for authorization and conflict of interest",
        status: "active",
        members: [
          (leaderRes?._id || leaderRes?.value?._id),
          (subjectRes?._id || subjectRes?.value?._id),
        ],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  const hrId = (hrUserRes?._id || hrUserRes?.value?._id).toString();
  const committeeId = (committeeUserRes?._id || committeeUserRes?.value?._id).toString();
  const leaderId = (leaderRes?._id || leaderRes?.value?._id).toString();
  const subjectId = (subjectRes?._id || subjectRes?.value?._id).toString();
  const projectId = (projectRes?._id || projectRes?.value?._id).toString();

  // Obtain login sessions
  const hrSession = await login("hr_test@example.com");
  const committeeSession = await login("committee_test@example.com");
  const leaderSession = await login("lead_issuer@example.com");
  const subjectSession = await login("subject_dev@example.com");
  const superAdminSession = await login("mostafahatemghonem@gmail.com");

  console.log("\n--- Scenario 1: Warning Creation (W1 / W2 and Final Warning) ---");
  // Team Leader issues a Final Warning (held in Pending_Approval)
  const createWarningRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: leaderSession.cookie,
    },
    body: JSON.stringify({
      member: subjectId,
      project: projectId,
      type: "Project",
      level: "Final Warning",
      severity: 3,
      points: 3,
      incidentDate: new Date().toISOString(),
      description: "Severe code deployment violation bypassing safety checks.",
      isDirectFinalWarning: true,
      directIssuanceReason: "High-risk production incident.",
    }),
  });

  const createWarningData = await createWarningRes.json();
  if (createWarningRes.status !== 201) {
    console.error("FAIL: Failed to issue warning", createWarningData);
    process.exit(1);
  }
  const warningId = createWarningData.data._id;
  console.log(`[PASS] Final Warning created by Leader (${warningId}) -> Status: Pending_Approval`);

  console.log("\n--- Scenario 2: HR Role Negative Test (Approve Final Warning) ---");
  // HR attempts to approve Final Warning -> MUST return 403 Forbidden
  const hrApproveRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: hrSession.cookie,
    },
  });
  const hrApproveData = await hrApproveRes.json();
  if (hrApproveRes.status === 403) {
    console.log(`[PASS] HR blocked from approving Final Warning -> 403 Forbidden: "${hrApproveData.message}"`);
  } else {
    console.error(`FAIL: HR should be blocked with 403, got ${hrApproveRes.status}`, hrApproveData);
    process.exit(1);
  }

  console.log("\n--- Scenario 3: Conflict of Interest (COI) Rule 2: Issuer cannot approve own warning ---");
  // Original Issuer (Lead Tarek) attempts to approve the warning -> MUST return 403 Forbidden
  const issuerApproveRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: leaderSession.cookie,
    },
  });
  const issuerApproveData = await issuerApproveRes.json();
  if (issuerApproveRes.status === 403) {
    console.log(`[PASS] Issuer blocked from approving own warning -> 403 Forbidden: "${issuerApproveData.message}"`);
  } else {
    console.error(`FAIL: Issuer should be blocked with 403, got ${issuerApproveRes.status}`, issuerApproveData);
    process.exit(1);
  }

  console.log("\n--- Scenario 4: Conflict of Interest (COI) Rule 1: Subject cannot approve warning against self ---");
  // Subject member attempts to approve -> MUST return 403 Forbidden
  const subjectApproveRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: subjectSession.cookie,
    },
  });
  const subjectApproveData = await subjectApproveRes.json();
  if (subjectApproveRes.status === 403) {
    console.log(`[PASS] Subject blocked from approving warning against self -> 403 Forbidden: "${subjectApproveData.message}"`);
  } else {
    console.error(`FAIL: Subject should be blocked with 403, got ${subjectApproveRes.status}`, subjectApproveData);
    process.exit(1);
  }

  console.log("\n--- Scenario 5: Committee Member Neutral Approval ---");
  // Neutral Committee Member (Dr. Khaled) approves the Final Warning -> MUST return 200 OK
  const committeeApproveRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: committeeSession.cookie,
    },
  });
  const committeeApproveData = await committeeApproveRes.json();
  if (committeeApproveRes.status === 200) {
    console.log(`[PASS] Neutral Committee member approved Final Warning -> 200 OK (Status is now Active for 60 days)`);
  } else {
    console.error(`FAIL: Committee member should approve warning, got ${committeeApproveRes.status}`, committeeApproveData);
    process.exit(1);
  }

  console.log("\n--- Scenario 6: Appeal Submission and Adjudication Permissions ---");
  // Subject submits appeal within 7-day window
  const appealSubmitRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: subjectSession.cookie,
    },
    body: JSON.stringify({
      reason: "Emergency deployment hotfix caused by unexpected server crash.",
    }),
  });
  const appealSubmitData = await appealSubmitRes.json();
  if (appealSubmitRes.status === 200) {
    console.log(`[PASS] Subject submitted appeal -> 200 OK (Status is now Under_Review)`);
  } else {
    console.error(`FAIL: Subject failed to submit appeal, got ${appealSubmitRes.status}`, appealSubmitData);
    process.exit(1);
  }

  // 6a. HR attempts to decide appeal -> MUST return 403 Forbidden
  const hrDecideRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/review/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: hrSession.cookie,
    },
    body: JSON.stringify({
      decision: "Confirm",
      decisionNotes: "HR attempting unauthorized adjudication.",
    }),
  });
  const hrDecideData = await hrDecideRes.json();
  if (hrDecideRes.status === 403) {
    console.log(`[PASS] HR blocked from deciding appeal -> 403 Forbidden: "${hrDecideData.message}"`);
  } else {
    console.error(`FAIL: HR should be blocked from deciding appeal with 403, got ${hrDecideRes.status}`, hrDecideData);
    process.exit(1);
  }

  // 6b. Issuer attempts to decide appeal against own warning -> MUST return 403 Forbidden (COI)
  const issuerDecideRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/review/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: leaderSession.cookie,
    },
    body: JSON.stringify({
      decision: "Confirm",
      decisionNotes: "Issuer attempting to judge own case.",
    }),
  });
  const issuerDecideData = await issuerDecideRes.json();
  if (issuerDecideRes.status === 403) {
    console.log(`[PASS] Issuer blocked from deciding appeal against own warning -> 403 Forbidden: "${issuerDecideData.message}"`);
  } else {
    console.error(`FAIL: Issuer should be blocked from deciding appeal with 403, got ${issuerDecideRes.status}`, issuerDecideData);
    process.exit(1);
  }

  // 6c. Original Approver attempts to decide appeal -> MUST return 403 Forbidden (COI)
  const approverDecideRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/review/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: committeeSession.cookie,
    },
    body: JSON.stringify({
      decision: "Confirm",
      decisionNotes: "Approver attempting to judge appeal against own approved decision.",
    }),
  });
  const approverDecideData = await approverDecideRes.json();
  if (approverDecideRes.status === 403) {
    console.log(`[PASS] Original Approver blocked from deciding appeal -> 403 Forbidden (COI): "${approverDecideData.message}"`);
  } else {
    console.error(`FAIL: Original approver should be blocked from appeal with 403, got ${approverDecideRes.status}`, approverDecideData);
    process.exit(1);
  }

  // 6d. Super Admin Universal Override Adjudication -> MUST return 200 OK
  const superAdminDecideRes = await fetch(`${BASE_URL}/api/warnings/${warningId}/review/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      decision: "Improvement_Plan",
      decisionNotes: "Super Admin review grants 30-day technical remediation improvement plan.",
    }),
  });
  const superAdminDecideData = await superAdminDecideRes.json();
  if (superAdminDecideRes.status === 200) {
    console.log(`[PASS] Super Admin universal override successfully decided appeal -> 200 OK`);
  } else {
    console.error(`FAIL: Super Admin override should succeed, got ${superAdminDecideRes.status}`, superAdminDecideData);
    process.exit(1);
  }

  console.log("\n--- Scenario 7: HR Governance Capabilities ---");
  // HR can view all warnings
  const hrWarningsRes = await fetch(`${BASE_URL}/api/warnings`, {
    method: "GET",
    headers: { Cookie: hrSession.cookie },
  });
  const hrWarningsData = await hrWarningsRes.json();
  if (hrWarningsRes.status === 200 && Array.isArray(hrWarningsData.data)) {
    console.log(`[PASS] HR can view all warnings for audit -> 200 OK (Retrieved ${hrWarningsData.data.length} records)`);
  } else {
    console.error("FAIL: HR should be able to view warnings", hrWarningsData);
    process.exit(1);
  }

  // HR can create regular member
  const hrCreateMemberRes = await fetch(`${BASE_URL}/api/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: hrSession.cookie,
    },
    body: JSON.stringify({
      name: "New Recruited Member",
      email: `recruit_${Date.now()}@example.com`,
      role: "Member",
    }),
  });
  const hrCreateMemberData = await hrCreateMemberRes.json();
  if (hrCreateMemberRes.status === 201) {
    console.log(`[PASS] HR can create regular member profile -> 201 Created`);
    // Cleanup the recruit
    await membersCol.deleteOne({ _id: new mongoose.Types.ObjectId(hrCreateMemberData.data._id) });
  } else {
    console.error("FAIL: HR should be able to create member", hrCreateMemberData);
    process.exit(1);
  }

  // HR CANNOT create Super Admin or Admin -> MUST return 403 Forbidden
  const hrCreateAdminRes = await fetch(`${BASE_URL}/api/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: hrSession.cookie,
    },
    body: JSON.stringify({
      name: "Rogue Admin Request",
      email: `rogue_admin_${Date.now()}@example.com`,
      role: "Admin",
    }),
  });
  const hrCreateAdminData = await hrCreateAdminRes.json();
  if (hrCreateAdminRes.status === 403) {
    console.log(`[PASS] HR blocked from creating Admin account -> 403 Forbidden: "${hrCreateAdminData.message}"`);
  } else {
    console.error("FAIL: HR should be blocked from creating Admin account", hrCreateAdminData);
    process.exit(1);
  }

  // Cleanup test artifacts
  console.log("\n--- Cleaning up temporary test records ---");
  await warningsCol.deleteOne({ _id: new mongoose.Types.ObjectId(warningId) });
  await projectsCol.deleteOne({ _id: new mongoose.Types.ObjectId(projectId) });
  await membersCol.deleteMany({
    email: {
      $in: [
        "hr_test@example.com",
        "committee_test@example.com",
        "lead_issuer@example.com",
        "subject_dev@example.com",
      ],
    },
  });

  await mongoose.disconnect();
  console.log("\n=======================================================");
  console.log("All HR & COI Permissions & Governance Tests PASSED 100%");
  console.log("=======================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
