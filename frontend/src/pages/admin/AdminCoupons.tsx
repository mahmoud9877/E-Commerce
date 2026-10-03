import { useState } from "react";
import { date, ErrorText, Loading, Notice, Pager } from "../../components/ui";
import { coupons } from "../../endpoints";
import { useAsync } from "../../lib/useAsync";
import type { Coupon } from "../../types";
import { EntityForm, type FieldSpec } from "./EntityForm";

const FIELDS: FieldSpec[] = [
  { name: "name", label: "Code", required: true, minLength: 2, maxLength: 25 },
  { name: "amount", label: "Discount %", type: "number", required: true, min: 1, max: 100 },
  { name: "expire", label: "Expires on", type: "date", required: true },
  { name: "image", label: "Image (optional)", type: "image" },
];

export function AdminCoupons() {
  const [page, setPage] = useState(1);
  const list = useAsync(() => coupons.list({ page, size: 20 }), [page]);
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [notice, setNotice] = useState("");

  if (editing) {
    const current = editing === "new" ? undefined : editing;
    return (
      <EntityForm
        title={current ? `Edit coupon ${current.name}` : "New coupon"}
        fields={FIELDS}
        initial={current && { name: current.name, amount: current.amount, expire: current.expire.slice(0, 10) }}
        editing={!!current}
        onCancel={() => setEditing(null)}
        onSubmit={async (data) => {
          if (current) await coupons.update(current._id, data);
          else await coupons.create(data);
          setEditing(null);
          setNotice(current ? "Coupon updated" : "Coupon created");
          list.reload();
        }}
      />
    );
  }

  return (
    <section className="stack">
      <div className="row between">
        <h2>Coupons</h2>
        <button type="button" onClick={() => setEditing("new")}>
          + New coupon
        </button>
      </div>
      <p className="muted small">Each customer can use a coupon once; a cancelled order gives the use back.</p>
      <Notice>{notice}</Notice>
      <ErrorText error={list.error} />
      <Loading when={list.loading && !list.data} />
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th className="num">Discount</th>
            <th>Expires</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.data?.couponList.map((c) => (
            <tr key={c._id} className={new Date(c.expire) < new Date() ? "muted" : ""}>
              <td>
                <strong>{c.name}</strong>
              </td>
              <td className="num">{c.amount}%</td>
              <td>{date(c.expire)}</td>
              <td>
                <button type="button" className="link" onClick={() => setEditing(c)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager pagination={list.data?.pagination} onPage={setPage} />
    </section>
  );
}
