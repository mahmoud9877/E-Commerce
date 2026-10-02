// Composition root: the only place that knows which concrete classes back each abstraction.
// Swap an implementation (e.g. a different mailer or payment gateway) here without touching modules.
import type { Router } from "express";
import brandModel from "../DB/model/Brand.Model.js";
import cartModel from "../DB/model/Cart.Model.js";
import categoryModel from "../DB/model/Category.Model.js";
import couponModel from "../DB/model/Coupon.Model.js";
import orderModel from "../DB/model/Order.Model.js";
import productModel from "../DB/model/Product.Model.js";
import reviewModel from "../DB/model/Review.Model.js";
import subcategoryModel from "../DB/model/Subcategory.Model.js";
import userModel from "../DB/model/User.model.js";
import { AuthMiddleware } from "./middleware/auth.js";
import { EmailService } from "./services/EmailService.js";
import { HashService } from "./services/HashService.js";
import { ImageService } from "./services/ImageService.js";
import { PaymentService } from "./services/PaymentService.js";
import { TokenService } from "./services/TokenService.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthRouter } from "./modules/auth/auth.router.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { EmailVerificationService } from "./modules/auth/emailVerification.service.js";
import { PasswordResetService } from "./modules/auth/passwordReset.service.js";
import { BrandController } from "./modules/brand/brand.controller.js";
import { BrandRouter } from "./modules/brand/brand.router.js";
import { BrandService } from "./modules/brand/brand.service.js";
import { CartController } from "./modules/cart/cart.controller.js";
import { CartRouter } from "./modules/cart/cart.router.js";
import { CartService } from "./modules/cart/cart.service.js";
import { CategoryController } from "./modules/category/category.controller.js";
import { CategoryRouter } from "./modules/category/category.router.js";
import { CategoryService } from "./modules/category/category.service.js";
import { CouponController } from "./modules/coupon/coupon.controller.js";
import { CouponRouter } from "./modules/coupon/coupon.router.js";
import { CouponService } from "./modules/coupon/coupon.service.js";
import { CheckoutService } from "./modules/order/checkout.service.js";
import { OrderController } from "./modules/order/order.controller.js";
import { OrderRouter } from "./modules/order/order.router.js";
import { OrderService } from "./modules/order/order.service.js";
import { ProductController } from "./modules/product/product.controller.js";
import { ProductRouter } from "./modules/product/product.router.js";
import { ProductService } from "./modules/product/product.service.js";
import { ReviewController } from "./modules/reviews/review.controller.js";
import { ReviewRouter } from "./modules/reviews/reviews.router.js";
import { ReviewService } from "./modules/reviews/review.service.js";
import { SubcategoryController } from "./modules/subcategory/subcategory.controller.js";
import { SubcategoryRouter } from "./modules/subcategory/subcategory.router.js";
import { SubcategoryService } from "./modules/subcategory/subcategory.service.js";
import { WishlistService } from "./modules/user/wishlist.service.js";

export function buildRoutes(): Record<string, Router> {
  // Infrastructure
  const tokens = new TokenService();
  const hasher = new HashService();
  const mailer = new EmailService();
  const images = new ImageService();
  const payments = new PaymentService();
  const auth = new AuthMiddleware(userModel, tokens);

  // Auth
  const verification = new EmailVerificationService(userModel, tokens, mailer);
  const passwordReset = new PasswordResetService(userModel, hasher, mailer);
  const authService = new AuthService(userModel, tokens, hasher, verification);
  const authRouter = new AuthRouter(
    new AuthController(authService, verification, passwordReset),
    auth
  );

  // Domain services shared across modules (each one owns its collection)
  const productService = new ProductService({
    model: productModel,
    subcategories: subcategoryModel,
    brands: brandModel,
    images,
  });
  const couponService = new CouponService(couponModel, images);
  const cartService = new CartService(cartModel, productService);
  const checkout = new CheckoutService(payments);
  const orderService = new OrderService({
    model: orderModel,
    carts: cartService,
    coupons: couponService,
    products: productService,
    checkout,
  });

  // Catalog
  const subcategoryRouter = new SubcategoryRouter(
    new SubcategoryController(
      new SubcategoryService(subcategoryModel, categoryModel, images)
    ),
    auth,
    { mergeParams: true }
  ).router;

  const reviewRouter = new ReviewRouter(
    new ReviewController(new ReviewService(reviewModel, orderService)),
    auth,
    { mergeParams: true }
  ).router;

  const categoryRouter = new CategoryRouter(
    new CategoryController(new CategoryService(categoryModel, images)),
    auth,
    subcategoryRouter
  );

  const brandRouter = new BrandRouter(
    new BrandController(new BrandService(brandModel, images)),
    auth
  );

  const productRouter = new ProductRouter(
    new ProductController(productService, new WishlistService(userModel, productService)),
    auth,
    reviewRouter
  );

  // Shopping
  const couponRouter = new CouponRouter(new CouponController(couponService), auth);

  const cartRouter = new CartRouter(new CartController(cartService), auth);

  const orderRouter = new OrderRouter(
    new OrderController(orderService, checkout),
    auth
  );

  return {
    "/auth": authRouter.router,
    "/product": productRouter.router,
    "/category": categoryRouter.router,
    "/subcategory": subcategoryRouter,
    "/review": reviewRouter,
    "/coupon": couponRouter.router,
    "/cart": cartRouter.router,
    "/order": orderRouter.router,
    "/brand": brandRouter.router,
  };
}
