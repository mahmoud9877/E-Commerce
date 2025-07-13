class ApiFeatures {
  constructor(mongooseQuery, queryData) {
    this.mongooseQuery = mongooseQuery;
    this.queryData = queryData;
  }

  paginate() {
    let { page, size } = this.queryData;
    page = parseInt(page) || 1;
    size = parseInt(size) || 10;
    const skip = (page - 1) * size;
    this.mongooseQuery = this.mongooseQuery.limit(size).skip(skip);
    return this;
  }

  filter() {
    const queryObj = { ...this.queryData };
    const excludedFields = ["page", "size", "sort", "search", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    const queryStr = JSON.stringify(queryObj).replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );

    this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr));
    return this;
  }

  search() {
    if (this.queryData.search) {
      const searchValue = this.queryData.search;
      this.mongooseQuery = this.mongooseQuery.find({
        $or: [
          { name: { $regex: searchValue, $options: "i" } },
          { description: { $regex: searchValue, $options: "i" } },
        ],
      });
    }
    return this;
  }

  sort() {
    if (this.queryData.sort) {
      const sortBy = this.queryData.sort.replaceAll(",", " ");
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    }
    return this;
  }

  select() {
    if (this.queryData.fields) {
      const fields = this.queryData.fields.replaceAll(",", " ");
      this.mongooseQuery = this.mongooseQuery.select(fields);
    }
    return this;
  }
}

export default ApiFeatures;
