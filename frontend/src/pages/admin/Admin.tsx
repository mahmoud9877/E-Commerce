import type { Route } from "../../lib/router";
import { AdminBrands } from "./AdminBrands";
import { AdminCategories } from "./AdminCategories";
import { AdminCoupons } from "./AdminCoupons";
import { AdminOrders } from "./AdminOrders";
import { AdminProducts } from "./AdminProducts";
import { AdminUsers } from "./AdminUsers";

const TABS = [
  { id: "orders", label: "Orders" },
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "brands", label: "Brands" },
  { id: "coupons", label: "Coupons" },
  { id: "users", label: "Users" },
] as const;

// #/admin/<tab>; only reachable with an admin session (see App.tsx), and every call is
// re-checked by the backend
export function Admin({ route }: { route: Route }) {
  const tab = route.segments[1] ?? "orders";
  return (
    <section className="stack">
      <h1>Admin</h1>
      <nav className="tabs">
        {TABS.map((t) => (
          <a key={t.id} href={`#/admin/${t.id}`} className={tab === t.id ? "active" : ""}>
            {t.label}
          </a>
        ))}
      </nav>
      {tab === "orders" && <AdminOrders route={route} />}
      {tab === "products" && <AdminProducts />}
      {tab === "categories" && <AdminCategories />}
      {tab === "brands" && <AdminBrands />}
      {tab === "coupons" && <AdminCoupons />}
      {tab === "users" && <AdminUsers />}
    </section>
  );
}
