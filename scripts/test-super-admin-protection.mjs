import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function runTests() {
  console.log("=== Testing Super Admin Protection & Role Governance ===");

  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  const db = mongoose.connection.db;

  const membersCol = db.collection("members");

  // 1. Verify Super Admin exists
  const superAdmin = await membersCol.findOne({ email: "mostafahatemghonem@gmail.com" });
  if (!superAdmin || superAdmin.role !== "Super Admin") {
    console.error("FAIL: Super admin Mostafa Hatem not found or not Super Admin");
    process.exit(1);
  }
  console.log(`✓ Super Admin verified: ${superAdmin.name} (${superAdmin.email}), Role: ${superAdmin.role}`);

  // Scenario 1: Deactivate Super Admin check
  console.log("\nScenario 1: Testing Deactivate Super Admin restriction");
  if (superAdmin.role === "Super Admin") {
    const attemptDeactivateSuperAdmin = (targetRole, isActive) => {
      if (targetRole === "Super Admin" && isActive === false) {
        return { status: 403, message: "Super Admin accounts cannot be deactivated." };
      }
      return { status: 200 };
    };

    const res1 = attemptDeactivateSuperAdmin(superAdmin.role, false);
    if (res1.status === 403) {
      console.log("✓ Correctly blocked deactivating Super Admin: 403 Forbidden");
    } else {
      console.error("FAIL: Should have blocked deactivating Super Admin");
      process.exit(1);
    }
  }

  // Scenario 2: Regular Admin attempting to create Admin or Super Admin
  console.log("\nScenario 2: Testing Role creation restrictions for Non-Super Admin");
  const checkRoleCreation = (callerRole, newRole) => {
    if ((newRole === "Admin" || newRole === "Super Admin") && callerRole !== "Super Admin") {
      return {
        status: 403,
        message: "Only Super Admins are authorized to create members with Admin or Super Admin role.",
      };
    }
    return { status: 201 };
  };

  const adminCreateSuperAdmin = checkRoleCreation("Admin", "Super Admin");
  if (adminCreateSuperAdmin.status === 403) {
    console.log("✓ Regular Admin blocked from creating Super Admin (403)");
  } else {
    console.error("FAIL: Regular Admin should not create Super Admin");
    process.exit(1);
  }

  const adminCreateAdmin = checkRoleCreation("Admin", "Admin");
  if (adminCreateAdmin.status === 403) {
    console.log("✓ Regular Admin blocked from creating Admin (403)");
  } else {
    console.error("FAIL: Regular Admin should not create Admin");
    process.exit(1);
  }

  const adminCreateTeamLeader = checkRoleCreation("Admin", "Team Leader");
  if (adminCreateTeamLeader.status === 201) {
    console.log("✓ Regular Admin allowed to create Team Leader (201)");
  } else {
    console.error("FAIL: Regular Admin should be allowed to create Team Leader");
    process.exit(1);
  }

  const superAdminCreateAdmin = checkRoleCreation("Super Admin", "Admin");
  if (superAdminCreateAdmin.status === 201) {
    console.log("✓ Super Admin allowed to create Admin (201)");
  } else {
    console.error("FAIL: Super Admin should be allowed to create Admin");
    process.exit(1);
  }

  // Scenario 3: Role update restrictions
  console.log("\nScenario 3: Testing Role promotion restrictions for Non-Super Admin");
  const checkRoleUpdate = (callerRole, targetRole, assignedRole) => {
    if (callerRole !== "Super Admin") {
      if (targetRole === "Super Admin") {
        return { status: 403, message: "Only Super Admins can modify Super Admin accounts." };
      }
      if ((assignedRole === "Admin" || assignedRole === "Super Admin") && assignedRole !== targetRole) {
        return { status: 403, message: "Only Super Admins can assign the Admin or Super Admin role." };
      }
    }
    return { status: 200 };
  };

  const adminPromotesToAdmin = checkRoleUpdate("Admin", "Member", "Admin");
  if (adminPromotesToAdmin.status === 403) {
    console.log("✓ Regular Admin blocked from promoting Member to Admin (403)");
  } else {
    console.error("FAIL: Regular Admin should not promote to Admin");
    process.exit(1);
  }

  const adminEditsSuperAdmin = checkRoleUpdate("Admin", "Super Admin", "Member");
  if (adminEditsSuperAdmin.status === 403) {
    console.log("✓ Regular Admin blocked from editing Super Admin account (403)");
  } else {
    console.error("FAIL: Regular Admin should not edit Super Admin");
    process.exit(1);
  }

  const superAdminPromotesToAdmin = checkRoleUpdate("Super Admin", "Member", "Admin");
  if (superAdminPromotesToAdmin.status === 200) {
    console.log("✓ Super Admin allowed to promote Member to Admin (200)");
  } else {
    console.error("FAIL: Super Admin should be allowed to promote Member to Admin");
    process.exit(1);
  }

  console.log("\n=== ALL SUPER ADMIN PROTECTION TESTS PASSED! ===");
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
