import { useState } from "react";
import { Price } from "../components/ProductCard";
import { ErrorText, Loading, money } from "../components/ui";
import { cart, products } from "../endpoints";
import { signalCartChange } from "../lib/hooks";
import { useAsync } from "../lib/useAsync";
import type { Product } from "../types";

interface Line {
  productId: string;
  quantity: number;
  // null when the product was deleted after it was added
  product: Product | null;
}

async function loadLines(): Promise<Line[]> {
  const current = await cart.get();
  return Promise.all(
    (current?.products ?? []).map(async ({ productId, quantity }) => ({
      productId,
      quantity,
      product: await products.get(productId).catch(() => null),
    }))
  );
}

export function CartPage() {
  const lines = useAsync(loadLines, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      signalCartChange();
      lines.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (lines.loading && !lines.data) return <Loading when />;
  const items = lines.data ?? [];
  const total = items.reduce((sum, l) => sum + (l.product ? l.product.finalPrice * l.quantity : 0), 0);
  const unavailable = items.some((l) => !l.product || l.product.stock < l.quantity);

  return (
    <section className="stack">
      <h1>Cart</h1>
      <ErrorText error={lines.error || error} />
      {items.length === 0 && (
        <p className="muted">
          Your cart is empty. <a href="#/">Browse products</a>
        </p>
      )}
      {items.map((line) => (
        <article key={line.productId} className="card cart-line">
          {line.product?.mainImage ? <img src={line.product.mainImage.secure_url} alt="" /> : <div className="img-placeholder" />}
          <div className="stack grow">
            {line.product ? (
              <a href={`#/product/${line.productId}`}>
                <strong>{line.product.name}</strong>
              </a>
            ) : (
              <strong className="muted">Product no longer available</strong>
            )}
            {line.product && <Price product={line.product} />}
            {line.product && line.product.stock < line.quantity && (
              <span className="error small">Only {line.product.stock} left in stock</span>
            )}
          </div>
          <input
            type="number"
            className="qty"
            min={1}
            defaultValue={line.quantity}
            disabled={busy || !line.product}
            aria-label="Quantity"
            onBlur={(e) => {
              const quantity = Number(e.target.value);
              if (quantity >= 1 && quantity !== line.quantity) void run(() => cart.set(line.productId, quantity));
            }}
          />
          <strong className="line-total">{line.product ? money(line.product.finalPrice * line.quantity) : "-"}</strong>
          <button type="button" className="secondary" disabled={busy} onClick={() => void run(() => cart.remove(line.productId))}>
            Remove
          </button>
        </article>
      ))}
      {items.length > 0 && (
        <div className="card row between">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => window.confirm("Remove every item from your cart?") && void run(() => cart.clear())}
          >
            Clear cart
          </button>
          <div className="row">
            <strong>Total: {money(total)}</strong>
            <a className={`button${unavailable ? " disabled" : ""}`} href={unavailable ? undefined : "#/checkout"}>
              Checkout
            </a>
          </div>
        </div>
      )}
      {unavailable && items.length > 0 && (
        <p className="error">Remove unavailable items or lower their quantity before checking out.</p>
      )}
    </section>
  );
}
