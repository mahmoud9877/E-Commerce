import { useState } from "react";
import { ErrorText, Loading, Notice } from "../../components/ui";
import { categories, subcategories } from "../../endpoints";
import { useAsync } from "../../lib/useAsync";
import type { Category, Subcategory } from "../../types";
import { EntityForm, type FieldSpec } from "./EntityForm";

const FIELDS: FieldSpec[] = [
  { name: "name", label: "Name", required: true, minLength: 3, maxLength: 30 },
  // The category/subcategory models have no description field, so none is offered
  { name: "image", label: "Image", type: "image", required: true },
];

function Subcategories({ category }: { category: Category }) {
  const list = useAsync(() => subcategories.list(category._id), [category._id]);
  const [editing, setEditing] = useState<Subcategory | "new" | null>(null);
  const [notice, setNotice] = useState("");

  if (editing) {
    const current = editing === "new" ? undefined : editing;
    return (
      <EntityForm
        title={current ? `Edit subcategory ${current.name}` : `New subcategory in ${category.name}`}
        fields={FIELDS}
        initial={current}
        editing={!!current}
        onCancel={() => setEditing(null)}
        onSubmit={async (data) => {
          if (current) await subcategories.update(category._id, current._id, data);
          else await subcategories.create(category._id, data);
          setEditing(null);
          setNotice(current ? "Subcategory updated" : "Subcategory created");
          list.reload();
        }}
      />
    );
  }

  return (
    <div className="stack sub-list">
      <div className="row between">
        <strong>Subcategories of {category.name}</strong>
        <button type="button" className="secondary" onClick={() => setEditing("new")}>
          + New subcategory
        </button>
      </div>
      <Notice>{notice}</Notice>
      <ErrorText error={list.error} />
      <Loading when={list.loading && !list.data} />
      {list.data?.subcategoryList.length === 0 && <p className="muted">None yet.</p>}
      {list.data?.subcategoryList.map((s) => (
        <div key={s._id} className="row between entity">
          <span className="row">
            {s.image && <img className="thumb-sm" src={s.image.secure_url} alt="" />} {s.name}
          </span>
          <button type="button" className="link" onClick={() => setEditing(s)}>
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}

export function AdminCategories() {
  const list = useAsync(() => categories.list(), []);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);

  if (editing) {
    const current = editing === "new" ? undefined : editing;
    return (
      <EntityForm
        title={current ? `Edit category ${current.name}` : "New category"}
        fields={FIELDS}
        initial={current}
        editing={!!current}
        onCancel={() => setEditing(null)}
        onSubmit={async (data) => {
          if (current) await categories.update(current._id, data);
          else await categories.create(data);
          setEditing(null);
          setNotice(current ? "Category updated" : "Category created");
          list.reload();
        }}
      />
    );
  }

  async function remove(category: Category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setError(null);
    try {
      await categories.remove(category._id);
      setNotice("Category deleted");
      list.reload();
    } catch (err) {
      // 409 while it still has subcategories or products
      setError(err);
    }
  }

  return (
    <section className="stack">
      <div className="row between">
        <h2>Categories</h2>
        <button type="button" onClick={() => setEditing("new")}>
          + New category
        </button>
      </div>
      <Notice>{notice}</Notice>
      <ErrorText error={list.error || error} />
      <Loading when={list.loading && !list.data} />
      {list.data?.categoryList.map((c) => (
        <div key={c._id} className="card stack">
          <div className="row between">
            <span className="row">
              {c.image && <img className="thumb-sm" src={c.image.secure_url} alt="" />}
              <strong>{c.name}</strong>
            </span>
            <span className="row">
              <button type="button" className="link" onClick={() => setOpen(open === c._id ? null : c._id)}>
                {open === c._id ? "Hide subcategories" : "Subcategories"}
              </button>
              <button type="button" className="link" onClick={() => setEditing(c)}>
                Edit
              </button>
              <button type="button" className="link danger" onClick={() => void remove(c)}>
                Delete
              </button>
            </span>
          </div>
          {open === c._id && <Subcategories category={c} />}
        </div>
      ))}
    </section>
  );
}
