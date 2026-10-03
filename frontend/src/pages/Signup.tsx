import { useState, type FormEvent } from "react";
import { ErrorText } from "../components/ui";
import { auth } from "../endpoints";
import { PASSWORD_HINT, PASSWORD_RULE } from "./ForgotPassword";

export function Signup() {
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (key: string) => String(form.get(key));
    setBusy(true);
    setError(null);
    try {
      await auth.signup({
        userName: field("userName"),
        email: field("email"),
        password: field("password"),
        cPassword: field("cPassword"),
      });
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="card form">
        <h1>Check your inbox</h1>
        <p>We sent you a confirmation link. Confirm your email, then log in.</p>
        <p className="muted small">
          If the link has expired, use the "request a new link" button in the same email.
        </p>
        <a href="#/login">Go to log in</a>
      </section>
    );
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <h1>Sign up</h1>
      <label>
        Name
        <input name="userName" minLength={2} maxLength={25} autoComplete="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" pattern={PASSWORD_RULE} title={PASSWORD_HINT} autoComplete="new-password" required />
      </label>
      <label>
        Confirm password
        <input name="cPassword" type="password" autoComplete="new-password" required />
      </label>
      <p className="muted small">{PASSWORD_HINT}</p>
      <ErrorText error={error} />
      <button type="submit" disabled={busy}>
        {busy ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
