import type { Query } from "mongoose";
import type { ParsedQs } from "qs";
import { getPageParams } from "./pagination.js";

type QueryData = ParsedQs;

class ApiFeatures<Q extends Query<unknown, unknown>> {
  constructor(public mongooseQuery: Q, private readonly queryData: QueryData) {}

  paginate(): this {
    const { size, skip } = getPageParams(this.queryData);
    this.mongooseQuery = this.mongooseQuery.limit(size).skip(skip);
    return this;
  }

  filter(): this {
    const queryObj = { ...this.queryData };
    const excludedFields = ["page", "size", "sort", "search", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    const queryStr = JSON.stringify(queryObj).replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );

    this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr)) as Q;
    return this;
  }

  search(): this {
    if (this.queryData.search) {
      const searchValue = String(this.queryData.search);
      this.mongooseQuery = this.mongooseQuery.find({
        $or: [
          { name: { $regex: searchValue, $options: "i" } },
          { description: { $regex: searchValue, $options: "i" } },
        ],
      }) as Q;
    }
    return this;
  }

  sort(): this {
    if (this.queryData.sort) {
      const sortBy = String(this.queryData.sort).replaceAll(",", " ");
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    }
    return this;
  }

  select(): this {
    if (this.queryData.fields) {
      const fields = String(this.queryData.fields).replaceAll(",", " ");
      this.mongooseQuery = this.mongooseQuery.select(fields);
    }
    return this;
  }
}

export default ApiFeatures;
