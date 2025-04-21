import { asyncHandler } from "../../../utils/errorHandling.js";
import productModel from "../../../../DB/model/Product.Model.js";
import cartModel from "../../../../DB/model/Cart.Model.js";

export const getCart = asyncHandler(async (req, res, next) => {
  const cart = await cartModel.find({});
  return res.status(200).json(cart);
});
// Add to cart handler
export const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  // Check if the product exists and has enough stock
  const product = await productModel.findOne({
    _id: productId,
    stock: { $gte: quantity },
    isDeleted: false,
  });
  if (!product) {
    return next(new Error("Invalid product max available", { cause: 404 }));
  }
  // Find the user's cart
  const cart = await cartModel.findOne({ userId: req.user._id });

  if (!cart) {
    // Create a new cart if it doesn't exist
    const newCart = await cartModel.create({
      userId: req.user._id,
      products: [{ productId, quantity }],
    });
    return res.status(201).json({ message: "Cart created", newCart });
  }
  let matchProduct = false;
  for (const product of cart.products) {
    if (product.productId.toString() == productId) {
      product.quantity = quantity;
      matchProduct = true;
      break;
    }
  }
  if (!matchProduct) {
    cart.products.push({ productId, quantity });
  }
  await cart.save();
  return res.status(200).json({ message: "Done", cart });
});

export async function deleteElementsFromCart(productIds, userId) {
  const cart = await cartModel.findOneAndUpdate(
    { userId },
    {
      $pull: {
        products: {
          productId: { $in: productIds },
        },
      },
    },
    { new: true } // Return the updated document
  );
  return cart;
}

// Delete from cart handler
export const deleteFromCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  if (!productIds || !productIds.length) {
    return next(new Error("No product IDs provided", { cause: 400 }));
  }

  const cart = await deleteElementsFromCart(productId, req.user._id);

  if (!cart) {
    return next(new Error("Failed to update cart", { cause: 500 }));
  }

  return res.status(200).json({ message: "Products removed from cart", cart });
});

// Utility function to clear the entire cart
export async function clearAllCart(userId) {
  const cart = await cartModel.updateOne(
    { userId },
    { products: [] },
    { new: true }
  );
  return cart;
}

// Clear the entire cart handler
export const clearCart = asyncHandler(async (req, res, next) => {
  const cart = await clearAllCart(req.user._id);
  return res.status(200).json({ message: "Cart cleared", cart });
});
