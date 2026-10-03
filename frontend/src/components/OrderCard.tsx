import { useEffect, useState } from "react";
import type { Order } from "../types";
import { date, ErrorText, money, StatusBadge } from "./ui";

// Mirrors the backend rules (order.service.ts) so buttons only appear when the action can succeed
export const canCancel = (o: Order) =>
  (o.paymentType === "cash" && o.status === "placed") || (o.paymentType === "card" && o.status === "waitPayment");
export const canMarkDelivered = (o: Order) => o.status === "placed" || o.status === "onWay";

export function OrderCard({
  order,
  focused = false,
  onCancel,
  onDelivered,
}: {
  order: Order;
  // Scrolled into view and highlighted (links from notifications use ?focus=<orderId>)
  focused?: boolean;
  onCancel?: (reason: string) => Promise<unknown>;
  onDelivered?: () => Promise<unknown>;
}) {
  useEffect(() => {
    if (focused) document.getElementById(`order-${order._id}`)?.scrollIntoView({ block: "center" });
  }, [focused, order._id]);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const customer = typeof order.userId === "object" ? order.userId : null;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setCancelling(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`card stack${focused ? " focused" : ""}`} id={`order-${order._id}`}>
      <div className="row between">
        <div>
          <strong>Order {order._id.slice(-8).toUpperCase()}</strong>{" "}
          <span className="muted small">{date(order.createdAt)}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>
      {customer && (
        <p className="small">
          Customer: <strong>{customer.userName}</strong> <span className="muted">{customer.email}</span>
        </p>
      )}
      <table className="table">
        <tbody>
          {order.products.map((item) => (
            <tr key={item.productId}>
              <td>
                <a href={`#/product/${item.productId}`}>{item.name}</a>
              </td>
              <td className="num">
                {item.quantity} × {money(item.unitPrice)}
              </td>
              <td className="num">{money(item.finalPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {order.subtotal !== order.finalPrice && (
            <tr>
              <td colSpan={2}>Subtotal</td>
              <td className="num">{money(order.subtotal)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={2}>
              <strong>Total</strong> <span className="muted small">({order.paymentType === "card" ? "card" : "cash on delivery"})</span>
            </td>
            <td className="num">
              <strong>{money(order.finalPrice)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="small">
        <span className="muted">Deliver to:</span> {order.address}
        <br />
        <span className="muted">Phone:</span> {order.phone.join(", ")}
        {order.note && (
          <>
            <br />
            <span className="muted">Note:</span> {order.note}
          </>
        )}
        {order.reason && (
          <>
            <br />
            <span className="muted">Cancellation reason:</span> {order.reason}
          </>
        )}
      </p>

      <div className="row">
        {order.status === "waitPayment" && order.checkoutSession?.url && onCancel && (
          <a className="button" href={order.checkoutSession.url}>
            Pay now
          </a>
        )}
        {onCancel && canCancel(order) && !cancelling && (
          <button type="button" className="secondary" onClick={() => setCancelling(true)}>
            Cancel order
          </button>
        )}
        {onDelivered && canMarkDelivered(order) && (
          <button type="button" disabled={busy} onClick={() => void run(onDelivered)}>
            Mark as delivered
          </button>
        )}
      </div>
      {cancelling && onCancel && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => onCancel(reason));
          }}
        >
          <label>
            Why are you cancelling?
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={2} maxLength={5000} required />
          </label>
          <div className="row">
            <button type="submit" disabled={busy}>
              Confirm cancellation
            </button>
            <button type="button" className="secondary" onClick={() => setCancelling(false)}>
              Keep order
            </button>
          </div>
        </form>
      )}
      <ErrorText error={error} />
    </article>
  );
}
