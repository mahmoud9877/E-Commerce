import Stripe from "stripe";

async function payment({
  payment_method_types = ["card"],
  mode = "payment",
  customer_email,
  metadata = {},
  cancel_url,
  success_url = `${process.env.FE_URL}/#/order`,
  line_items = [],
  discount = [],
} = {}) {
  const stripe = new Stripe(process.env.Secret_Key);
  const session = await stripe.checkout.sessions.create({
    payment_method_types,
    mode,
    customer_email,
    metadata,
    cancel_url,
    success_url,
    line_items,
    discounts: [], // Note: use 'discounts' instead of 'discount'
  });

  return session;
}

export default payment;
