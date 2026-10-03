import { OrderCard } from "../components/OrderCard";
import { ErrorText, Loading, Notice, Pager } from "../components/ui";
import { orders } from "../endpoints";
import { signalNotificationsChange } from "../lib/hooks";
import { navigate, type Route } from "../lib/router";
import { useAsync } from "../lib/useAsync";
import type { OrderStatus } from "../types";

export const ORDER_STATUSES: OrderStatus[] = ["waitPayment", "placed", "onWay", "delivered", "canceled", "rejected"];

export function StatusFilter({ value, onChange }: { value: string; onChange: (status: string) => void }) {
  return (
    <label className="inline">
      Status{" "}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Orders({ route }: { route: Route }) {
  const status = (route.query.get("status") ?? "") as OrderStatus | "";
  const page = Number(route.query.get("page")) || 1;
  const list = useAsync(() => orders.mine({ status, page }), [status, page]);

  return (
    <section className="stack">
      <div className="row between">
        <h1>My orders</h1>
        <StatusFilter value={status} onChange={(s) => navigate("/orders", { status: s })} />
      </div>
      <Notice>{route.query.get("placed") && "Your order was placed."}</Notice>
      {route.query.get("checkout") === "cancelled" && (
        <p className="error">
          Payment was not completed. You can pay from the order below until the payment link expires, or cancel the
          order.
        </p>
      )}
      <ErrorText error={list.error} />
      <Loading when={list.loading && !list.data} />
      {list.data?.orderList.length === 0 && <p className="muted">No orders yet.</p>}
      {list.data?.orderList.map((order) => (
        <OrderCard
          key={order._id}
          order={order}
          focused={route.query.get("focus") === order._id || route.query.get("orderId") === order._id}
          onCancel={async (reason) => {
            await orders.cancel(order._id, reason);
            signalNotificationsChange();
            list.reload();
          }}
        />
      ))}
      <Pager pagination={list.data?.pagination} onPage={(p) => navigate("/orders", { status, page: p })} />
    </section>
  );
}
