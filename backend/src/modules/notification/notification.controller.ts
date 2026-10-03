import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { NotificationService } from "./notification.service.js";

export class NotificationController extends BaseController {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async getNotifications(req: Request, res: Response) {
    const { data: notifications, pagination, unreadCount } =
      await this.notificationService.listForUser(BaseController.currentUser(req)._id, req.query);
    return res.status(200).json({ message: "Done", notifications, unreadCount, pagination });
  }

  async markRead(req: Request<{ notificationId: string }>, res: Response) {
    const notification = await this.notificationService.markRead(
      BaseController.currentUser(req)._id,
      req.params.notificationId
    );
    return res.status(200).json({ message: "Done", notification });
  }

  async markAllRead(req: Request, res: Response) {
    const updated = await this.notificationService.markAllRead(BaseController.currentUser(req)._id);
    return res.status(200).json({ message: "Done", updated });
  }
}
