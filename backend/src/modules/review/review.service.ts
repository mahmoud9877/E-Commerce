import type { Model, Types } from "mongoose";
import type { ParsedQs } from "qs";
import type { IReview } from "../../db/models/Review.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { OrderService } from "../order/order.service.js";

export interface ReviewInput {
  comment?: string;
  rating?: number;
}

export type ReviewParams = {
  productId: string;
  reviewId: string;
};

const isDuplicateKeyError = (err: unknown) =>
  (err as { code?: number } | null)?.code === 11000;

const reviewedTwice = () => new AppError("cannot review the same product twice", 400);

export class ReviewService extends BaseService<IReview> {
  constructor(
    model: Model<IReview>,
    private readonly orders: OrderService
  ) {
    super(model);
  }

  // A product's reviews, newest first, with the reviewer's display name only
  listForProduct(productId: string, query: ParsedQs) {
    return this.paginate(
      { productId },
      query,
      [{ path: "createBy", select: "userName" }],
      "-orderId",
      { createdAt: -1 }
    );
  }

  async create(userId: Types.ObjectId, productId: string, { comment, rating }: ReviewInput) {
    const order = await this.orders.hasDelivered(userId, productId);
    if (!order) {
      throw new AppError("cannot review product before you get it", 400);
    }
    if (await this.model.exists({ productId, createBy: userId })) {
      throw reviewedTwice();
    }

    try {
      return await this.model.create({
        orderId: order._id,
        productId,
        createBy: userId,
        comment,
        rating,
      });
    } catch (err) {
      // A concurrent request created it first; the unique (productId, createBy) index caught it
      if (isDuplicateKeyError(err)) throw reviewedTwice();
      throw err;
    }
  }

  async update(userId: Types.ObjectId, { productId, reviewId }: ReviewParams, data: ReviewInput) {
    const review = await this.model.findOneAndUpdate(
      { _id: reviewId, productId, createBy: userId },
      data,
      { new: true }
    );
    if (!review) {
      throw new AppError("Review not found", 404);
    }
    return review;
  }
}
