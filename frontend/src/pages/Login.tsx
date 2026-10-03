import { useState, type FormEvent } from "react";
import { login } from "../api";
import { ErrorText } from "../components/ui";

export function Login() {
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const session = await login(String(form.get("email")), String(form.get("password")));
      window.location.hash = session.isAdmin ? "#/admin" : "#/";
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <h1>Log in</h1>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <ErrorText error={error} />
      <button type="submit" disabled={busy}>
        {busy ? "Logging in..." : "Log in"}
      </button>
      <p className="muted">
        <a href="#/forgot">Forgot your password?</a>
        <br />
        No account? <a href="#/signup">Sign up</a>
      </p>
    </form>
  );
}
