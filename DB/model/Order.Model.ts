import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";

export type PaymentType = "cash" | "card";
export type OrderStatus =
  | "waitPayment"
  | "placed"
  | "canceled"
  | "rejected"
  | "onWay"
  | "delivered";

export interface IOrderItem {
  name: string;
  productId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  finalPrice: number;
}

export interface IOrder {
  userId: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  address: string;
  phone: string[];
  note?: string;
  products: IOrderItem[];
  couponId?: Types.ObjectId;
  subtotal: number;
  finalPrice: number;
  paymentType: PaymentType;
  status: OrderStatus;
  reason?: string;
  // Client-supplied Idempotency-Key; a retried request with the same key returns this order
  idempotencyKey?: string;
  checkoutSession?: { id: string; url: string | null };
  isDeleted: boolean;
}

export type OrderDocument = HydratedDocument<IOrder>;

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    address: { type: String, required: true },
    phone: { type: [String], required: true },
    note: { type: String },
    products: [
      {
        name: { type: String, required: true },
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true, default: 1 },
        finalPrice: { type: Number, required: true, default: 1 },
      },
    ],
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    subtotal: { type: Number, required: true, default: 1 },
    finalPrice: { type: Number, required: true, default: 1 },
    paymentType: {
      type: String,
      default: "cash",
      enum: ["cash", "card"],
      required: true,
    },
    status: {
      type: String,
      default: "placed",
      enum: [
        "waitPayment",
        "placed",
        "canceled",
        "rejected",
        "onWay",
        "delivered",
      ],
    },
    reason: String,
    idempotencyKey: { type: String },
    checkoutSession: { id: String, url: String },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// One order per (user, key); orders without a key are not constrained
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

const orderModel =
  (mongoose.models.Order as Model<IOrder> | undefined) ||
  model<IOrder>("Order", orderSchema);

export default orderModel;
