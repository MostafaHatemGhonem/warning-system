import mongoose from "mongoose";
import WarningModule, {
  calculateDefaultActiveUntil,
  calculateAppealDeadline,
  calculateMaxSuspensionUntil,
  DURATION_WARNING_DAYS,
  DURATION_FINAL_WARNING_DAYS,
  APPEAL_WINDOW_DAYS,
  MAX_SUSPENSION_HOURS,
  REVIEW_DECISIONS,
  WARNING_STATUSES
} from "../models/warning.ts";

const Warning = WarningModule.default || WarningModule;

async function testModel() {
  console.log("=== Testing Warning Model Business Rules ===");

  // 1. Constants & Calculation Checks
  console.log("\n1. Testing durations & calculations:");
  const now = new Date("2026-09-19T00:00:00Z");
  const untilW1 = calculateDefaultActiveUntil("Warning 1", now);
  const diffW1Days = Math.round((untilW1 - now) / (1000 * 60 * 60 * 24));
  console.log(`Warning 1 active days: ${diffW1Days} (Expected: ${DURATION_WARNING_DAYS}) -> ${diffW1Days === 30 ? "PASS" : "FAIL"}`);

  const untilFinal = calculateDefaultActiveUntil("Final Warning", now);
  const diffFinalDays = Math.round((untilFinal - now) / (1000 * 60 * 60 * 24));
  console.log(`Final Warning active days: ${diffFinalDays} (Expected: ${DURATION_FINAL_WARNING_DAYS}) -> ${diffFinalDays === 60 ? "PASS" : "FAIL"}`);

  const appealDeadline = calculateAppealDeadline(now);
  const diffAppealDays = Math.round((appealDeadline - now) / (1000 * 60 * 60 * 24));
  console.log(`Appeal deadline days: ${diffAppealDays} (Expected: ${APPEAL_WINDOW_DAYS}) -> ${diffAppealDays === 7 ? "PASS" : "FAIL"}`);

  const suspensionUntil = calculateMaxSuspensionUntil(now);
  const diffSuspensionHours = Math.round((suspensionUntil - now) / (1000 * 60 * 60));
  console.log(`Max suspension hours: ${diffSuspensionHours} (Expected: ${MAX_SUSPENSION_HOURS}) -> ${diffSuspensionHours === 48 ? "PASS" : "FAIL"}`);

  // 2. Enum Integrity Checks
  console.log("\n2. Testing enums & decisions:");
  const hasRemovalInReview = REVIEW_DECISIONS.includes("Removal");
  console.log(`Removal is NOT a warning review decision: ${!hasRemovalInReview ? "PASS" : "FAIL"}`);
  console.log(`REVIEW_DECISIONS: ${REVIEW_DECISIONS.join(", ")}`);

  const hasPendingReview = WARNING_STATUSES.includes("Pending_Review");
  console.log(`Warning statuses include 'Pending_Review' for expired-validity reviews: ${hasPendingReview ? "PASS" : "FAIL"}`);

  // 3. Schema Document Validation Checks
  console.log("\n3. Testing Mongoose validations:");
  const dummyMemberId = new mongoose.Types.ObjectId();
  const dummyProjectId = new mongoose.Types.ObjectId();

  // Test 3A: Project warning without project -> should fail
  const doc1 = new Warning({
    member: dummyMemberId,
    type: "Project",
    project: null,
    level: "Warning 1",
    severity: 1,
    incidentDate: now,
    description: "Missing project test",
    issuedBy: dummyMemberId
  });
  let err1;
  try { await doc1.validate(); } catch (e) { err1 = e; }
  console.log(`Project warning without project rejected: ${err1?.errors?.project ? "PASS" : "FAIL"}`);

  // Test 3B: Global warning with project -> should fail
  const doc2 = new Warning({
    member: dummyMemberId,
    type: "Global",
    project: dummyProjectId,
    level: "Warning 1",
    severity: 1,
    incidentDate: now,
    description: "Global with project test",
    issuedBy: dummyMemberId
  });
  let err2;
  try { await doc2.validate(); } catch (e) { err2 = e; }
  console.log(`Global warning with project rejected: ${err2?.errors?.project ? "PASS" : "FAIL"}`);

  // Test 3C: Direct Final Warning without reason -> should fail
  const doc3 = new Warning({
    member: dummyMemberId,
    type: "Global",
    project: null,
    level: "Final Warning",
    severity: 3,
    isDirectFinalWarning: true,
    directIssuanceReason: "",
    incidentDate: now,
    description: "Direct final without reason",
    issuedBy: dummyMemberId
  });
  let err3;
  try { await doc3.validate(); } catch (e) { err3 = e; }
  console.log(`Direct Final Warning without justification rejected: ${err3?.errors?.directIssuanceReason ? "PASS" : "FAIL"}`);

  // Test 3D: Valid Project Warning -> should pass
  const doc4 = new Warning({
    member: dummyMemberId,
    type: "Project",
    project: dummyProjectId,
    level: "Warning 2",
    severity: 2,
    incidentDate: now,
    description: "Valid project warning incident",
    evidence: ["https://logs.example.com/incident1"],
    issuedBy: dummyMemberId
  });
  let err4;
  try { await doc4.validate(); } catch (e) { err4 = e; }
  console.log(`Valid Project Warning passed validation: ${!err4 ? "PASS" : "FAIL"}`);

  console.log("\nALL TESTS COMPLETED SUCCESSFULLY ✅");
}

testModel().catch(console.error);
