import { demoApi } from "./demoApi";

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export async function api(path, options = {}) {
  if (isDemoMode) return demoApi(path, options);

  const init = { credentials: "include", ...options };
  const isForm = init.body instanceof FormData;
  init.headers = { ...(init.headers || {}) };
  if (init.body && !isForm && typeof init.body !== "string") {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(init.body);
  }
  const res = await fetch(path, init);
  const type = res.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(type.includes("application/json") ? (data?.error || `Request failed (${res.status})`) : "The server could not complete the request. Please try again.");
  return data;
}

export const peso = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value || 0));
export const dateLabel = (value) => value ? new Date(`${value}${value.length === 10 ? "T00:00:00" : ""}`).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—";
