import { useEffect, useState } from "react";
import { Building2, CalendarDays, CheckCircle2, Mail, Phone } from "lucide-react";
import { api, peso } from "../lib/api";

export default function PublicWebsite({ onNavigate, user, onProfile }) {
  const [rooms, setRooms] = useState([]);
  const [contact, setContact] = useState({});
  useEffect(() => {
    api("/api/public/rooms").then(d => setRooms(d.rooms || [])).catch(() => setRooms([]));
    api("/api/public/contact").then(setContact).catch(() => {});
  }, []);
  return <div>
    <section className="hero"><div><div className="pill">Comfortable • Secure • Convenient</div><h1>Welcome to Casa Vicenta.</h1><p>See available rooms, submit your application, and receive your viewing schedule after admin confirmation.</p><div className="actions"><button className="btn primary" onClick={() => onNavigate("apply")}>Apply Now</button><button className="btn secondary" onClick={() => onNavigate("applicant-request")}>Applicant Contact / Reschedule</button>{user?<button className="btn secondary" onClick={onProfile}>Profile</button>:<button className="btn secondary" onClick={() => onNavigate("login")}>Boarder / Admin Login</button>}</div></div>
      <div className="hero-card"><Building2 size={44}/><h3>Casa Vicenta Availability</h3><div className="big-number">{rooms.length}</div><p>rooms currently available</p></div>
    </section>
    <section className="section"><div className="section-head"><div><div className="eyebrow">Vacant Rooms</div><h2>Available now</h2></div></div><div className="grid cards-3">
      {rooms.length === 0 && <div className="card"><h3>No rooms listed right now</h3><p className="muted">Please check again or contact Casa Vicenta.</p></div>}
      {rooms.map(r => <div className="card" key={r.id}><div className="badge success">Available</div><h3>Room {r.roomNumber}</h3><p>{r.floor === 1 ? "First" : "Second"} Floor</p><div className="price">{peso(r.monthlyRate)} <span>/ month</span></div><button className="btn primary full" onClick={() => onNavigate("apply")}>Apply for this room</button></div>)}
    </div></section>
    <section className="section soft"><div className="grid cards-3"><div className="mini-feature"><CheckCircle2/><div><strong>Simple application</strong><p>Submit details online.</p></div></div><div className="mini-feature"><CalendarDays/><div><strong>Scheduled viewing</strong><p>Admin confirms your visit.</p></div></div><div className="mini-feature"><Mail/><div><strong>Viewing updates</strong><p>Applicants can use the website to contact Casa Vicenta or request a new viewing schedule.</p></div></div></div></section>
    <section className="section contact-strip"><div><Phone size={18}/> {contact.landladyName || "Casa Vicenta"} {contact.landladyPhone ? `• ${contact.landladyPhone}` : ""} {contact.landladyEmail ? `• ${contact.landladyEmail}` : ""}</div></section>
  </div>;
}
