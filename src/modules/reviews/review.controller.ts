import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { ReviewService, ReviewParams } from "./review.service.js";

export class ReviewController extends BaseController {
  constructor(private readonly reviewService: ReviewService) {
    super();
  }

  async createReview(req: Request<{ productId: string }>, res: Response) {
    await this.reviewService.create(
      BaseController.currentUser(req)._id,
      req.params.productId,
      req.body
    );
    return res.status(200).json({ message: "Done" });
  }

  async updateReview(req: Request<ReviewParams>, res: Response) {
    await this.reviewService.update(BaseController.currentUser(req)._id, req.params, req.body);
    return res.status(200).json({ message: "Done" });
  }
}
