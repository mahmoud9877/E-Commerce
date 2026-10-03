import { useState, type FormEvent } from "react";
import { ErrorText, Loading, money, Notice, Pager } from "../../components/ui";
import { brands, categories, products, subcategories } from "../../endpoints";
import { useAsync } from "../../lib/useAsync";
import { SIZES, type Product } from "../../types";

function ProductForm({ product, onDone }: { product?: Product; onDone: (message: string) => void }) {
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const categoryList = useAsync(() => categories.list(), []);
  const brandList = useAsync(() => brands.list(), []);
  const subcategoryList = useAsync(
    () => (categoryId ? subcategories.list(categoryId) : Promise.resolve(null)),
    [categoryId]
  );
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const source = new FormData(event.currentTarget);
    const data = new FormData();
    for (const key of ["name", "description", "price", "discount", "stock", "categoryId", "subcategoryId", "brandId"]) {
      const value = String(source.get(key) ?? "").trim();
      if (value) data.append(key, value);
    }
    // Repeated fields become arrays on the backend (size=s&size=m)
    for (const size of source.getAll("size")) data.append("size", String(size));
    for (const color of String(source.get("colors") ?? "").split(",").map((c) => c.trim()).filter(Boolean)) {
      data.append("colors", color);
    }
    const mainImage = source.get("mainImage");
    if (mainImage instanceof File && mainImage.size) data.append("mainImage", mainImage);
    for (const file of source.getAll("subImages")) {
      if (file instanceof File && file.size) data.append("subImages", file);
    }

    setBusy(true);
    setError(null);
    try {
      if (product) await products.update(product._id, data);
      else await products.create(data);
      onDone(product ? "Product updated" : "Product created");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <h2>{product ? `Edit ${product.name}` : "New product"}</h2>
      <label>
        Name
        <input name="name" minLength={2} maxLength={150} required={!product} defaultValue={product?.name} />
      </label>
      <label>
        Description
        <textarea name="description" maxLength={15000} defaultValue={product?.description} />
      </label>
      <div className="row wrap">
        <label>
          Price
          <input name="price" type="number" min="0.01" step="0.01" required={!product} defaultValue={product?.price} />
        </label>
        <label>
          Discount %
          <input name="discount" type="number" min="0" max="100" step="any" defaultValue={product?.discount ?? 0} />
        </label>
        <label>
          Stock
          <input name="stock" type="number" min="0" step="1" required={!product} defaultValue={product?.stock} />
        </label>
      </div>
      <div className="row wrap">
        <label>
          Category
          <select
            name="categoryId"
            required={!product}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Choose...</option>
            {categoryList.data?.categoryList.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subcategory
          <select
            name="subcategoryId"
            required={!product || categoryId !== product.categoryId}
            defaultValue={product?.subcategoryId}
            key={categoryId}
          >
            <option value="">Choose...</option>
            {subcategoryList.data?.subcategoryList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Brand
          <select name="brandId" required={!product} defaultValue={product?.brandId}>
            <option value="">Choose...</option>
            {brandList.data?.brandList.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="row">
        <legend>Sizes</legend>
        {SIZES.map((s) => (
          <label key={s} className="inline">
            <input type="checkbox" name="size" value={s} defaultChecked={product?.size?.includes(s)} /> {s.toUpperCase()}
          </label>
        ))}
      </fieldset>
      <label>
        Colors (comma-separated)
        <input name="colors" placeholder="red, blue" defaultValue={product?.colors?.join(", ")} />
      </label>
      <label>
        Main image {product ? "(leave empty to keep the current one)" : ""}
        <input name="mainImage" type="file" accept="image/jpeg,image/png,image/gif" required={!product} />
      </label>
      <label>
        Extra images (up to 5{product ? "; replaces the current ones" : ""})
        <input name="subImages" type="file" accept="image/jpeg,image/png,image/gif" multiple />
      </label>
      <p className="muted small">Images: JPEG, PNG or GIF, 5 MB each.</p>
      <ErrorText error={error} />
      <div className="row">
        <button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button type="button" className="secondary" onClick={() => onDone("")}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function AdminProducts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const list = useAsync(() => products.list({ page, size: 20, search, sort: "-createdAt" }), [page, search]);

  if (editing) {
    return (
      <ProductForm
        product={editing === "new" ? undefined : editing}
        onDone={(message) => {
          setEditing(null);
          setNotice(message);
          if (message) list.reload();
        }}
      />
    );
  }

  return (
    <section className="stack">
      <div className="row between">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(String(new FormData(e.currentTarget).get("search")));
            setPage(1);
          }}
        >
          <input name="search" placeholder="Search products" defaultValue={search} />
          <button type="submit" className="secondary">
            Search
          </button>
        </form>
        <button type="button" onClick={() => setEditing("new")}>
          + New product
        </button>
      </div>
      <Notice>{notice}</Notice>
      <ErrorText error={list.error} />
      <Loading when={list.loading && !list.data} />
      <table className="table">
        <thead>
          <tr>
            <th />
            <th>Name</th>
            <th className="num">Price</th>
            <th className="num">Final</th>
            <th className="num">Stock</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.data?.productList.map((p) => (
            <tr key={p._id}>
              <td>{p.mainImage && <img className="thumb-sm" src={p.mainImage.secure_url} alt="" />}</td>
              <td>
                <a href={`#/product/${p._id}`}>{p.name}</a>
              </td>
              <td className="num">{money(p.price)}</td>
              <td className="num">{money(p.finalPrice)}</td>
              <td className="num">{p.stock}</td>
              <td>
                <button type="button" className="link" onClick={() => setEditing(p)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager pagination={list.data?.pagination} onPage={setPage} />
      <p className="muted small">The API has no product delete endpoint; set stock to 0 to stop sales.</p>
    </section>
  );
}
