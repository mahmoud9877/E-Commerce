import { api, qs } from "./api";
import type {
  AppNotification,
  Brand,
  Cart,
  Category,
  Coupon,
  Order,
  OrderStatus,
  Pagination,
  PaymentType,
  Product,
  Review,
  Subcategory,
  User,
} from "./types";

// One function per backend endpoint (see backend/README.md#api-reference)

type Query = Record<string, string | number | boolean | string[] | undefined>;
type Done = { message: string };

// ---- Auth -------------------------------------------------------------------------------------

export const auth = {
  signup: (body: { userName: string; email: string; password: string; cPassword: string }) =>
    api<Done & { _id: string }>("/auth/signup", { method: "POST", body }),
  sendCode: (email: string) => api<Done>("/auth/sendCode", { method: "PATCH", body: { email } }),
  forgetPassword: (body: { email: string; code: string; password: string; cPassword: string }) =>
    api<Done>("/auth/forgetPassword", { method: "PATCH", body }),
  users: (query: Query) =>
    api<{ userList: User[]; pagination: Pagination }>(`/auth${qs(query)}`, { auth: true }),
};

// ---- Catalog ----------------------------------------------------------------------------------

export const products = {
  // On /product a numeric "size" is the page size; a letter (s, m, lg, xl) filters by product size
  list: (query: Query) => api<{ productList: Product[]; pagination: Pagination }>(`/product${qs(query)}`),
  get: (id: string) => api<Done & { product: Product }>(`/product/${id}`).then((res) => res.product),
  create: (form: FormData) => api<Done & { product: Product }>("/product", { method: "POST", body: form, auth: true }),
  update: (id: string, form: FormData) =>
    api<Done & { updatedProduct: Product }>(`/product/${id}`, { method: "PUT", body: form, auth: true }),
  wishlist: () => api<Done & { wishlist: Product[] }>("/product/wishlist", { auth: true }).then((res) => res.wishlist),
  wishlistAdd: (id: string) => api<Done>(`/product/${id}/wishlist/add`, { method: "PATCH", auth: true }),
  wishlistRemove: (id: string) => api<Done>(`/product/${id}/wishlist/remove`, { method: "PATCH", auth: true }),
};

export const reviews = {
  list: (productId: string, query: Query = {}) =>
    api<{ reviewList: Review[]; pagination: Pagination }>(`/product/${productId}/review${qs(query)}`),
  create: (productId: string, body: { comment: string; rating: number }) =>
    api<Done & { review: Review }>(`/product/${productId}/review`, { method: "POST", body, auth: true }),
  update: (productId: string, reviewId: string, body: { comment?: string; rating?: number }) =>
    api<Done & { review: Review }>(`/product/${productId}/review/${reviewId}`, { method: "PATCH", body, auth: true }),
};

export const categories = {
  list: (query: Query = {}) =>
    api<{ categoryList: Category[]; pagination: Pagination }>(`/category${qs({ size: 100, ...query })}`),
  create: (form: FormData) => api<Done>("/category", { method: "POST", body: form, auth: true }),
  update: (id: string, form: FormData) => api<Done>(`/category/${id}`, { method: "PUT", body: form, auth: true }),
  remove: (categoryId: string) => api<Done>("/category", { method: "DELETE", body: { categoryId }, auth: true }),
};

export const subcategories = {
  list: (categoryId?: string, query: Query = {}) =>
    api<{ subcategoryList: Subcategory[]; pagination: Pagination }>(
      `${categoryId ? `/category/${categoryId}/subcategory` : "/subcategory"}${qs({ size: 100, ...query })}`
    ),
  create: (categoryId: string, form: FormData) =>
    api<Done>(`/category/${categoryId}/subcategory`, { method: "POST", body: form, auth: true }),
  update: (categoryId: string, id: string, form: FormData) =>
    api<Done>(`/category/${categoryId}/subcategory/${id}`, { method: "PUT", body: form, auth: true }),
};

export const brands = {
  list: (query: Query = {}) =>
    api<{ brandList: Brand[]; pagination: Pagination }>(`/brand${qs({ size: 100, ...query })}`),
  create: (form: FormData) => api<Done>("/brand", { method: "POST", body: form, auth: true }),
  update: (id: string, form: FormData) => api<Done>(`/brand/${id}`, { method: "PUT", body: form, auth: true }),
  remove: (brandId: string) => api<Done>("/brand", { method: "DELETE", body: { brandId }, auth: true }),
};

// ---- Shopping ---------------------------------------------------------------------------------

export const cart = {
  get: () => api<Cart | null>("/cart", { auth: true }),
  // Adds the product, or sets its quantity when it is already in the cart
  set: (productId: string, quantity: number) =>
    api<Done>("/cart", { method: "POST", body: { productId, quantity }, auth: true }),
  remove: (productId: string) => api<Done>(`/cart/${productId}/remove`, { method: "PATCH", auth: true }),
  clear: () => api<Done>("/cart/deleteCart", { method: "DELETE", auth: true }),
};

export const coupons = {
  list: (query: Query = {}) =>
    api<{ couponList: Coupon[]; pagination: Pagination }>(`/coupon${qs(query)}`, { auth: true }),
  create: (form: FormData) => api<Done>("/coupon", { method: "POST", body: form, auth: true }),
  update: (id: string, form: FormData) => api<Done>(`/coupon/${id}`, { method: "PUT", body: form, auth: true }),
};

export interface CheckoutInput {
  address: string;
  phone: string[];
  paymentType: PaymentType;
  couponName?: string;
  note?: string;
}

type OrderPage = { orderList: Order[]; pagination: Pagination };

export const orders = {
  mine: (query: { page?: number; status?: OrderStatus | "" }) => api<OrderPage>(`/order${qs(query)}`, { auth: true }),
  all: (query: { page?: number; status?: OrderStatus | "" }) => api<OrderPage>(`/order/all${qs(query)}`, { auth: true }),
  // The key makes retries safe: the same key returns the original order instead of a new one
  create: (body: CheckoutInput, idempotencyKey: string) =>
    api<Done & { order: Order; session?: { id: string; url: string | null } }>("/order", {
      method: "POST",
      body,
      headers: { "Idempotency-Key": idempotencyKey },
      auth: true,
    }),
  cancel: (orderId: string, reason: string) =>
    api<Done & { order: Order }>(`/order/${orderId}/cancel`, { method: "PATCH", body: { reason }, auth: true }),
  delivered: (orderId: string) =>
    api<Done & { order: Order }>(`/order/${orderId}/delivered`, { method: "PATCH", auth: true }),
};

export const notifications = {
  list: (query: Query) =>
    api<{ notifications: AppNotification[]; unreadCount: number; pagination: Pagination }>(
      `/notification${qs(query)}`,
      { auth: true }
    ),
  markRead: (id: string) => api<Done>(`/notification/${id}/read`, { method: "PATCH", auth: true }),
  markAllRead: () => api<Done & { updated: number }>("/notification/read-all", { method: "PATCH", auth: true }),
};
