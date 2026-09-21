import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI =
  "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function login(email, password = "password123") {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to login as ${email}: ${data.message}`);
  }
  const setCookie = res.headers.get("set-cookie");
  const cookieMatch = setCookie?.match(/session_token=[^;]+/);
  return {
    cookie: cookieMatch ? cookieMatch[0] : "",
    user: data.data,
  };
}

async function runCommitteeTests() {
  console.log("\n=======================================================");
  console.log("=== CASE-SCOPED COMMITTEE + MAJORITY VOTING + TIE SUITE ===");
  console.log("=======================================================\n");

  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;

  const membersCol = db.collection("members");
  const warningsCol = db.collection("warnings");
  const committeesCol = db.collection("committees");
  const auditLogsCol = db.collection("auditlogs");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  // 1. Setup Personas
  console.log("--- 1. Setting Up Testing Personas ---");
  const superAdmin = await membersCol.findOne({ email: "mostafahatemghonem@gmail.com" });
  assert(superAdmin, "Super Admin exists");

  const hrUser = await membersCol.findOneAndUpdate(
    { email: "hr_vote@example.com" },
    {
      $set: {
        name: "Laila HR Officer",
        email: "hr_vote@example.com",
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
    { email: "admin_vote@example.com" },
    {
      $set: {
        name: "Ziad Admin Officer",
        email: "admin_vote@example.com",
        role: "Admin",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  const lead1User = await membersCol.findOneAndUpdate(
    { email: "lead1_vote@example.com" },
    {
      $set: {
        name: "Omar Lead 1",
        email: "lead1_vote@example.com",
        role: "Team Leader",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  const lead2User = await membersCol.findOneAndUpdate(
    { email: "lead2_vote@example.com" },
    {
      $set: {
        name: "Farah Lead 2",
        email: "lead2_vote@example.com",
        role: "Team Leader",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  const lead3User = await membersCol.findOneAndUpdate(
    { email: "lead3_vote@example.com" },
    {
      $set: {
        name: "Hassan Lead 3",
        email: "lead3_vote@example.com",
        role: "Team Leader",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  const targetMember = await membersCol.findOneAndUpdate(
    { email: "dev_case_subject@example.com" },
    {
      $set: {
        name: "Sami Subject Member",
        email: "dev_case_subject@example.com",
        role: "Member",
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
  const hrSession = await login("hr_vote@example.com");
  const adminSession = await login("admin_vote@example.com");
  const lead1Session = await login("lead1_vote@example.com");
  const lead2Session = await login("lead2_vote@example.com");
  const lead3Session = await login("lead3_vote@example.com");
  const subjectSession = await login("dev_case_subject@example.com");

  console.log("All 7 testing sessions authenticated successfully.");

  // 2. Create Case 1 (Final Warning requiring Committee approval)
  console.log("\n--- 2. Creating Warning Case 1 ---");
  const createWarn1Res = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: lead1Session.cookie,
    },
    body: JSON.stringify({
      member: targetMember._id.toString(),
      type: "Global",
      level: "Final Warning",
      severity: 3,
      isDirectFinalWarning: true,
      directIssuanceReason: "Repeated project misconduct requiring formal Committee review",
      description: "Proposed Final Warning issued by Omar Lead 1",
    }),
  });
  const warn1Data = await createWarn1Res.json();
  assert(createWarn1Res.status === 201, "Case 1 Warning created by Team Leader 1 (Status: Pending_Approval)");
  const warn1Id = warn1Data.data._id;

  // 3. Formation Rules & COI Validation
  console.log("\n--- 3. Committee Formation & Pre-Emptive COI Validation ---");

  // A. Less than 3 members -> MUST FAIL (400)
  const formQuorumFail = await fetch(`${BASE_URL}/api/committees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      resourceType: "Warning",
      resourceId: warn1Id,
      memberIds: [hrUser._id.toString(), adminUser._id.toString()],
      reason: "Formation attempt with 2 members",
    }),
  });
  assert(formQuorumFail.status === 400, "Rejected formation with < 3 members (400 Bad Request)");

  // B. Attempt to include the Warning ISSUER (lead1) -> MUST FAIL (400 COI)
  const formIssuerFail = await fetch(`${BASE_URL}/api/committees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      resourceType: "Warning",
      resourceId: warn1Id,
      memberIds: [lead1User._id.toString(), hrUser._id.toString(), adminUser._id.toString()],
      reason: "Formation attempt including issuer",
    }),
  });
  assert(formIssuerFail.status === 400, "Blocked adding warning issuer to committee (400 Bad Request / COI)");
  const issuerFailData = await formIssuerFail.json();
  assert(issuerFailData.message.includes("issuer"), `COI message verified: "${issuerFailData.message}"`);

  // C. Attempt to include the Subject Member (targetMember) -> MUST FAIL (400 COI)
  const formSubjectFail = await fetch(`${BASE_URL}/api/committees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      resourceType: "Warning",
      resourceId: warn1Id,
      memberIds: [targetMember._id.toString(), hrUser._id.toString(), adminUser._id.toString()],
      reason: "Formation attempt including subject",
    }),
  });
  assert(formSubjectFail.status === 400, "Blocked adding subject member to committee (400 Bad Request / COI)");

  // D. Valid Formation of 3-Member Committee (Super Admin, HR, Admin) -> MUST SUCCEED (201)
  const validFormRes = await fetch(`${BASE_URL}/api/committees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      resourceType: "Warning",
      resourceId: warn1Id,
      memberIds: [superAdmin._id.toString(), hrUser._id.toString(), adminUser._id.toString()],
      reason: "Formal 3-member governance committee seated for Case 1",
    }),
  });
  if (validFormRes.status !== 201) {
    console.log("validFormRes failed:", validFormRes.status, await validFormRes.text());
  }
  assert(validFormRes.status === 201, "Super Admin established 3-member committee for Case 1 (201 Created)");
  const committee1 = (await validFormRes.json()).data;
  const committee1Id = committee1._id;

  // Verify Audit Log for formation
  const formAudit = await auditLogsCol.findOne({
    action: "committee.form",
    "resource.id": new mongoose.Types.ObjectId(committee1Id),
  });
  assert(formAudit, "Audit Log recorded 'committee.form'");
  assert(formAudit.newState.status === "ACTIVE", "Audit Log confirms status: ACTIVE");

  // 4. Case-Scoped Scope & Voting Protection
  console.log("\n--- 4. Scope Protection & Democratic Voting (Odd Quorum: 3 Members) ---");

  // Non-seated user (lead2) attempts to vote -> MUST FAIL (403)
  const unseatedVoteRes = await fetch(`${BASE_URL}/api/committees/${committee1Id}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: lead2Session.cookie,
    },
    body: JSON.stringify({ vote: "Approve", reason: "Trying to vote outside my committee" }),
  });
  assert(unseatedVoteRes.status === 403, "Unseated member blocked from voting (403 Forbidden)");

  // Member 1 (HR) votes Approve
  const vote1Res = await fetch(`${BASE_URL}/api/committees/${committee1Id}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: hrSession.cookie,
    },
    body: JSON.stringify({
      vote: "Approve",
      reason: "HR confirms compliance and disciplinary justification",
    }),
  });
  assert(vote1Res.status === 200, "HR voted 'Approve' (1/3 votes cast)");
  const vote1Data = await vote1Res.json();
  assert(vote1Data.data.committee.status === "ACTIVE", "Committee remains ACTIVE awaiting majority");

  // Double vote attempt by HR -> MUST FAIL (400)
  const doubleVoteRes = await fetch(`${BASE_URL}/api/committees/${committee1Id}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: hrSession.cookie,
    },
    body: JSON.stringify({ vote: "Approve", reason: "Trying to double vote" }),
  });
  assert(doubleVoteRes.status === 400, "Double voting blocked (400 Bad Request)");

  // Member 2 (Admin) votes Approve -> STRICT MAJORITY REACHED (2/3 > 50%)!
  const vote2Res = await fetch(`${BASE_URL}/api/committees/${committee1Id}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminSession.cookie,
    },
    body: JSON.stringify({
      vote: "Approve",
      reason: "Admin concurs with recommendation and approves activation",
    }),
  });
  assert(vote2Res.status === 200, "Admin voted 'Approve' -> STRICT MAJORITY REACHED (2/3)");
  const vote2Data = await vote2Res.json();
  assert(vote2Data.data.committee.status === "DECIDED", "Committee status transitioned to DECIDED");
  assert(vote2Data.data.committee.decisionOutcome === "APPROVED", "Committee decision outcome is APPROVED");
  assert(vote2Data.data.caseUpdated === true, "Case Warning automatically updated to Active");

  // Verify DB Warning is now Active
  const updatedWarn1 = await warningsCol.findOne({ _id: new mongoose.Types.ObjectId(warn1Id) });
  assert(updatedWarn1.status === "Active", "DB Warning status confirmed as 'Active'");

  // Verify Audit Log records 'committee.decide'
  const decideAudit = await auditLogsCol.findOne({
    action: "committee.decide",
    "resource.id": new mongoose.Types.ObjectId(committee1Id),
  });
  assert(decideAudit, "Audit Log recorded 'committee.decide'");

  // Member 3 (Super Admin) attempts to vote after decision finalized -> MUST FAIL (400)
  const lateVoteRes = await fetch(`${BASE_URL}/api/committees/${committee1Id}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({ vote: "Approve", reason: "Late vote after closure" }),
  });
  assert(lateVoteRes.status === 400, "Voting after committee finalized is rejected (400 Bad Request)");

  // 5. Deadlock / Tie Governance & Member Expansion
  console.log("\n--- 5. Deadlock Protocol (4-Member Even Quorum: Tie -> NO_DECISION -> Add Member -> Majority) ---");

  // Create Case 2
  const createWarn2Res = await fetch(`${BASE_URL}/api/warnings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: lead1Session.cookie,
    },
    body: JSON.stringify({
      member: targetMember._id.toString(),
      type: "Global",
      level: "Final Warning",
      severity: 3,
      isDirectFinalWarning: true,
      directIssuanceReason: "Critical case for deadlock and tie testing",
      description: "Warning for tie governance testing",
    }),
  });
  const warn2Data = await createWarn2Res.json();
  const warn2Id = warn2Data.data._id;

  // Form 4-member committee (Super Admin, HR, Admin, Lead 2)
  const form4Res = await fetch(`${BASE_URL}/api/committees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      resourceType: "Warning",
      resourceId: warn2Id,
      memberIds: [
        superAdmin._id.toString(),
        hrUser._id.toString(),
        adminUser._id.toString(),
        lead2User._id.toString(),
      ],
      reason: "4-member committee formed to test tie resolution protocol",
    }),
  });
  assert(form4Res.status === 201, "Formed 4-member committee for Case 2 (201 Created)");
  const committee2 = (await form4Res.json()).data;
  const committee2Id = committee2._id;

  // Cast Votes: 2 Approve vs 2 Reject -> Exact Tie
  console.log("Casting 2 Approve vs 2 Reject...");
  await fetch(`${BASE_URL}/api/committees/${committee2Id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: hrSession.cookie },
    body: JSON.stringify({ vote: "Approve", reason: "Vote 1 Approve" }),
  });
  await fetch(`${BASE_URL}/api/committees/${committee2Id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminSession.cookie },
    body: JSON.stringify({ vote: "Approve", reason: "Vote 2 Approve" }),
  });
  await fetch(`${BASE_URL}/api/committees/${committee2Id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: superAdminSession.cookie },
    body: JSON.stringify({ vote: "Reject", reason: "Vote 3 Reject - Insufficient evidence" }),
  });
  const tieVoteRes = await fetch(`${BASE_URL}/api/committees/${committee2Id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: lead2Session.cookie },
    body: JSON.stringify({ vote: "Reject", reason: "Vote 4 Reject - Procedural deficiency" }),
  });
  const tieData = await tieVoteRes.json();

  assert(tieData.data.committee.status === "TIED", "Committee status transitioned to 'TIED'");
  assert(tieData.data.committee.decisionOutcome === "NO_DECISION", "Committee decision outcome is 'NO_DECISION'");
  assert(tieData.data.caseUpdated === false, "Case Warning NOT updated (remains Pending_Approval)");

  // Verify Audit Log records 'committee.tie'
  const tieAudit = await auditLogsCol.findOne({
    action: "committee.tie",
    "resource.id": new mongoose.Types.ObjectId(committee2Id),
  });
  assert(tieAudit, "Audit Log recorded 'committee.tie' with deadlock rationale");

  // Attempting to vote while TIED -> MUST FAIL (400)
  const voteWhileTiedRes = await fetch(`${BASE_URL}/api/committees/${committee2Id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: lead3Session.cookie },
    body: JSON.stringify({ vote: "Approve", reason: "Attempting to vote in tied committee" }),
  });
  assert(voteWhileTiedRes.status === 400 || voteWhileTiedRes.status === 403, "Voting in TIED committee rejected");

  // Super Admin resolves tie by adding 5th member (lead3)
  console.log("Super Admin expanding committee with 5th member (Lead 3)...");
  const addMemberRes = await fetch(`${BASE_URL}/api/committees/${committee2Id}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAdminSession.cookie,
    },
    body: JSON.stringify({
      memberId: lead3User._id.toString(),
      reason: "Adding tie-breaking 5th member to resolve deadlock",
    }),
  });
  assert(addMemberRes.status === 200, "Super Admin added 5th member (200 OK)");
  const addMemberData = await addMemberRes.json();
  assert(addMemberData.data.status === "ACTIVE", "Committee status reopened to ACTIVE");
  assert(addMemberData.data.members.length === 5, "Committee membership expanded to 5 members");

  // Verify Audit Log records 'committee.add_member'
  const addMemberAudit = await auditLogsCol.findOne({
    action: "committee.add_member",
    "resource.id": new mongoose.Types.ObjectId(committee2Id),
  });
  assert(addMemberAudit, "Audit Log recorded 'committee.add_member'");

  // Lead 3 casts deciding vote: "Approve" -> Reaches 3/5 (> 50%) Majority!
  const finalTieBreakVote = await fetch(`${BASE_URL}/api/committees/${committee2Id}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: lead3Session.cookie,
    },
    body: JSON.stringify({
      vote: "Approve",
      reason: "Reviewing complete file and casting deciding approval",
    }),
  });
  assert(finalTieBreakVote.status === 200, "Lead 3 cast tie-breaking vote (200 OK)");
  const finalData = await finalTieBreakVote.json();
  assert(finalData.data.committee.status === "DECIDED", "Committee status finalized to DECIDED");
  assert(finalData.data.committee.decisionOutcome === "APPROVED", "Outcome adopted by 3/5 majority: APPROVED");
  assert(finalData.data.caseUpdated === true, "Case Warning activated following deadlock resolution");

  const updatedWarn2 = await warningsCol.findOne({ _id: new mongoose.Types.ObjectId(warn2Id) });
  assert(updatedWarn2.status === "Active", "Warning 2 verified Active in MongoDB");

  // 6. Cleanup
  console.log("\n--- Cleaning Up Temporary Test Records ---");
  await warningsCol.deleteMany({ _id: { $in: [new mongoose.Types.ObjectId(warn1Id), new mongoose.Types.ObjectId(warn2Id)] } });
  await committeesCol.deleteMany({ _id: { $in: [new mongoose.Types.ObjectId(committee1Id), new mongoose.Types.ObjectId(committee2Id)] } });
  await membersCol.deleteMany({
    email: {
      $in: [
        "hr_vote@example.com",
        "admin_vote@example.com",
        "lead1_vote@example.com",
        "lead2_vote@example.com",
        "lead3_vote@example.com",
        "dev_case_subject@example.com",
      ],
    },
  });
  console.log("Cleaned up test cases and members. Audit logs preserved for governance compliance.");

  console.log("\n=======================================================");
  console.log("=== ALL CASE-SCOPED COMMITTEE & VOTING TESTS PASSED 100% ===");
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

runCommitteeTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
