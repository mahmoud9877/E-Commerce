import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { CartService } from "./cart.service.js";

export class CartController extends BaseController {
  constructor(private readonly cartService: CartService) {
    super();
  }

  async getCart(req: Request, res: Response) {
    const cart = await this.cartService.getByUser(BaseController.currentUser(req)._id);
    return res.status(200).json(cart);
  }

  async addToCart(req: Request, res: Response) {
    const { created, cart } = await this.cartService.addProduct(
      BaseController.currentUser(req)._id,
      req.body
    );
    if (created) {
      return res.status(201).json({ message: "Cart created", newCart: cart });
    }
    return res.status(200).json({ message: "Done", cart });
  }

  async deleteFromCart(req: Request<{ productId: string }>, res: Response) {
    const cart = await this.cartService.removeProducts(
      BaseController.currentUser(req)._id,
      req.params.productId
    );
    return res.status(200).json({ message: "Products removed from cart", cart });
  }

  async clearCart(req: Request, res: Response) {
    const cart = await this.cartService.clear(BaseController.currentUser(req)._id);
    return res.status(200).json({ message: "Cart cleared", cart });
  }
}
