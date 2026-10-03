// Data + index migration. Safe to re-run. Run once per database after deploying:
//   npm run migrate              (local, uses the root .env)
//   node dist/src/scripts/migrate.js   (built image / production env)
import "../loadEnv.js";
import mongoose, { type Types } from "mongoose";
import { Env } from "../core/Env.js";
import brandModel from "../db/models/Brand.Model.js";
import cartModel from "../db/models/Cart.Model.js";
import categoryModel from "../db/models/Category.Model.js";
import couponModel from "../db/models/Coupon.Model.js";
import couponUsageModel from "../db/models/CouponUsage.Model.js";
import orderModel from "../db/models/Order.Model.js";
import notificationModel from "../db/models/Notification.Model.js";
import productModel from "../db/models/Product.Model.js";
import rateLimitModel from "../db/models/RateLimit.Model.js";
import refreshTokenModel from "../db/models/RefreshToken.Model.js";
import reviewModel from "../db/models/Review.Model.js";
import subcategoryModel from "../db/models/Subcategory.Model.js";
import userModel from "../db/models/User.model.js";

const db = () => mongoose.connection.db;

// Removes all but the first document of each group, so a unique index can be built
async function dedupe(collection: string, key: Record<string, string>, keepNewest: boolean) {
  const groups = await db()
    .collection(collection)
    .aggregate<{ ids: Types.ObjectId[] }>([
      { $sort: { _id: keepNewest ? -1 : 1 } },
      { $group: { _id: key, ids: { $push: "$_id" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();
  const extra = groups.flatMap((group) => group.ids.slice(1));
  if (extra.length) await db().collection(collection).deleteMany({ _id: { $in: extra } });
  console.log(`${collection}: removed ${extra.length} duplicate(s)`);
}

await mongoose.connect(Env.get("DB_LOCAL"));
try {
  // Coupon uses move from coupon.usedBy[] to the couponusages collection
  const coupons = await db()
    .collection("coupons")
    .find({ "usedBy.0": { $exists: true } })
    .project<{ _id: Types.ObjectId; usedBy: Types.ObjectId[] }>({ usedBy: 1 })
    .toArray();
  let usages = 0;
  for (const coupon of coupons) {
    for (const userId of coupon.usedBy) {
      // Link each use to that user's latest order with this coupon
      const order = await orderModel
        .findOne({ couponId: coupon._id, userId })
        .sort({ createdAt: -1 })
        .select("_id");
      if (!order) continue;
      const { upsertedCount } = await couponUsageModel.updateOne(
        { couponId: coupon._id, userId },
        { $setOnInsert: { orderId: order._id } },
        { upsert: true }
      );
      usages += upsertedCount;
    }
  }
  await db().collection("coupons").updateMany({}, { $unset: { usedBy: "" } });
  console.log(`couponusages: backfilled ${usages}`);

  // Unique indexes below would fail to build over existing duplicates
  await dedupe("carts", { userId: "$userId" }, true);
  await dedupe("reviews", { productId: "$productId", createBy: "$createBy" }, false);

  // Fields that no longer exist in the schemas
  await db().collection("products").updateMany({}, { $unset: { wishUser: "" } });
  for (const collection of ["brands", "categories", "subcategories", "carts", "orders", "reviews"]) {
    await db().collection(collection).updateMany({}, { $unset: { isDeleted: "" } });
  }
  // Users gain an explicit isDeleted flag
  await userModel.updateMany({ isDeleted: { $exists: false } }, { isDeleted: false });
  console.log("schema cleanup: done");

  // Orders: syncIndexes also drops the old unique userId_1 index (one order per user ever)
  const dropped = await orderModel.syncIndexes();
  console.log("orders: dropped", dropped.length ? dropped : "nothing");

  // Everything else: only create missing indexes, never drop
  for (const model of [brandModel, cartModel, categoryModel, couponModel, couponUsageModel, notificationModel, productModel, rateLimitModel, refreshTokenModel, reviewModel, subcategoryModel, userModel]) {
    await (model as mongoose.Model<unknown>).createIndexes();
    console.log(`${model.collection.collectionName}: indexes ensured`);
  }
} finally {
  await mongoose.disconnect();
}
