import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  console.log("Connected to MongoDB.");

  const email = "mostafahatemghonem@gmail.com";
  let user = await mongoose.connection.db.collection("members").findOne({ email });

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("password123", salt);

  if (!user) {
    console.log("User not found (was deleted). Recreating user as Admin...");
    const result = await mongoose.connection.db.collection("members").insertOne({
      name: "Mostafa Hatem",
      email,
      role: "Admin",
      isActive: true,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("Created user with ID:", result.insertedId);
  } else {
    console.log("Found user. Current status:", { isActive: user.isActive, role: user.role });
    await mongoose.connection.db.collection("members").updateOne(
      { email },
      {
        $set: {
          isActive: true,
          role: "Admin",
          passwordHash,
          updatedAt: new Date()
        }
      }
    );
    console.log("Successfully reactivated user mostafahatemghonem@gmail.com and set as Active Admin!");
  }

  const verified = await mongoose.connection.db.collection("members").findOne({ email });
  console.log("Verified user state:", {
    name: verified.name,
    email: verified.email,
    role: verified.role,
    isActive: verified.isActive
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
