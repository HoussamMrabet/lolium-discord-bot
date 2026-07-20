import mongoose from 'mongoose';
import { env, isProduction } from '../config/env.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('mongo');

let connectPromise = null;

/**
 * Connects to MongoDB (idempotent — repeated calls return the same promise).
 *
 * `autoIndex` is enabled outside production so indexes materialize during
 * development/tests; in production we call `syncIndexes()` explicitly at deploy
 * time instead of paying the index-build cost on every boot.
 */
export function connectMongo() {
  if (connectPromise) return connectPromise;

  mongoose.set('strictQuery', true);
  mongoose.set('autoIndex', !isProduction);

  mongoose.connection.on('connected', () => log.info('mongodb connected'));
  mongoose.connection.on('error', (err) => log.error({ err }, 'mongodb error'));
  mongoose.connection.on('disconnected', () => log.warn('mongodb disconnected'));
  mongoose.connection.on('reconnected', () => log.info('mongodb reconnected'));

  connectPromise = mongoose
    .connect(env.MONGO_URI, {
      dbName: env.MONGO_DB_NAME || undefined,
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 20,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10_000,
    })
    .then(() => mongoose.connection)
    .catch((err) => {
      connectPromise = null;
      log.error({ err }, 'mongodb initial connection failed');
      throw err;
    });

  return connectPromise;
}

export async function disconnectMongo() {
  await mongoose.disconnect();
  connectPromise = null;
}

/**
 * Ensures every registered model's indexes exist. Safe to run at deploy time.
 * Import the models barrel before calling so all models are registered.
 */
export async function syncIndexes() {
  const results = {};
  for (const name of mongoose.modelNames()) {
    await mongoose.model(name).syncIndexes();
    results[name] = 'synced';
  }
  log.info({ models: Object.keys(results).length }, 'indexes synced');
  return results;
}

export { mongoose };
