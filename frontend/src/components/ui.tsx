import type { ReactNode } from "react";
import { ApiError } from "../api";
import type { Pagination } from "../types";

// Shows an error, including the backend's per-field validation messages
export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  if (error instanceof ApiError && error.fieldErrors.length) {
    return (
      <div className="error">
        {error.message}
        <ul>
          {error.fieldErrors.map((e) => (
            <li key={e.field + e.message}>{e.message}</li>
          ))}
        </ul>
      </div>
    );
  }
  return <p className="error">{error instanceof Error ? error.message : String(error)}</p>;
}

export function Notice({ children }: { children: ReactNode }) {
  return children ? <p className="success">{children}</p> : null;
}

export function Pager({ pagination, onPage }: { pagination?: Pagination; onPage: (page: number) => void }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <nav className="pager">
      <button type="button" disabled={!pagination.hasPrevPage} onClick={() => onPage(pagination.page - 1)}>
        Previous
      </button>
      <span className="muted">
        Page {pagination.page} of {pagination.totalPages} ({pagination.total})
      </span>
      <button type="button" disabled={!pagination.hasNextPage} onClick={() => onPage(pagination.page + 1)}>
        Next
      </button>
    </nav>
  );
}

export function Loading({ when }: { when: boolean }) {
  return when ? <p className="muted">Loading...</p> : null;
}

export const money = (value: number) => value.toFixed(2);

export const date = (value?: string | null) => (value ? new Date(value).toLocaleString() : "");

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

// Copies the non-empty fields of a form into FormData; empty file inputs and blank fields are
// left out, so an update only sends what the admin actually changed
export function formData(form: HTMLFormElement): FormData {
  const data = new FormData();
  for (const [key, value] of new FormData(form)) {
    if (value instanceof File ? value.size > 0 : value.trim() !== "") data.append(key, value);
  }
  return data;
}
