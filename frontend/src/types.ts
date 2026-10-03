// Shapes returned by the backend (see backend/src/db/models). Only the fields the UI reads.

export interface ImageAsset {
  secure_url: string;
  public_id: string;
}

export interface Pagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const SIZES = ["s", "m", "lg", "xl"] as const;
export type Size = (typeof SIZES)[number];

export interface Product {
  _id: string;
  customId?: string;
  name: string;
  slug: string;
  description?: string;
  size?: Size[];
  colors?: string[];
  stock: number;
  price: number;
  discount: number;
  finalPrice: number;
  mainImage?: ImageAsset;
  subImages?: ImageAsset[];
  categoryId: string;
  subcategoryId: string;
  brandId: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: ImageAsset;
}

export interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: ImageAsset;
  categoryId: string;
}

export interface Brand {
  _id: string;
  name: string;
  image?: ImageAsset;
}

export interface Coupon {
  _id: string;
  name: string;
  amount: number;
  expire: string;
  image?: ImageAsset;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  _id: string;
  products: CartItem[];
}

export type OrderStatus = "waitPayment" | "placed" | "onWay" | "delivered" | "canceled" | "rejected";
export type PaymentType = "cash" | "card";

export interface OrderItem {
  name: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  finalPrice: number;
}

export interface Review {
  _id: string;
  comment: string;
  rating: number;
  productId: string;
  createBy: { _id: string; userName: string } | string;
  createdAt?: string;
}

export interface Order {
  _id: string;
  // Populated with the customer on the admin list (GET /order/all)
  userId?: string | { _id: string; userName: string; email: string };
  address: string;
  phone: string[];
  note?: string;
  products: OrderItem[];
  subtotal: number;
  finalPrice: number;
  paymentType: PaymentType;
  status: OrderStatus;
  reason?: string;
  createdAt?: string;
  checkoutSession?: { id: string; url: string | null };
}

export interface AppNotification {
  _id: string;
  type: "order.created" | "order.received";
  title: string;
  message: string;
  data: { orderId?: string };
  readAt: string | null;
  createdAt: string;
}

export interface User {
  _id: string;
  userName: string;
  email: string;
  role?: "User" | "Admin";
  status?: string;
  confirmEmail?: boolean;
  createdAt?: string;
}
