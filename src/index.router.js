import cors from "cors";
import morgan from "morgan";
import connectDB from "../DB/connection.js";
import cartRouter from "./modules/cart/cart.router.js";
import authRouter from "./modules/auth/auth.router.js";
import branRouter from "./modules/brand/brand.router.js";
import orderRouter from "./modules/order/order.router.js";
import couponRouter from "./modules/coupon/coupon.router.js";
import { globalErrorHandling } from "./utils/errorHandling.js";
import productRouter from "./modules/product/product.router.js";
import reviewsRouter from "./modules/reviews/reviews.router.js";
import categoryRouter from "./modules/category/category.router.js";
import subcategoryRouter from "./modules/subcategory/subcategory.router.js";

const initApp = (app, express) => {
  const whiteList = ["http://localhost:3000"];
  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin || whiteList.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  };

  connectDB();

  app.use(cors(corsOptions));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    if (req.originalUrl === "/order/webhook") {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  if (process.env.MOOD === "DEV") {
    app.use(morgan("dev"));
  } else {
    app.use(morgan("common"));
  }

  app.get("/", (req, res) => {
    res.status(200).send("Welcome to the E-commerce API");
  });

  app.use(`/auth`, authRouter);
  app.use(`/product`, productRouter);
  app.use(`/category`, categoryRouter);
  app.use(`/subcategory`, subcategoryRouter);
  app.use(`/review`, reviewsRouter);
  app.use(`/coupon`, couponRouter);
  app.use(`/cart`, cartRouter);
  app.use(`/order`, orderRouter);
  app.use(`/brand`, branRouter);

  app.all("*", (req, res) => {
    res.status(404).json({ message: "Invalid route. Please check the URL or HTTP method." });
  });

  app.use(globalErrorHandling);
};

export default initApp;
