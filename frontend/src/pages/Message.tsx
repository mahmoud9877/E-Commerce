import type { ReactNode } from "react";

export function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card form">
      <h1>{title}</h1>
      <p>{children}</p>
      <a href="#/">Back to products</a>
    </section>
  );
}
