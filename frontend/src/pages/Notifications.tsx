import { useState } from "react";
import type { Session } from "../api";
import { date, ErrorText, Loading, Pager } from "../components/ui";
import { notifications } from "../endpoints";
import { signalNotificationsChange } from "../lib/hooks";
import { useAsync } from "../lib/useAsync";

export function Notifications({ session }: { session: Session }) {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const list = useAsync(
    () => notifications.list({ page, size: 20, unread: unreadOnly ? "true" : undefined }),
    [page, unreadOnly]
  );

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      signalNotificationsChange();
      list.reload();
    } catch (err) {
      setError(err);
    }
  }

  // Admins handle received orders in the admin area; customers see their own orders
  const orderLink = (orderId: string) =>
    session.isAdmin ? `#/admin/orders?focus=${orderId}` : `#/orders?focus=${orderId}`;

  return (
    <section className="stack">
      <div className="row between">
        <h1>Notifications</h1>
        <div className="row">
          <label className="inline">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
            />{" "}
            Unread only
          </label>
          <button
            type="button"
            className="secondary"
            disabled={!list.data?.unreadCount}
            onClick={() => void run(() => notifications.markAllRead())}
          >
            Mark all as read
          </button>
        </div>
      </div>
      <ErrorText error={list.error || error} />
      <Loading when={list.loading && !list.data} />
      {list.data?.notifications.length === 0 && <p className="muted">Nothing here.</p>}
      {list.data?.notifications.map((n) => (
        <article key={n._id} className={`card notification${n.readAt ? "" : " unread"}`}>
          <div className="row between">
            <strong>{n.title}</strong>
            <span className="muted small">{date(n.createdAt)}</span>
          </div>
          <p>{n.message}</p>
          <div className="row">
            {n.data.orderId && <a href={orderLink(n.data.orderId)}>View order</a>}
            {!n.readAt && (
              <button type="button" className="link" onClick={() => void run(() => notifications.markRead(n._id))}>
                Mark as read
              </button>
            )}
          </div>
        </article>
      ))}
      <Pager pagination={list.data?.pagination} onPage={setPage} />
    </section>
  );
}
