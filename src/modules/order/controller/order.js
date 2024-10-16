import { asyncHandler } from "../../../utils/errorHandling.js";
import couponModel from "../../../../DB/model/Coupon.Model.js";
import productModel from "../../../../DB/model/Product.Model.js";
import orderModel from "../../../../DB/model/Order.Model.js";
import payment from "../../../utils/payment.js";
import cartModel from "../../../../DB/model/Cart.Model.js";
import Stripe from "stripe";

export const createOrder = asyncHandler(async (req, res, next) => {
  const { address, phone, couponName, note, paymentType } = req.body;
  const userId = req.user._id;

  // Fetch the user's cart
  const cart = await cartModel.findOne({ userId });
  if (!cart || !cart.products?.length) {
    return next(new Error("Empty Cart", { cause: 400 }));
  }

  let coupon;
  if (couponName) {
    coupon = await couponModel.findOne({
      name: couponName.toLowerCase(),
    });

    if (!coupon || !coupon.expire || coupon.expire.getTime() < Date.now()) {
      return next(new Error("Invalid or expired coupon", { cause: 400 }));
    }
    req.body.coupon = coupon; // Store the coupon in req.body if needed later
  }

  const productIds = [];
  const finalProductList = [];
  let subtotal = 0;

  try {
    for (let product of cart.products) {
      const checkProduct = await productModel.findOne({
        _id: product.productId,
        stock: { $gte: product.quantity },
        isDeleted: false,
      });

      if (!checkProduct) {
        return next(
          new Error(`Invalid Product ${product.productId}`, { cause: 400 })
        );
      }

      productIds.push(product.productId);
      product = product.toObject();
      product.name = checkProduct.name;
      product.unitPrice = checkProduct.finalPrice;
      product.finalPrice = product.unitPrice * product.quantity;
      finalProductList.push(product);
      subtotal += product.finalPrice;
    }
  } catch (error) {
    return next(new Error("Product validation failed", { cause: 500 }));
  }

  const finalPrice = coupon
    ? subtotal - (subtotal * coupon.amount) / 100
    : subtotal;

  // Create the order
  let order;
  try {
    order = await orderModel.create({
      userId,
      address,
      note,
      phone,
      products: finalProductList,
      couponId: coupon?._id,
      subtotal,
      finalPrice,
      paymentType,
      status: paymentType === "card" ? "waitPayment" : "placed",
    });
  } catch (error) {
    return next(new Error("Order creation failed", { cause: 500 }));
  }

  // Update product stock
  try {
    for (let product of cart.products) {
      await productModel.updateOne(
        { _id: product.productId },
        { $inc: { stock: -parseInt(product.quantity) } }
      );
    }
  } catch (error) {
    return next(new Error("Stock update failed", { cause: 500 }));
  }

  // Mark coupon as used
  if (coupon) {
    try {
      await couponModel.updateOne(
        { _id: coupon._id },
        { $addToSet: { usedBy: userId } }
      );
    } catch (error) {
      return next(new Error("Coupon update failed", { cause: 500 }));
    }
  }

  // Remove products from cart
  try {
    await cartModel.updateOne(
      { userId },
      {
        $pull: {
          products: {
            productId: { $in: productIds },
          },
        },
      }
    );
  } catch (error) {
    return next(new Error("Cart update failed", { cause: 500 }));
  }

  if (order.paymentType === "card") {
    try {
      const stripe = new Stripe(process.env.Secret_Key);
      if (req.body.coupon) {
        const stripeCoupon = await stripe.coupons.create({
          percent_off: req.body.coupon.amount,
          duration: "once",
        });
        req.body.couponId = stripeCoupon.id;
      }
      const session = await payment({
        stripe,
        customer_email: req.user.email,
        metadata: {
          orderId: order._id.toString(),
        },
        cancel_url: `${req.protocol}://${
          req.headers.host
        }/order/cancel?orderId=${order._id.toString()}`,
        line_items: order.products.map((product) => ({
          price_data: {
            currency: "egp",
            product_data: {
              name: product.name,
            },
            unit_amount: product.unitPrice * 100,
          },
          quantity: product.quantity,
        })),
        discounts: req.body.couponId ? [{ coupon: req.body.couponId }] : [],
      });
      return res.status(201).json({ message: "Done", order, session });
    } catch (error) {
      return next(new Error("Stripe session creation failed", { cause: 500 }));
    }
  }

  return res.status(201).json({ message: "Order created successfully", order });
});

export const webhook = asyncHandler(async (req, res, next) => {
  const stripe = new Stripe(process.env.Secret_Key);
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.endpointSecret
    );
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  const { orderId } = event.data.object.metadata;
  if (event.type != "checkout.session.completed") {
    await orderModel.updateOne({ _id: orderId }, { status: "rejected" });
    return res.json({ message: "rejected link" });
  }
  await orderModel.updateOne({ _id: orderId }, { status: "placed" });
  return res.json({ message: "Done" });
});

export const cancelOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const order = await orderModel.findOne({
    _id: orderId,
    userId: req.user._id,
  });
  if (!order) {
    return next(new Error("In-Valid OrderId", { cause: 400 }));
  }
  if (
    (order.status != "placed" && order.paymentType == "cash") ||
    (order.status != "waitPayment" && order.paymentType == "card")
  ) {
    return next(
      new Error(
        `Cannot cancel your order after it been changed to ${order.status}`,
        {
          cause: 400,
        }
      )
    );
  }
  await orderModel.updateOne(
    { _id: orderId, userId: req.user._id },
    { status: "canceled", updateBy: req.user._id, reason }
  );

  for (let product of order.products) {
    await productModel.updateOne(
      { _id: product.productId },
      { $inc: { stock: parseInt(product.quantity) } }
    );
  }
  if (order.couponId) {
    await couponModel.updateOne(
      { _id: order.couponId },
      { $pull: { usedBy: req.user._id } }
    );
  }
  return res.status(200).json({ message: "Done", order });
});

export const deliveredOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const order = await orderModel.findOne({
    _id: orderId,
  });

  if (!order) {
    return next(new Error("Invalid order", { cause: 400 }));
  }

  if (
    ["waitPayment", "canceled", "rejected", "delivered"].includes(order.status)
  ) {
    return next(
      new Error("Cannot update your order after it has been changed", {
        cause: 400,
      })
    );
  }

  await orderModel.updateOne(
    { _id: orderId },
    { status: "canceled", updatedBy: req.user._id }
  );

  return res
    .status(200)
    .json({ message: "Order canceled successfully", order });
});
