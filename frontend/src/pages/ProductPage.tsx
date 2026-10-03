import { useState, type FormEvent } from "react";
import type { Session } from "../api";
import { Price, useProductActions, WishlistButton } from "../components/ProductCard";
import { date, ErrorText, Loading, Notice, Pager } from "../components/ui";
import { brands, categories, products, reviews } from "../endpoints";
import { useAsync } from "../lib/useAsync";
import { useWishlistIds } from "../lib/wishlist";
import type { Review } from "../types";

const authorOf = (review: Review) => (typeof review.createBy === "object" ? review.createBy : null);

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5`}>
      {"★".repeat(Math.round(rating))}
      {"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

function ReviewForm({
  productId,
  existing,
  onSaved,
}: {
  productId: string;
  existing?: Review;
  onSaved: () => void;
}) {
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { comment: String(form.get("comment")), rating: Number(form.get("rating")) };
    setBusy(true);
    setError(null);
    try {
      if (existing) await reviews.update(productId, existing._id, body);
      else await reviews.create(productId, body);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <h3>{existing ? "Edit your review" : "Write a review"}</h3>
      <p className="muted small">You can review a product once it has been delivered to you.</p>
      <label>
        Rating
        <select name="rating" defaultValue={existing?.rating ?? 5}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Comment
        <textarea name="comment" maxLength={500} required defaultValue={existing?.comment} />
      </label>
      <ErrorText error={error} />
      <button type="submit" disabled={busy}>
        {existing ? "Save review" : "Post review"}
      </button>
    </form>
  );
}

function Reviews({ productId, session }: { productId: string; session: Session | null }) {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const list = useAsync(() => reviews.list(productId, { page, size: 10 }), [productId, page]);
  const mine = list.data?.reviewList.find((r) => authorOf(r)?._id === session?.user.id);

  return (
    <section className="stack">
      <h2>Reviews</h2>
      <ErrorText error={list.error} />
      <Loading when={list.loading && !list.data} />
      {list.data?.reviewList.length === 0 && <p className="muted">No reviews yet.</p>}
      {list.data?.reviewList.map((review) => (
        <article key={review._id} className="card review">
          <div className="row between">
            <strong>{authorOf(review)?.userName ?? "Customer"}</strong>
            <Stars rating={review.rating} />
          </div>
          <p>{review.comment}</p>
          <p className="muted small">{date(review.createdAt)}</p>
        </article>
      ))}
      <Pager pagination={list.data?.pagination} onPage={setPage} />

      {session && (!mine || editing) && (
        <ReviewForm
          productId={productId}
          existing={mine}
          onSaved={() => {
            setEditing(false);
            list.reload();
          }}
        />
      )}
      {session && mine && !editing && (
        <button type="button" className="secondary" onClick={() => setEditing(true)}>
          Edit my review
        </button>
      )}
      {!session && (
        <p className="muted">
          <a href="#/login">Log in</a> to review this product.
        </p>
      )}
    </section>
  );
}

export function ProductPage({ productId, session }: { productId: string; session: Session | null }) {
  const product = useAsync(() => products.get(productId), [productId]);
  const categoryList = useAsync(() => categories.list(), []);
  const brandList = useAsync(() => brands.list(), []);
  const wishlist = useWishlistIds(session);
  const actions = useProductActions(session);
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState<string>();

  if (product.loading && !product.data) return <Loading when />;
  if (product.error || !product.data) return <ErrorText error={product.error || "Product not found"} />;

  const p = product.data;
  const images = [p.mainImage, ...(p.subImages ?? [])].filter(Boolean).map((i) => i!.secure_url);
  const category = categoryList.data?.categoryList.find((c) => c._id === p.categoryId);
  const brand = brandList.data?.brandList.find((b) => b._id === p.brandId);

  return (
    <div className="stack">
      <a href="#/">← Back to products</a>
      <div className="product-page">
        <div className="gallery">
          {images.length ? <img src={image ?? images[0]} alt={p.name} /> : <div className="img-placeholder" />}
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((src) => (
                <button key={src} type="button" className="thumb" onClick={() => setImage(src)}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="stack">
          <h1>{p.name}</h1>
          <p className="muted">
            {[category?.name, brand?.name].filter(Boolean).join(" · ")}
          </p>
          <p className="price-lg">
            <Price product={p} />
          </p>
          {p.description && <p className="pre-wrap">{p.description}</p>}
          {!!p.size?.length && (
            <p>
              Sizes: {p.size.map((s) => <span key={s} className="chip">{s.toUpperCase()}</span>)}
            </p>
          )}
          {!!p.colors?.length && (
            <p>
              Colors: {p.colors.map((c) => <span key={c} className="chip">{c}</span>)}
            </p>
          )}
          <p className={p.stock > 0 ? "muted" : "error"}>{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</p>
          <div className="row">
            <input
              type="number"
              min={1}
              max={Math.max(1, p.stock)}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="qty"
              aria-label="Quantity"
            />
            <button
              type="button"
              disabled={actions.busy || p.stock < 1}
              onClick={() => void actions.setInCart(p._id, quantity)}
            >
              Add to cart
            </button>
            <WishlistButton productId={p._id} wishlisted={wishlist.has(p._id)} actions={actions} />
          </div>
          <Notice>{actions.message}</Notice>
          <ErrorText error={actions.error} />
        </div>
      </div>
      <Reviews productId={p._id} session={session} />
    </div>
  );
}
