import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { CouponService } from "./coupon.service.js";

export class CouponController extends BaseController {
  constructor(private readonly couponService: CouponService) {
    super();
  }

  async getCoupon(req: Request, res: Response) {
    const { data: couponList, pagination } = await this.couponService.list(req.query);
    return res.status(200).json({ message: "Done", couponList, pagination });
  }

  async createCoupon(req: Request, res: Response) {
    const { _id } = BaseController.currentUser(req);
    const coupon = await this.couponService.create(req.body, req.file, _id);
    return res.status(201).json({ message: "Done", coupon });
  }

  async updateCoupon(req: Request<{ couponId: string }>, res: Response) {
    const updateCoupon = await this.couponService.update(
      req.params.couponId,
      req.body,
      req.file
    );
    return res
      .status(200)
      .json({ message: "coupon updated successfully", updateCoupon });
  }
}
