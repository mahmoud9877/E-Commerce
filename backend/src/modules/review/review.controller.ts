import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { ReviewService, ReviewParams } from "./review.service.js";

export class ReviewController extends BaseController {
  constructor(private readonly reviewService: ReviewService) {
    super();
  }

  async getReviews(req: Request<{ productId: string }>, res: Response) {
    const { data: reviewList, pagination } = await this.reviewService.listForProduct(
      req.params.productId,
      req.query
    );
    return res.status(200).json({ message: "Done", reviewList, pagination });
  }

  async createReview(req: Request<{ productId: string }>, res: Response) {
    const review = await this.reviewService.create(
      BaseController.currentUser(req)._id,
      req.params.productId,
      req.body
    );
    return res.status(200).json({ message: "Done", review });
  }

  async updateReview(req: Request<ReviewParams>, res: Response) {
    const review = await this.reviewService.update(BaseController.currentUser(req)._id, req.params, req.body);
    return res.status(200).json({ message: "Done", review });
  }
}
