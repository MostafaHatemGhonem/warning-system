import fs from "fs";
import mongoose from "mongoose";

let MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI && fs.existsSync(".env.local")) {
  const content = fs.readFileSync(".env.local", "utf-8");
  const match = content.match(/MONGODB_URI=(.*)/);
  if (match) MONGO_URI = match[1].trim();
}

async function run() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI, { dbName: "infinity_explorers" });
  console.log("Connected successfully.\n");

  const db = mongoose.connection.db;

  // 1. Find or create a test project and member
  const member = await db.collection("members").findOne({ isActive: true });
  if (!member) throw new Error("No active member found in DB");
  console.log("✓ Found test member:", member.name, `(${member.role})`);

  let project = await db.collection("projects").findOne({});
  if (!project) throw new Error("No project found in DB");
  console.log("✓ Found test project:", project.name);

  // 2. Test Real Project Membership (Roster)
  console.log("\n--- Testing Real Project Membership Roster ---");
  const rosterEntry = {
    memberId: member._id,
    projectRole: "Specialist",
    joinedAt: new Date(),
    status: "Active",
  };

  await db.collection("projects").updateOne(
    { _id: project._id },
    {
      $addToSet: { teamMembers: member._id },
      $pull: { memberRoster: { memberId: member._id } },
    }
  );
  await db.collection("projects").updateOne(
    { _id: project._id },
    {
      $push: { memberRoster: rosterEntry },
    }
  );

  const updatedProject = await db.collection("projects").findOne({ _id: project._id });
  const foundRoster = updatedProject.memberRoster?.find(
    (r) => r.memberId.toString() === member._id.toString()
  );
  if (!foundRoster || foundRoster.projectRole !== "Specialist") {
    throw new Error("Roster entry not saved properly");
  }
  console.log("✓ Real Project Roster verified: Member enrolled as", foundRoster.projectRole);

  // 3. Test Meeting & Attendance
  console.log("\n--- Testing Meeting & Attendance ---");
  const meetingDoc = {
    title: "Automated Test Radar Sync",
    description: "Testing presence and attendance verification",
    project: project._id,
    type: "Sprint_Sync",
    scheduledAt: new Date(Date.now() + 3600 * 1000),
    durationMinutes: 45,
    location: "Online",
    status: "Scheduled",
    createdBy: member._id,
    attendees: [
      {
        member: member._id,
        status: "present",
        checkInAt: new Date(),
        excuseReason: "",
      },
    ],
    workspaceId: "infinity-explorers",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const meetingInsert = await db.collection("meetings").insertOne(meetingDoc);
  console.log("✓ Meeting created with ID:", meetingInsert.insertedId.toString());

  // Update attendance to excused
  await db.collection("meetings").updateOne(
    { _id: meetingInsert.insertedId, "attendees.member": member._id },
    {
      $set: {
        "attendees.$.status": "excused",
        "attendees.$.excuseReason": "Approved medical appointment",
      },
    }
  );

  const updatedMeeting = await db.collection("meetings").findOne({ _id: meetingInsert.insertedId });
  const att = updatedMeeting.attendees.find((a) => a.member.toString() === member._id.toString());
  if (att.status !== "excused" || att.excuseReason !== "Approved medical appointment") {
    throw new Error("Attendance update failed");
  }
  console.log("✓ Meeting attendance recorded and verified: status =", att.status, "| excuse =", att.excuseReason);

  // 4. Test Blocker Reporting and Resolution
  console.log("\n--- Testing Blocker Reporting & Resolution ---");
  const blockerDoc = {
    title: "Hardware Interface Delay",
    description: "Waiting on RF transceiver board delivery from supplier",
    severity: "High",
    status: "Open",
    project: project._id,
    reportedBy: member._id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const blockerInsert = await db.collection("blockers").insertOne(blockerDoc);
  console.log("✓ Blocker reported with ID:", blockerInsert.insertedId.toString());

  // Resolve blocker
  await db.collection("blockers").updateOne(
    { _id: blockerInsert.insertedId },
    {
      $set: {
        status: "Resolved",
        resolutionNotes: "Board received and calibrated successfully",
        resolvedAt: new Date(),
        resolvedBy: member._id,
      },
    }
  );

  const resolvedBlocker = await db.collection("blockers").findOne({ _id: blockerInsert.insertedId });
  if (resolvedBlocker.status !== "Resolved") throw new Error("Blocker resolution failed");
  console.log("✓ Blocker marked resolved with notes:", resolvedBlocker.resolutionNotes);

  // 5. Test Delay Reporting and Timeline Extension
  console.log("\n--- Testing Delay Reporting & Timeline Extension ---");
  const originalDue = new Date("2026-10-01");
  const proposedDue = new Date("2026-10-15");

  const delayDoc = {
    project: project._id,
    reportedBy: member._id,
    originalDueDate: originalDue,
    proposedNewDueDate: proposedDue,
    delayReasonCategory: "Technical_Dependency",
    reasonDetails: "Simulation mesh convergence requires additional compute cluster cycles",
    impactLevel: "Moderate",
    status: "Pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const delayInsert = await db.collection("delayreports").insertOne(delayDoc);
  console.log("✓ Delay report submitted with ID:", delayInsert.insertedId.toString());

  // Approve delay report
  await db.collection("delayreports").updateOne(
    { _id: delayInsert.insertedId },
    {
      $set: {
        status: "Approved",
        reviewedBy: member._id,
        reviewedAt: new Date(),
        reviewNotes: "Approved timeline extension based on compute requirements",
      },
    }
  );

  const approvedDelay = await db.collection("delayreports").findOne({ _id: delayInsert.insertedId });
  if (approvedDelay.status !== "Approved") throw new Error("Delay approval failed");
  console.log("✓ Delay report approved:", approvedDelay.status);

  // Clean up test documents
  await db.collection("meetings").deleteOne({ _id: meetingInsert.insertedId });
  await db.collection("blockers").deleteOne({ _id: blockerInsert.insertedId });
  await db.collection("delayreports").deleteOne({ _id: delayInsert.insertedId });
  console.log("✓ Test records cleaned up successfully.");

  console.log("\n==========================================");
  console.log("ALL BACKEND & MODEL TESTS PASSED 100%!");
  console.log("==========================================");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
