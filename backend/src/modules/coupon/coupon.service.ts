import type { ParsedQs } from "qs";
import type { ClientSession, Model, Types } from "mongoose";
import type { CouponDocument, ICoupon } from "../../db/models/Coupon.Model.js";
import type { ICouponUsage } from "../../db/models/CouponUsage.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IImageStorage } from "../../core/contracts.js";
import { uniqueName } from "../../core/uniqueName.js";
import type { Id, UploadedFile } from "../../types/common.js";

export interface CouponInput {
  name?: string;
  amount?: number;
  expire?: Date;
}

const isDuplicateKeyError = (err: unknown) =>
  (err as { code?: number } | null)?.code === 11000;

const alreadyUsed = () => new AppError("You have already used this coupon", 400);

export class CouponService extends BaseService<ICoupon> {
  constructor(
    model: Model<ICoupon>,
    private readonly images: IImageStorage,
    private readonly usages: Model<ICouponUsage>
  ) {
    super(model);
  }

  list(query: ParsedQs) {
    return this.paginate({ isDeleted: false }, query);
  }

  async create(data: CouponInput & { name: string }, file: UploadedFile | undefined, userId: Types.ObjectId) {
    const name = await uniqueName(this.model, data.name, "coupon");

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
      changes.name = await uniqueName(this.model, changes.name, "coupon", coupon.name);
    }
    if (file) {
      changes.image = await this.images.replace(
        file.path,
        "coupon",
        coupon.image?.public_id
      );
    }
    return this.model.findByIdAndUpdate(couponId, changes, { new: true });
  }

  // A coupon this user may still apply; the real guarantee is claim() inside the order transaction
  async findValid(couponName: string | undefined, userId: Types.ObjectId): Promise<CouponDocument | undefined> {
    if (!couponName) return undefined;
    const coupon = await this.model.findOne({
      name: couponName.toLowerCase(),
      isDeleted: false,
    });
    if (!coupon || !coupon.expire || coupon.expire.getTime() < Date.now()) {
      throw new AppError("Invalid or expired coupon", 400);
    }
    if (await this.usages.exists({ couponId: coupon._id, userId })) {
      throw alreadyUsed();
    }
    return coupon;
  }

  // Records the use; the unique (couponId, userId) index rejects a second, even concurrent, use
  async claim(
    couponId: Id,
    userId: Types.ObjectId,
    orderId: Types.ObjectId,
    session?: ClientSession
  ): Promise<void> {
    try {
      await this.usages.create([{ couponId, userId, orderId }], { session });
    } catch (err) {
      if (isDuplicateKeyError(err)) throw alreadyUsed();
      throw err;
    }
  }

  // Gives the use back when its order is canceled or never paid
  async release(couponId: Id, userId: Types.ObjectId, session?: ClientSession): Promise<void> {
    await this.usages.deleteOne({ couponId, userId }, { session });
  }
}
