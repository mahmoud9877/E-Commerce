import { useState } from "react";
import { date, ErrorText, Loading, Pager } from "../../components/ui";
import { auth } from "../../endpoints";
import { useAsync } from "../../lib/useAsync";

export function AdminUsers() {
  const [page, setPage] = useState(1);
  const list = useAsync(() => auth.users({ page, size: 20 }), [page]);

  return (
    <section className="stack">
      <h2>Users</h2>
      <ErrorText error={list.error} />
      <Loading when={list.loading && !list.data} />
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Email confirmed</th>
            <th>Status</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {list.data?.userList.map((u) => (
            <tr key={u._id}>
              <td>{u.userName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.confirmEmail ? "Yes" : "No"}</td>
              <td>{u.status}</td>
              <td>{date(u.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager pagination={list.data?.pagination} onPage={setPage} />
    </section>
  );
}
