import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
// Import the models barrel so every model is registered before we sync indexes.
import '../../src/database/models/index.js';

let mongod = null;

/** Spin up an in-memory MongoDB and connect mongoose to it. */
export async function startMemoryMongo() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Build unique/compound indexes so constraint-based tests are meaningful.
  await Promise.all(
    mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()),
  );
}

export async function stopMemoryMongo() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  mongod = null;
}

export async function clearCollections() {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({})),
  );
}
