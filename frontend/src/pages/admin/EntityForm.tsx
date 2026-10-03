import { useState, type FormEvent } from "react";
import { ErrorText, formData } from "../../components/ui";

export interface FieldSpec {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "image";
  // Required when creating; editing only sends the fields that were filled in
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

// Create/edit form for the simple admin entities (multipart, so an image can be attached)
export function EntityForm({
  title,
  fields,
  initial = {},
  editing,
  onSubmit,
  onCancel,
}: {
  title: string;
  fields: FieldSpec[];
  // Existing values when editing; only strings and numbers are used
  initial?: object;
  editing: boolean;
  onSubmit: (data: FormData) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = formData(event.currentTarget);
      // Edits send only what changed: the backend rejects e.g. "updating" a coupon to its own name
      if (editing) {
        for (const f of fields) {
          const before = (initial as Record<string, unknown>)[f.name];
          if (f.type !== "image" && before !== undefined && String(before) === data.get(f.name)) data.delete(f.name);
        }
      }
      await onSubmit(data);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>{title}</h2>
      {fields.map((f) => {
        const required = !editing && f.required;
        const value = (initial as Record<string, unknown>)[f.name];
        const defaultValue = typeof value === "string" || typeof value === "number" ? value : undefined;
        const common = { name: f.name, required, defaultValue };
        return (
          <label key={f.name}>
            {f.label}
            {f.type === "image" && editing && " (leave empty to keep the current one)"}
            {f.type === "textarea" ? (
              <textarea {...common} minLength={f.minLength} maxLength={f.maxLength} />
            ) : f.type === "image" ? (
              <input name={f.name} type="file" accept="image/jpeg,image/png,image/gif" required={required} />
            ) : (
              <input
                {...common}
                type={f.type ?? "text"}
                min={f.min}
                max={f.max}
                minLength={f.minLength}
                maxLength={f.maxLength}
                step={f.type === "number" ? "any" : undefined}
              />
            )}
          </label>
        );
      })}
      <ErrorText error={error} />
      <div className="row">
        <button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
