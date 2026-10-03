import type { ClientSession, FilterQuery, HydratedDocument, Model, PopulateOptions, SortOrder } from "mongoose";
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
    populate: PopulateOptions[] = [],
    select?: string,
    sort: Record<string, SortOrder> = { _id: 1 }
  ) {
    const params = getPageParams(query);
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip(params.skip)
        .limit(params.size)
        .select(select ?? "")
        .populate(populate),
      this.model.countDocuments(filter),
    ]);
    return { data, pagination: pageMeta(params, total) };
  }
}
