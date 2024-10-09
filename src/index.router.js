import morgan from "morgan";
import connectDB from "../DB/connection.js";
import authRouter from "./modules/auth/auth.router.js";
import branRouter from "./modules/brand/brand.router.js";
import cartRouter from "./modules/cart/cart.router.js";
import categoryRouter from "./modules/category/category.router.js";
import couponRouter from "./modules/coupon/coupon.router.js";
import orderRouter from "./modules/order/order.router.js";
import cors from "cors";
import productRouter from "./modules/product/product.router.js";
import reviewsRouter from "./modules/reviews/reviews.router.js";
import subcategoryRouter from "./modules/subcategory/subcategory.router.js";
import { globalErrorHandling } from "./utils/errorHandling.js";

const initApp = (app, express) => {
  var whiteList = ["http://localhost:3000/"];
  var corsOptions = {
    origin: function (origin, callback) {
      if (whiteList.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // Moved 'else' here
        callback(new Error("Not Allowed By Cors"));
      }
    },
  };

  app.use(cors());

  app.use((req, res, next) => {
    if (req.originalUrl === "/order/webhook") {
      next();
    } else {
      express.json({})(req, res, next);
    }
  });
  //convert Buffer Data
  if (process.env.MOOD == "DEV") {
    app.use(morgan("dev"));
  } else {
    app.use(morgan("common"));
  }
  app.use(express.json({}));
  //Setup API Routing
  app.get("/", (req, res, next) => {
    return res.status(200).send("Welcome in my E-commerce project");
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
  app.all("*", (req, res, next) => {
    res.send("In-valid Routing Plz check url or method");
  });
  app.use(globalErrorHandling);
  connectDB();
};

export default initApp;
