import type { ClientSession, Model, Types } from "mongoose";
import type { ParsedQs } from "qs";
import {
  notificationTypes,
  type INotification,
} from "../../db/models/Notification.Model.js";
import type { OrderDocument } from "../../db/models/Order.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { Id } from "../../types/common.js";
import type { UserService } from "../user/user.service.js";

// Owns stored in-app notifications; users are only read, to find the admins
export class NotificationService extends BaseService<INotification> {
  constructor(
    model: Model<INotification>,
    private readonly users: UserService
  ) {
    super(model);
  }

  // Called inside the order transaction, so notifications exist only if the order does
  async notifyOrderCreated(order: OrderDocument, session?: ClientSession): Promise<void> {
    const orderId = order._id;
    const shortId = orderId.toString().slice(-6).toUpperCase();
    const total = `${order.finalPrice} EGP`;
    const awaitingPayment = order.status === "waitPayment";

    const adminIds = await this.users.adminIds(session);

    await this.model.insertMany(
      [
        {
          recipientId: order.userId,
          type: notificationTypes.OrderCreated,
          title: "Order received",
          message: awaitingPayment
            ? `Your order #${shortId} (${total}) was created and is waiting for payment.`
            : `Your order #${shortId} (${total}) was placed successfully.`,
          data: { orderId },
        },
        ...adminIds
          // An admin who orders for themselves only needs the customer notification
          .filter((adminId) => !adminId.equals(order.userId))
          .map((adminId) => ({
            recipientId: adminId,
            type: notificationTypes.OrderReceived,
            title: "New order",
            message: `New ${order.paymentType} order #${shortId} for ${total}.`,
            data: { orderId },
          })),
      ],
      { session }
    );
  }

  async listForUser(userId: Types.ObjectId, query: ParsedQs) {
    const filter = {
      recipientId: userId,
      ...(query.unread === "true" && { readAt: null }),
    };
    const [page, unreadCount] = await Promise.all([
      this.paginate(filter, query, [], undefined, { createdAt: -1 }),
      this.model.countDocuments({ recipientId: userId, readAt: null }),
    ]);
    return { ...page, unreadCount };
  }

  async markRead(userId: Types.ObjectId, notificationId: Id) {
    // Filtering on recipientId means a user can never touch someone else's notification
    const notification = await this.model.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      [{ $set: { readAt: { $ifNull: ["$readAt", "$$NOW"] } } }],
      { new: true }
    );
    if (!notification) {
      throw new AppError("Notification not found", 404);
    }
    return notification;
  }

  async markAllRead(userId: Types.ObjectId): Promise<number> {
    const { modifiedCount } = await this.model.updateMany(
      { recipientId: userId, readAt: null },
      { readAt: new Date() }
    );
    return modifiedCount;
  }
}
