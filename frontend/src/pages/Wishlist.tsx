import type { Session } from "../api";
import { ProductCard } from "../components/ProductCard";
import { ErrorText, Loading } from "../components/ui";
import { products } from "../endpoints";
import { useWindowEvent } from "../lib/hooks";
import { useAsync } from "../lib/useAsync";

export function Wishlist({ session }: { session: Session }) {
  const list = useAsync(() => products.wishlist(), [session.user.id]);
  useWindowEvent(["wishlist-change"], list.reload);

  return (
    <section className="stack">
      <h1>Wishlist</h1>
      <ErrorText error={list.error} />
      <Loading when={list.loading && !list.data} />
      {list.data?.length === 0 && (
        <p className="muted">
          Nothing saved yet. Tap ♡ on a product to save it. <a href="#/">Browse products</a>
        </p>
      )}
      <div className="grid">
        {list.data?.map((product) => (
          <ProductCard key={product._id} product={product} session={session} wishlisted />
        ))}
      </div>
    </section>
  );
}
