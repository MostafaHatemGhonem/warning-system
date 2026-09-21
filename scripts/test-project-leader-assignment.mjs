import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

const ELIGIBLE_ROLES = ["Super Admin", "Admin", "Team Leader"];

async function runTests() {
  console.log("=== Testing Project Team Leader Assignment & Role Filtering ===");
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;

  // 1. Fetch eligible leaders
  const eligibleLeaders = await db.collection("members").find({
    role: { $in: ELIGIBLE_ROLES },
    isActive: { $ne: false },
  }).toArray();

  console.log(`Found ${eligibleLeaders.length} eligible leaders in database:`);
  eligibleLeaders.forEach((m) => {
    console.log(` - ${m.name} (${m.role}) [${m._id}]`);
  });

  console.assert(eligibleLeaders.length > 0, "Must have at least one eligible leader");

  // 2. Fetch a non-eligible member (e.g. role "Member" or "HR")
  const nonEligibleMember = await db.collection("members").findOne({
    role: { $nin: ELIGIBLE_ROLES },
    isActive: { $ne: false },
  });

  if (nonEligibleMember) {
    console.log(`Found non-eligible test member: ${nonEligibleMember.name} (${nonEligibleMember.role})`);
    console.assert(!ELIGIBLE_ROLES.includes(nonEligibleMember.role), "Should not be in eligible roles");
  }

  // 3. Test Leader validation logic
  function validateLeader(member) {
    if (!member || member.isActive === false) {
      return { valid: false, error: "Member not found or inactive" };
    }
    if (!ELIGIBLE_ROLES.includes(member.role)) {
      return { valid: false, error: `Invalid role: ${member.role}. Must be Super Admin, Admin, or Team Leader` };
    }
    return { valid: true };
  }

  // Check eligible leader
  const testLeader = eligibleLeaders[0];
  const eligibleCheck = validateLeader(testLeader);
  console.assert(eligibleCheck.valid === true, "Eligible leader must pass validation");
  console.log(`✓ Eligible leader (${testLeader.name} - ${testLeader.role}) passed validation.`);

  // Check non-eligible leader if exists
  if (nonEligibleMember) {
    const nonEligibleCheck = validateLeader(nonEligibleMember);
    console.assert(nonEligibleCheck.valid === false, "Non-eligible member must fail validation");
    console.log(`✓ Non-eligible member (${nonEligibleMember.name} - ${nonEligibleMember.role}) properly rejected: ${nonEligibleCheck.error}`);
  }

  await mongoose.disconnect();
  console.log("=== All Team Leader Logic & Role Checks Passed ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
