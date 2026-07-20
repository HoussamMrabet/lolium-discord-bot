import mongoose from 'mongoose';

/** Coerces a hex string or ObjectId into an ObjectId (safe for aggregation). */
export function toObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(id);
}

/**
 * Generic persistence wrapper. Domain repositories extend this and add
 * query methods that speak the domain's language — services never touch a
 * Mongoose model directly, so query logic never leaks into business logic and
 * the model is trivially swappable in tests.
 */
export class BaseRepository {
  /** @param {import('mongoose').Model} model */
  constructor(model) {
    this.model = model;
  }

  create(doc) {
    return this.model.create(doc);
  }

  insertMany(docs, options = {}) {
    return this.model.insertMany(docs, options);
  }

  findById(id, projection = null, options = {}) {
    return this.model.findById(id, projection, options).exec();
  }

  findOne(filter = {}, projection = null, options = {}) {
    return this.model.findOne(filter, projection, options).exec();
  }

  find(filter = {}, projection = null, options = {}) {
    return this.model.find(filter, projection, options).exec();
  }

  updateOne(filter, update, options = {}) {
    return this.model.updateOne(filter, update, options).exec();
  }

  updateMany(filter, update, options = {}) {
    return this.model.updateMany(filter, update, options).exec();
  }

  findOneAndUpdate(filter, update, options = {}) {
    return this.model
      .findOneAndUpdate(filter, update, { new: true, ...options })
      .exec();
  }

  /** Upsert returning the resulting doc (defaults applied on insert). */
  upsert(filter, update, options = {}) {
    return this.model
      .findOneAndUpdate(filter, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        ...options,
      })
      .exec();
  }

  deleteOne(filter) {
    return this.model.deleteOne(filter).exec();
  }

  deleteMany(filter) {
    return this.model.deleteMany(filter).exec();
  }

  countDocuments(filter = {}) {
    return this.model.countDocuments(filter).exec();
  }

  exists(filter) {
    return this.model.exists(filter);
  }

  distinct(field, filter = {}) {
    return this.model.distinct(field, filter).exec();
  }

  bulkWrite(operations, options = {}) {
    return this.model.bulkWrite(operations, options);
  }

  aggregate(pipeline) {
    return this.model.aggregate(pipeline).exec();
  }
}

export default BaseRepository;
