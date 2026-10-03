import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";

export const notificationTypes = {
  // To the customer: their order was received
  OrderCreated: "order.created",
  // To each admin: a customer placed a new order
  OrderReceived: "order.received",
} as const;

export type NotificationType = (typeof notificationTypes)[keyof typeof notificationTypes];

export interface INotification {
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  // Lets the client link to the related resource
  data: { orderId?: Types.ObjectId };
  readAt: Date | null;
  createdAt?: Date;
}

export type NotificationDocument = HydratedDocument<INotification>;

// Old notifications are removed automatically
const RETENTION_SECONDS = 60 * 60 * 24 * 90;

const notificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true, enum: Object.values(notificationTypes) },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: {
      orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Serves "my notifications, newest first" and the unread count
notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

const notificationModel =
  (mongoose.models.Notification as Model<INotification> | undefined) ||
  model<INotification>("Notification", notificationSchema);

export default notificationModel;
