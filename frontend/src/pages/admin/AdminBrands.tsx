import { useState } from "react";
import { ErrorText, Loading, Notice } from "../../components/ui";
import { brands } from "../../endpoints";
import { useAsync } from "../../lib/useAsync";
import type { Brand } from "../../types";
import { EntityForm, type FieldSpec } from "./EntityForm";

const FIELDS: FieldSpec[] = [
  { name: "name", label: "Name", required: true, minLength: 2, maxLength: 25 },
  // The Brand model requires an image, even though the API validation marks it optional
  { name: "image", label: "Logo", type: "image", required: true },
];

export function AdminBrands() {
  const list = useAsync(() => brands.list(), []);
  const [editing, setEditing] = useState<Brand | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);

  if (editing) {
    const current = editing === "new" ? undefined : editing;
    return (
      <EntityForm
        title={current ? `Edit brand ${current.name}` : "New brand"}
        fields={FIELDS}
        initial={current}
        editing={!!current}
        onCancel={() => setEditing(null)}
        onSubmit={async (data) => {
          if (current) await brands.update(current._id, data);
          else await brands.create(data);
          setEditing(null);
          setNotice(current ? "Brand updated" : "Brand created");
          list.reload();
        }}
      />
    );
  }

  async function remove(brand: Brand) {
    if (!window.confirm(`Delete brand "${brand.name}"?`)) return;
    setError(null);
    try {
      await brands.remove(brand._id);
      setNotice("Brand deleted");
      list.reload();
    } catch (err) {
      // 409 while products still use it
      setError(err);
    }
  }

  return (
    <section className="stack">
      <div className="row between">
        <h2>Brands</h2>
        <button type="button" onClick={() => setEditing("new")}>
          + New brand
        </button>
      </div>
      <Notice>{notice}</Notice>
      <ErrorText error={list.error || error} />
      <Loading when={list.loading && !list.data} />
      {list.data?.brandList.length === 0 && <p className="muted">No brands yet.</p>}
      {list.data?.brandList.map((b) => (
        <div key={b._id} className="card row between">
          <span className="row">
            {b.image && <img className="thumb-sm" src={b.image.secure_url} alt="" />}
            <strong>{b.name}</strong>
          </span>
          <span className="row">
            <button type="button" className="link" onClick={() => setEditing(b)}>
              Edit
            </button>
            <button type="button" className="link danger" onClick={() => void remove(b)}>
              Delete
            </button>
          </span>
        </div>
      ))}
    </section>
  );
}
