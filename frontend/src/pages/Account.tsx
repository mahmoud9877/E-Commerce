import { logout, type Session } from "../api";

export function Account({ session }: { session: Session }) {
  return (
    <section className="card form">
      <h1>My account</h1>
      <p>
        <strong>{session.user.userName}</strong>
        <br />
        <span className="muted">{session.user.email}</span>
        {session.isAdmin && (
          <>
            <br />
            <span className="badge">Admin</span>
          </>
        )}
      </p>
      <nav className="stack">
        <a href="#/orders">My orders</a>
        <a href="#/cart">Cart</a>
        <a href="#/wishlist">Wishlist</a>
        <a href="#/notifications">Notifications</a>
        {session.isAdmin && <a href="#/admin">Admin dashboard</a>}
        <a href="#/forgot">Change password</a>
      </nav>
      <button type="button" className="secondary" onClick={() => void logout()}>
        Log out
      </button>
    </section>
  );
}
