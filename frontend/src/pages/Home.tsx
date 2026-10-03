import { useEffect, useState, type FormEvent } from "react";
import { api, type Session } from "../api";
import { ProductCard } from "../components/ProductCard";
import { ErrorText, Loading, Pager } from "../components/ui";
import { brands, categories, products, subcategories } from "../endpoints";
import { navigate, type Route } from "../lib/router";
import { useAsync } from "../lib/useAsync";
import { useWishlistIds } from "../lib/wishlist";
import { SIZES } from "../types";

const SORTS = [
  { value: "-createdAt", label: "Newest" },
  { value: "finalPrice", label: "Price: low to high" },
  { value: "-finalPrice", label: "Price: high to low" },
  { value: "-discount", label: "Biggest discount" },
  { value: "name", label: "Name" },
];

// Filters live in the URL (#/?search=...&categoryId=...) so they survive reloads and can be shared
const FILTER_KEYS = ["search", "categoryId", "subcategoryId", "brandId", "min", "max", "size", "sort", "page"] as const;

function ApiStatus() {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");
  useEffect(() => {
    api<{ status: string }>("/health")
      .then((res) => setStatus(res.status === "ok" ? "ok" : "down"))
      .catch(() => setStatus("down"));
  }, []);
  if (status === "ok") return null;
  return (
    <section className="card status">
      <span className={`dot ${status}`} aria-hidden />
      API {status === "checking" ? "checking..." : "unreachable"}
    </section>
  );
}

export function Home({ route, session }: { route: Route; session: Session | null }) {
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, route.query.get(k) ?? ""])) as Record<
    (typeof FILTER_KEYS)[number],
    string
  >;
  const wishlist = useWishlistIds(session);

  const categoryList = useAsync(() => categories.list(), []);
  const brandList = useAsync(() => brands.list(), []);
  const subcategoryList = useAsync(
    () => (filters.categoryId ? subcategories.list(filters.categoryId) : Promise.resolve(null)),
    [filters.categoryId]
  );
  const productPage = useAsync(
    () =>
      products.list({
        search: filters.search,
        categoryId: filters.categoryId,
        subcategoryId: filters.subcategoryId,
        brandId: filters.brandId,
        "finalPrice[gte]": filters.min,
        "finalPrice[lte]": filters.max,
        // A size letter filters by product size; without one, a number sets the page size
        size: filters.size || 12,
        sort: filters.sort || "-createdAt",
        page: filters.page || 1,
      }),
    [route.query.toString()]
  );

  function update(changes: Partial<typeof filters>) {
    // Any filter change starts again from page 1
    navigate("/", { ...filters, page: undefined, ...changes });
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update({ search: String(form.get("search")), min: String(form.get("min")), max: String(form.get("max")) });
  }

  return (
    <>
      <ApiStatus />
      <div className="shop">
        <aside className="card filters">
          <form onSubmit={onSearch} className="stack">
            <label>
              Search
              <input name="search" defaultValue={filters.search} placeholder="Name or description" />
            </label>
            <div className="row">
              <label>
                Min price
                <input name="min" type="number" min="0" step="any" defaultValue={filters.min} />
              </label>
              <label>
                Max price
                <input name="max" type="number" min="0" step="any" defaultValue={filters.max} />
              </label>
            </div>
            <button type="submit">Apply</button>
          </form>

          <label>
            Category
            <select
              value={filters.categoryId}
              onChange={(e) => update({ categoryId: e.target.value, subcategoryId: "" })}
            >
              <option value="">All</option>
              {categoryList.data?.categoryList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {filters.categoryId && (
            <label>
              Subcategory
              <select value={filters.subcategoryId} onChange={(e) => update({ subcategoryId: e.target.value })}>
                <option value="">All</option>
                {subcategoryList.data?.subcategoryList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Brand
            <select value={filters.brandId} onChange={(e) => update({ brandId: e.target.value })}>
              <option value="">All</option>
              {brandList.data?.brandList.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Size
            <select value={filters.size} onChange={(e) => update({ size: e.target.value })}>
              <option value="">Any</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select value={filters.sort || "-createdAt"} onChange={(e) => update({ sort: e.target.value })}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary" onClick={() => navigate("/")}>
            Clear filters
          </button>
        </aside>

        <section>
          <h1>Products</h1>
          <ErrorText error={productPage.error} />
          <Loading when={productPage.loading && !productPage.data} />
          {productPage.data?.productList.length === 0 && <p className="muted">No products match.</p>}
          <div className="grid">
            {productPage.data?.productList.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                session={session}
                wishlisted={wishlist.has(product._id)}
              />
            ))}
          </div>
          <Pager pagination={productPage.data?.pagination} onPage={(page) => navigate("/", { ...filters, page })} />
        </section>
      </div>
    </>
  );
}
