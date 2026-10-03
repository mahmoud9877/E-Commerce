import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ensureRole, logout, type Session } from "./api";
import { cart, notifications } from "./endpoints";
import { useSession, useWindowEvent } from "./lib/hooks";
import { useRoute, type Route } from "./lib/router";
import { Account } from "./pages/Account";
import { Admin } from "./pages/admin/Admin";
import { CartPage } from "./pages/CartPage";
import { Checkout } from "./pages/Checkout";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Message } from "./pages/Message";
import { Notifications } from "./pages/Notifications";
import { Orders } from "./pages/Orders";
import { ProductPage } from "./pages/ProductPage";
import { Signup } from "./pages/Signup";
import { Wishlist } from "./pages/Wishlist";

const UNREAD_POLL_MS = 60_000;

// Cart item count and unread notification count for the header
function useCounters(session: Session | null) {
  const [cartCount, setCartCount] = useState(0);
  const [unread, setUnread] = useState(0);
  const loggedIn = !!session;

  const loadCart = useCallback(() => {
    if (!loggedIn) return setCartCount(0);
    cart
      .get()
      .then((c) => setCartCount(c?.products.reduce((sum, p) => sum + p.quantity, 0) ?? 0))
      .catch(() => setCartCount(0));
  }, [loggedIn]);

  const loadUnread = useCallback(() => {
    if (!loggedIn) return setUnread(0);
    notifications
      .list({ unread: "true", size: 1 })
      .then((res) => setUnread(res.unreadCount))
      .catch(() => setUnread(0));
  }, [loggedIn]);

  useEffect(loadCart, [loadCart]);
  useEffect(() => {
    loadUnread();
    const timer = setInterval(loadUnread, UNREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [loadUnread]);
  useWindowEvent(["cart-change"], loadCart);
  useWindowEvent(["notifications-change"], loadUnread);

  return { cartCount, unread };
}

function RequireLogin({ session, children }: { session: Session | null; children: (s: Session) => ReactNode }) {
  return session ? <>{children(session)}</> : <Login />;
}

function Page({ route, session }: { route: Route; session: Session | null }) {
  const [first, second] = route.segments;
  switch (first ?? "") {
    case "":
      return <Home route={route} session={session} />;
    case "product":
      return <ProductPage productId={second ?? ""} session={session} />;
    case "login":
      return <Login />;
    case "signup":
      return <Signup />;
    case "forgot":
      return <ForgotPassword />;
    case "cart":
      return <RequireLogin session={session}>{() => <CartPage />}</RequireLogin>;
    case "checkout":
      return <RequireLogin session={session}>{() => <Checkout />}</RequireLogin>;
    case "orders":
      return <RequireLogin session={session}>{() => <Orders route={route} />}</RequireLogin>;
    case "wishlist":
      return <RequireLogin session={session}>{(s) => <Wishlist session={s} />}</RequireLogin>;
    case "notifications":
      return <RequireLogin session={session}>{(s) => <Notifications session={s} />}</RequireLogin>;
    case "account":
      return <RequireLogin session={session}>{(s) => <Account session={s} />}</RequireLogin>;
    case "admin":
      return (
        <RequireLogin session={session}>
          {(s) =>
            s.isAdmin ? (
              <Admin route={route} />
            ) : (
              <Message title="Admins only">This area needs an admin account.</Message>
            )
          }
        </RequireLogin>
      );
    // Stripe returns here after a successful payment (success_url)
    case "order":
      return (
        <Message title="Payment received">
          Thank you, your order is confirmed. <a href="#/orders">View my orders</a>
        </Message>
      );
    // The backend redirects here when a confirmation link belongs to no account
    case "invalidEmail":
      return (
        <Message title="Account not found">
          That confirmation link does not belong to a registered account. Please sign up again.
        </Message>
      );
    default:
      return <Message title="Page not found">There is nothing at this address.</Message>;
  }
}

export function App() {
  const route = useRoute();
  const session = useSession();
  const { cartCount, unread } = useCounters(session);

  // Sessions saved before the role was known learn it once
  useEffect(() => {
    void ensureRole().catch(() => undefined);
  }, [session?.user.id]);

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          E-Commerce
        </a>
        <nav>
          <a href="#/">Shop</a>
          {session ? (
            <>
              <a href="#/wishlist">Wishlist</a>
              <a href="#/orders">Orders</a>
              <a href="#/notifications">
                Notifications{unread > 0 && <span className="count">{unread}</span>}
              </a>
              <a href="#/cart">
                Cart{cartCount > 0 && <span className="count">{cartCount}</span>}
              </a>
              {session.isAdmin && <a href="#/admin">Admin</a>}
              <a href="#/account">{session.user.userName}</a>
              <button type="button" className="link" onClick={() => void logout()}>
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="#/login">Log in</a>
              <a href="#/signup">Sign up</a>
            </>
          )}
        </nav>
      </header>
      <main>
        <Page route={route} session={session} />
      </main>
    </>
  );
}
