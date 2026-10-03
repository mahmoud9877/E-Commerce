import { useState, type FormEvent } from "react";
import { ErrorText, Notice } from "../components/ui";
import { auth } from "../endpoints";

export const PASSWORD_RULE = "(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}";
export const PASSWORD_HINT = "At least 8 characters, with an uppercase letter, a lowercase letter and a number";

// Step 1 emails a 6-digit code; step 2 sets a new password with it (which ends every session)
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, next: typeof step) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setStep(next);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function onReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(
      () =>
        auth.forgetPassword({
          email,
          code: String(form.get("code")),
          password: String(form.get("password")),
          cPassword: String(form.get("cPassword")),
        }),
      "done"
    );
  }

  if (step === "done") {
    return (
      <section className="card form">
        <h1>Password changed</h1>
        <p>You were logged out everywhere. Log in with your new password.</p>
        <a href="#/login">Go to log in</a>
      </section>
    );
  }

  return step === "email" ? (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => auth.sendCode(email), "code");
      }}
    >
      <h1>Forgot password</h1>
      <p className="muted">We will email you a 6-digit code.</p>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <ErrorText error={error} />
      <button type="submit" disabled={busy}>
        Send code
      </button>
    </form>
  ) : (
    <form className="card form" onSubmit={onReset}>
      <h1>Reset password</h1>
      <Notice>A code was sent to {email}. It expires in 10 minutes.</Notice>
      <label>
        Code
        <input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required />
      </label>
      <label>
        New password
        <input name="password" type="password" pattern={PASSWORD_RULE} title={PASSWORD_HINT} autoComplete="new-password" required />
      </label>
      <label>
        Confirm new password
        <input name="cPassword" type="password" autoComplete="new-password" required />
      </label>
      <p className="muted small">{PASSWORD_HINT}</p>
      <ErrorText error={error} />
      <button type="submit" disabled={busy}>
        Change password
      </button>
      <button type="button" className="link" onClick={() => void run(() => auth.sendCode(email), "code")}>
        Send a new code
      </button>
    </form>
  );
}
