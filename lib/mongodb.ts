import mongoose from "mongoose";

export async function getMongoUri(): Promise<string> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define MONGODB_URI in environment variables");
  }
  return uri;
}

const globalForMongoose = globalThis as unknown as {
  mongoose:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
};

const cached =
  globalForMongoose.mongoose ??
  (globalForMongoose.mongoose = {
    conn: null,
    promise: null,
  });

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define MONGODB_URI in environment variables");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      dbName: "infinity_explorers",
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
