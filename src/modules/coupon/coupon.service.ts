import type { ParsedQs } from "qs";
import type { ClientSession, Model, Types } from "mongoose";
import type { CouponDocument, ICoupon } from "../../../DB/model/Coupon.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IImageStorage } from "../../core/contracts.js";
import type { Id, UploadedFile } from "../../types/common.js";

export interface CouponInput {
  name?: string;
  amount?: number;
  expire?: Date;
}

export class CouponService extends BaseService<ICoupon> {
  constructor(
    model: Model<ICoupon>,
    private readonly images: IImageStorage
  ) {
    super(model);
  }

  list(query: ParsedQs) {
    return this.paginate({ isDeleted: false }, query);
  }

  async create(data: CouponInput & { name: string }, file: UploadedFile | undefined, userId: Types.ObjectId) {
    const name = await this.uniqueName(data.name, "coupon");

    const coupon: Partial<ICoupon> = { ...data, name, createBy: userId };
    if (file) {
      coupon.image = await this.images.upload(file.path, "coupon");
    }
    return this.model.create(coupon);
  }

  async update(couponId: Id, data: CouponInput, file: UploadedFile | undefined) {
    const coupon = await this.findOrFail({ _id: couponId }, "In-Valid coupon Id", 400);
    const changes: Partial<ICoupon> = { ...data };

    if (changes.name) {
      changes.name = await this.uniqueName(changes.name, "coupon", coupon.name);
    }
    if (file) {
      changes.image = await this.images.replace(
        file.path,
        "coupon",
        coupon.image?.public_id
      );
    }
    return this.model.updateOne({ _id: couponId }, changes);
  }

  async findValid(couponName?: string): Promise<CouponDocument | undefined> {
    if (!couponName) return undefined;
    const coupon = await this.model.findOne({
      name: couponName.toLowerCase(),
      isDeleted: false,
    });
    if (!coupon || !coupon.expire || coupon.expire.getTime() < Date.now()) {
      throw new AppError("Invalid or expired coupon", 400);
    }
    return coupon;
  }

  async setUsage(
    couponId: Id,
    userId: Types.ObjectId,
    used: boolean,
    session?: ClientSession
  ): Promise<void> {
    await this.model.updateOne(
      { _id: couponId },
      used ? { $addToSet: { usedBy: userId } } : { $pull: { usedBy: userId } },
      { session }
    );
  }
}
