import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({ label, name, ...props }) {
  const [visible, setVisible] = useState(false);
  return <label>{label}<span className="password-field">
    <input name={name} type={visible ? "text" : "password"} {...props} />
    <button type="button" className="password-toggle" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(value => !value)}>
      {visible ? <EyeOff size={19} /> : <Eye size={19} />}
    </button>
  </span></label>;
}
