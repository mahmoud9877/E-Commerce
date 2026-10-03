import { useRef, useState, type FormEvent } from "react";
import { ErrorText } from "../components/ui";
import { orders, type CheckoutInput } from "../endpoints";
import { signalCartChange, signalNotificationsChange } from "../lib/hooks";
import { navigate } from "../lib/router";

const PHONE = "^(010|011|012|015)[0-9]{8}$";

// randomUUID only exists in secure contexts (https or localhost), e.g. not on http://<lan-ip>
const newKey = () =>
  crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

export function Checkout() {
  // One key per checkout attempt, reused if the same submission is retried, so a double click or
  // a timeout never creates two orders
  const idempotencyKey = useRef(newKey());
  const [phones, setPhones] = useState([""]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const optional = (key: string) => String(form.get(key) ?? "").trim() || undefined;
    const body: CheckoutInput = {
      address: String(form.get("address")).trim(),
      phone: phones.map((p) => p.trim()).filter(Boolean),
      paymentType: form.get("paymentType") === "card" ? "card" : "cash",
      couponName: optional("couponName"),
      note: optional("note"),
    };
    setBusy(true);
    setError(null);
    try {
      const res = await orders.create(body, idempotencyKey.current);
      signalCartChange();
      signalNotificationsChange();
      if (res.session?.url) {
        // Card: pay on Stripe, which returns to #/order (paid) or #/orders (cancelled)
        window.location.href = res.session.url;
        return;
      }
      navigate("/orders", { placed: res.order._id });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <h1>Checkout</h1>
      <p className="muted small">Everything currently in your cart will be ordered.</p>
      <label>
        Delivery address
        <textarea name="address" minLength={10} maxLength={1000} required placeholder="Street, building, city" />
      </label>
      <fieldset className="stack">
        <legend>Phone numbers (1 to 3)</legend>
        {phones.map((phone, i) => (
          <div className="row" key={i}>
            <input
              type="tel"
              value={phone}
              pattern={PHONE}
              title="Egyptian mobile number, e.g. 01012345678"
              required={i === 0}
              placeholder="01012345678"
              onChange={(e) => setPhones(phones.map((p, j) => (j === i ? e.target.value : p)))}
            />
            {i > 0 && (
              <button type="button" className="secondary" onClick={() => setPhones(phones.filter((_, j) => j !== i))}>
                Remove
              </button>
            )}
          </div>
        ))}
        {phones.length < 3 && (
          <button type="button" className="link" onClick={() => setPhones([...phones, ""])}>
            + Add another number
          </button>
        )}
      </fieldset>
      <label>
        Coupon code (optional)
        <input name="couponName" autoComplete="off" />
      </label>
      <label>
        Note (optional)
        <textarea name="note" />
      </label>
      <fieldset className="row">
        <legend>Payment</legend>
        <label className="inline">
          <input type="radio" name="paymentType" value="cash" defaultChecked /> Cash on delivery
        </label>
        <label className="inline">
          <input type="radio" name="paymentType" value="card" /> Card (Stripe)
        </label>
      </fieldset>
      <ErrorText error={error} />
      <button type="submit" disabled={busy}>
        {busy ? "Placing order..." : "Place order"}
      </button>
    </form>
  );
}
