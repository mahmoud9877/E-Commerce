import type { ClientSession, FilterQuery, HydratedDocument, Model, PopulateOptions } from "mongoose";
import type { ParsedQs } from "qs";
import { getPageParams, pageMeta } from "../utils/pagination.js";
import { AppError } from "./AppError.js";

export abstract class BaseService<T> {
  constructor(protected readonly model: Model<T>) {}

  async findOrFail(
    filter: FilterQuery<T>,
    message: string,
    statusCode = 404
  ): Promise<HydratedDocument<T>> {
    const doc = await this.model.findOne(filter);
    if (!doc) throw new AppError(message, statusCode);
    return doc;
  }

  async ensureNotExists(
    filter: FilterQuery<T>,
    message: string,
    statusCode = 409
  ): Promise<void> {
    if (await this.model.findOne(filter)) {
      throw new AppError(message, statusCode);
    }
  }

  // Runs fn in a MongoDB transaction: every write given the session commits or rolls back together.
  // Requires a replica set (Atlas, or a local mongod started with --replSet).
  protected async transaction<R>(fn: (session: ClientSession) => Promise<R>): Promise<R> {
    const session = await this.model.startSession();
    try {
      let result!: R;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  // Returns one page of documents matching filter plus pagination metadata
  protected async paginate(
    filter: FilterQuery<T>,
    query: ParsedQs,
    populate: PopulateOptions[] = []
  ) {
    const params = getPageParams(query);
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ _id: 1 })
        .skip(params.skip)
        .limit(params.size)
        .populate(populate),
      this.model.countDocuments(filter),
    ]);
    return { data, pagination: pageMeta(params, total) };
  }

  // Lowercases a name and makes sure no other document already uses it.
  // Pass currentName on update to reject renaming to the same name.
  protected async uniqueName(name: string, label: string, currentName?: string): Promise<string> {
    const normalized = name.toLowerCase();
    if (normalized === currentName) {
      throw new AppError(`Cannot update to the same ${label} name`, 400);
    }
    await this.ensureNotExists(
      { name: normalized } as FilterQuery<T>,
      `Duplicated ${label} name ${normalized}`
    );
    return normalized;
  }
}
