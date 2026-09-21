import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://mustafahatemghoneim108sd2024_db_user:7QxwpadEkzDsRAKt@infinity-explorers.mbo1ain.mongodb.net/?appName=Infinity-Explorers";

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: "infinity_explorers" });
  console.log("Connected to MongoDB.");

  const targetEmail = process.argv[2] || "mostafahatemghonem@gmail.com";
  console.log(`Promoting user '${targetEmail}' to Super Admin...`);

  const membersCol = mongoose.connection.db.collection("members");
  const user = await membersCol.findOne({ email: targetEmail });

  if (!user) {
    console.error(`User with email '${targetEmail}' not found.`);
    process.exit(1);
  }

  const result = await membersCol.updateOne(
    { email: targetEmail },
    {
      $set: {
        role: "Super Admin",
        isActive: true,
        updatedAt: new Date(),
      },
    }
  );

  console.log(`Success! Updated ${result.modifiedCount} member record(s).`);
  console.log(`${user.name} (${targetEmail}) is now a SUPER ADMIN with universal bypass privileges.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error promoting user to Super Admin:", err);
  process.exit(1);
});
