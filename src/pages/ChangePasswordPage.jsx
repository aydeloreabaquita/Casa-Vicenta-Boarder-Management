import { useState } from "react";
import { KeyRound } from "lucide-react";
import { api } from "../lib/api";
import PasswordField from "../components/PasswordField";

export default function ChangePasswordPage({ onChanged }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const newPassword = form.get("newPassword");

    if (newPassword !== form.get("confirmPassword")) {
      return setMessage("New passwords do not match.");
    }

    setBusy(true);
    setMessage("");

    try {
      const data = await api("/api/auth/change-password", {
        method: "POST",
        body: {
          currentPassword: form.get("currentPassword"),
          newPassword
        }
      });

      setMessage(data.message);
      onChanged?.(data.user);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="center-page">
    <form className="login-card card" onSubmit={submit}>
      <div className="brand-mark">
        <KeyRound />
      </div>

      <h1>Change temporary password</h1>

      <p className="muted">
        Casa Vicenta requires a new password before you continue.
      </p>

      {message && <div className="notice">{message}</div>}

      <PasswordField
        label="Current temporary password"
        name="currentPassword"
        required
        autoComplete="current-password"
      />

      <PasswordField
        label="New password"
        name="newPassword"
        minLength="10"
        required
        autoComplete="new-password"
      />

      <PasswordField
        label="Confirm new password"
        name="confirmPassword"
        minLength="10"
        required
        autoComplete="new-password"
      />

      <button className="btn primary full" disabled={busy}>
        {busy ? "Saving…" : "Change Password"}
      </button>
    </form>
  </div>;
}