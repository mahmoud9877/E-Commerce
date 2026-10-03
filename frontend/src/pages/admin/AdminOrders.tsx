import { OrderCard } from "../../components/OrderCard";
import { ErrorText, Loading, Pager } from "../../components/ui";
import { orders } from "../../endpoints";
import { signalNotificationsChange } from "../../lib/hooks";
import { navigate, type Route } from "../../lib/router";
import { useAsync } from "../../lib/useAsync";
import type { OrderStatus } from "../../types";
import { StatusFilter } from "../Orders";

export function AdminOrders({ route }: { route: Route }) {
  const status = (route.query.get("status") ?? "") as OrderStatus | "";
  const page = Number(route.query.get("page")) || 1;
  const focus = route.query.get("focus");
  const list = useAsync(() => orders.all({ status, page }), [status, page]);

  return (
    <section className="stack">
      <div className="row between">
        <h2>All orders</h2>
        <StatusFilter value={status} onChange={(s) => navigate("/admin/orders", { status: s })} />
      </div>
      <p className="muted small">
        Orders arrive as <code>placed</code> (cash, or card once paid). Mark them delivered when they reach the
        customer; customers can only review delivered products.
      </p>
      <ErrorText error={list.error} />
      <Loading when={list.loading && !list.data} />
      {list.data?.orderList.length === 0 && <p className="muted">No orders.</p>}
      {list.data?.orderList.map((order) => (
        <OrderCard
          key={order._id}
          order={order}
          focused={focus === order._id}
          onDelivered={async () => {
            await orders.delivered(order._id);
            signalNotificationsChange();
            list.reload();
          }}
        />
      ))}
      <Pager pagination={list.data?.pagination} onPage={(p) => navigate("/admin/orders", { status, page: p })} />
    </section>
  );
}
