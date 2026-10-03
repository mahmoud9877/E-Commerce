// Composition root: the only place that knows which concrete classes back each abstraction.
// Swap an implementation (e.g. a different mailer or payment gateway) here without touching modules.
import type { Router } from "express";
import brandModel from "./db/models/Brand.Model.js";
import cartModel from "./db/models/Cart.Model.js";
import categoryModel from "./db/models/Category.Model.js";
import couponModel from "./db/models/Coupon.Model.js";
import couponUsageModel from "./db/models/CouponUsage.Model.js";
import orderModel from "./db/models/Order.Model.js";
import notificationModel from "./db/models/Notification.Model.js";
import productModel from "./db/models/Product.Model.js";
import refreshTokenModel from "./db/models/RefreshToken.Model.js";
import reviewModel from "./db/models/Review.Model.js";
import subcategoryModel from "./db/models/Subcategory.Model.js";
import userModel from "./db/models/User.model.js";
import type { IHasher, IImageStorage, IMailer, IPaymentGateway, ITokenService } from "./core/contracts.js";
import { AuthMiddleware } from "./middleware/auth.js";
import { EmailService } from "./integrations/EmailService.js";
import { HashService } from "./integrations/HashService.js";
import { ImageService } from "./integrations/ImageService.js";
import { PaymentService } from "./integrations/PaymentService.js";
import { TokenService } from "./integrations/TokenService.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthRouter } from "./modules/auth/auth.router.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { EmailVerificationService } from "./modules/auth/emailVerification.service.js";
import { PasswordResetService } from "./modules/auth/passwordReset.service.js";
import { SessionService } from "./modules/auth/session.service.js";
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
import { NotificationController } from "./modules/notification/notification.controller.js";
import { NotificationRouter } from "./modules/notification/notification.router.js";
import { NotificationService } from "./modules/notification/notification.service.js";
import { ProductController } from "./modules/product/product.controller.js";
import { ProductRouter } from "./modules/product/product.router.js";
import { ProductService } from "./modules/product/product.service.js";
import { ReviewController } from "./modules/review/review.controller.js";
import { ReviewRouter } from "./modules/review/review.router.js";
import { ReviewService } from "./modules/review/review.service.js";
import { SubcategoryController } from "./modules/subcategory/subcategory.controller.js";
import { SubcategoryRouter } from "./modules/subcategory/subcategory.router.js";
import { SubcategoryService } from "./modules/subcategory/subcategory.service.js";
import { UserService } from "./modules/user/user.service.js";
import { WishlistService } from "./modules/user/wishlist.service.js";

// External services; tests pass fakes for the ones that would call the outside world
export interface Integrations {
  tokens: ITokenService;
  hasher: IHasher;
  mailer: IMailer;
  images: IImageStorage;
  payments: IPaymentGateway;
}

export interface Container {
  routes: Record<string, Router>;
  // Used by background jobs (src/jobs)
  orders: OrderService;
}

export function buildContainer(overrides: Partial<Integrations> = {}): Container {
  // Infrastructure
  const tokens = overrides.tokens ?? new TokenService();
  const hasher = overrides.hasher ?? new HashService();
  const mailer = overrides.mailer ?? new EmailService();
  const images = overrides.images ?? new ImageService();
  const payments = overrides.payments ?? new PaymentService();
  const users = new UserService(userModel);
  const auth = new AuthMiddleware(users, tokens);

  // Auth
  const sessions = new SessionService(refreshTokenModel, users, tokens);
  const verification = new EmailVerificationService(userModel, tokens, mailer);
  const passwordReset = new PasswordResetService(userModel, hasher, mailer, sessions);
  const authService = new AuthService(userModel, sessions, hasher, verification);
  const authRouter = new AuthRouter(
    new AuthController(authService, verification, passwordReset, sessions, users),
    auth
  );

  // Domain services shared across modules (each one owns its collection)
  const productService = new ProductService({
    model: productModel,
    subcategories: subcategoryModel,
    brands: brandModel,
    images,
  });
  const couponService = new CouponService(couponModel, images, couponUsageModel);
  const cartService = new CartService(cartModel, productService);
  const checkout = new CheckoutService(payments);
  const notificationService = new NotificationService(notificationModel, users);
  const orderService = new OrderService({
    model: orderModel,
    carts: cartService,
    coupons: couponService,
    products: productService,
    checkout,
    notifications: notificationService,
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
    new CategoryController(
      new CategoryService({
        model: categoryModel,
        subcategories: subcategoryModel,
        products: productModel,
        images,
      })
    ),
    auth,
    subcategoryRouter
  );

  const brandRouter = new BrandRouter(
    new BrandController(new BrandService(brandModel, images, productModel)),
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

  const notificationRouter = new NotificationRouter(
    new NotificationController(notificationService),
    auth
  );

  const routes = {
    "/auth": authRouter.router,
    "/product": productRouter.router,
    "/category": categoryRouter.router,
    "/subcategory": subcategoryRouter,
    "/review": reviewRouter,
    "/coupon": couponRouter.router,
    "/cart": cartRouter.router,
    "/order": orderRouter.router,
    "/brand": brandRouter.router,
    "/notification": notificationRouter.router,
  };
  return { routes, orders: orderService };
}
