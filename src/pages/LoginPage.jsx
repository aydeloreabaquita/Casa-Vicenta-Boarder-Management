import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import PasswordField from "../components/PasswordField";

export default function LoginPage({ onNavigate, onAuthenticated }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(e.currentTarget);

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: {
          identifier: form.get("identifier"),
          password: form.get("password")
        }
      });

      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset(e) {
    e.preventDefault();
    setForgotBusy(true);
    setForgotMessage("");
    setForgotError("");

    const form = new FormData(e.currentTarget);

    try {
      const data = await api("/api/auth/forgot-password", {
        method: "POST",
        body: {
          identifier: form.get("identifier")
        }
      });

      setForgotMessage(data.message);
      e.currentTarget.reset();
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotBusy(false);
    }
  }

  return <div className="center-page">
    <div className="login-card card">
      <form onSubmit={submit}>
        <div className="brand-mark"><ShieldCheck /></div>
        <h1>Casa Vicenta Portal Login</h1>
        <p className="muted">Use your email address or phone number and password.</p>

        {error && <div className="notice error">{error}</div>}

        <label>
          Email or Phone
          <input
            name="identifier"
            required
            placeholder="email@example.com or 09XXXXXXXXX"
          />
        </label>

        <PasswordField
          label="Password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />

        <button className="btn primary full" disabled={busy}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div className="actions" style={{justifyContent:"space-between", marginTop:"12px"}}>
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            setForgotOpen(v => !v);
            setForgotMessage("");
            setForgotError("");
          }}
        >
          Forgot password?
        </button>

        <button
          type="button"
          className="text-btn"
          onClick={() => onNavigate("home")}
        >
          Back to website
        </button>
      </div>

      {forgotOpen && <form onSubmit={requestPasswordReset} style={{marginTop:"18px"}}>
        <hr style={{border:0, borderTop:"1px solid var(--line)", margin:"0 0 18px"}} />
        <h3>Request a password reset</h3>
        <p className="muted tiny">
          Enter the email or phone number used for your boarder account. The request will be sent to the admin for approval.
        </p>

        {forgotMessage && <div className="notice success-note">{forgotMessage}</div>}
        {forgotError && <div className="notice error">{forgotError}</div>}

        <label>
          Email or Phone
          <input
            name="identifier"
            required
            placeholder="email@example.com or 09XXXXXXXXX"
          />
        </label>

        <button className="btn secondary full" disabled={forgotBusy}>
          {forgotBusy ? "Sending request…" : "Request Password Reset"}
        </button>
      </form>}
    </div>
  </div>;
}
