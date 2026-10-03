import { useState } from "react";
import type { Session } from "../api";
import { cart, products } from "../endpoints";
import { signalCartChange, signalWishlistChange } from "../lib/hooks";
import type { Product } from "../types";
import { money } from "./ui";

export function Price({ product }: { product: Pick<Product, "price" | "finalPrice" | "discount"> }) {
  return (
    <span>
      <strong>{money(product.finalPrice)}</strong>
      {product.discount > 0 && (
        <>
          {" "}
          <s className="muted">{money(product.price)}</s> <span className="badge">-{product.discount}%</span>
        </>
      )}
    </span>
  );
}

// Add-to-cart and wishlist actions shared by the product card and the product page
export function useProductActions(session: Session | null) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);

  async function run(action: () => Promise<unknown>, done: string) {
    if (!session) {
      window.location.hash = "#/login";
      return;
    }
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await action();
      setMessage(done);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    message,
    error,
    // Sets the quantity in the cart (adds the product if it is not there yet)
    setInCart: (productId: string, quantity: number) =>
      run(async () => {
        await cart.set(productId, quantity);
        signalCartChange();
      }, "Cart updated"),
    toggleWishlist: (productId: string, on: boolean) =>
      run(async () => {
        await (on ? products.wishlistAdd(productId) : products.wishlistRemove(productId));
        signalWishlistChange();
      }, on ? "Added to wishlist" : "Removed from wishlist"),
  };
}

export function WishlistButton({
  productId,
  wishlisted,
  actions,
}: {
  productId: string;
  wishlisted: boolean;
  actions: ReturnType<typeof useProductActions>;
}) {
  return (
    <button
      type="button"
      className="secondary"
      title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wishlisted}
      disabled={actions.busy}
      onClick={() => void actions.toggleWishlist(productId, !wishlisted)}
    >
      {wishlisted ? "♥" : "♡"}
    </button>
  );
}

export function ProductCard({
  product,
  session,
  wishlisted,
}: {
  product: Product;
  session: Session | null;
  wishlisted: boolean;
}) {
  const actions = useProductActions(session);
  return (
    <article className="card product">
      <a href={`#/product/${product._id}`} className="product-link">
        {product.mainImage?.secure_url ? (
          <img src={product.mainImage.secure_url} alt="" loading="lazy" />
        ) : (
          <div className="img-placeholder" />
        )}
        <h2>{product.name}</h2>
      </a>
      <p>
        <Price product={product} />
      </p>
      <p className="muted">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
      <div className="row">
        <button
          type="button"
          disabled={actions.busy || product.stock < 1}
          onClick={() => void actions.setInCart(product._id, 1)}
        >
          Add to cart
        </button>
        <WishlistButton productId={product._id} wishlisted={wishlisted} actions={actions} />
      </div>
      {actions.message && <p className="success small">{actions.message}</p>}
      {actions.error ? <p className="error small">{(actions.error as Error).message}</p> : null}
    </article>
  );
}
