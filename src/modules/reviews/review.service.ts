import type { Model, Types } from "mongoose";
import type { IReview } from "../../../DB/model/Review.Model.js";
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

export class ReviewService extends BaseService<IReview> {
  constructor(
    model: Model<IReview>,
    private readonly orders: OrderService
  ) {
    super(model);
  }

  async create(userId: Types.ObjectId, productId: string, { comment, rating }: ReviewInput) {
    const order = await this.orders.hasDelivered(userId, productId);
    if (!order) {
      throw new AppError("cannot review product before you get it", 400);
    }
    await this.ensureNotExists(
      { productId, createBy: userId },
      "cannot review the same product twice",
      400
    );

    return this.model.create({
      orderId: order._id,
      productId,
      createBy: userId,
      comment,
      rating,
    });
  }

  update(userId: Types.ObjectId, { productId, reviewId }: ReviewParams, data: ReviewInput) {
    return this.model.updateOne(
      { _id: reviewId, productId, createBy: userId },
      data
    );
  }
}
