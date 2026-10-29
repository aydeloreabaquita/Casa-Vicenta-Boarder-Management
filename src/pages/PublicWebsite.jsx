import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Mail, Phone, ShieldCheck, Snowflake, Wifi } from "lucide-react";
import { api, peso } from "../lib/api";

export default function PublicWebsite({ onNavigate, user, onProfile }) {
  const [rooms, setRooms] = useState([]);
  const [contact, setContact] = useState({});
  useEffect(() => {
    api("/api/public/rooms").then(d => setRooms(d.rooms || [])).catch(() => setRooms([]));
    api("/api/public/contact").then(setContact).catch(() => {});
  }, []);
  const roomImages = [
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=85"
  ];
  return <div className="public-site">
    <section className="hero"><div className="hero-content"><div className="pill">Comfortable • Secure • Convenient</div><h1>Welcome to Casa<br/>Vicenta.</h1><p>See available rooms, submit your application, and receive your viewing schedule after admin confirmation.</p><div className="actions"><button className="btn primary" onClick={() => onNavigate("apply")}>Apply Now</button><button className="btn secondary" onClick={() => onNavigate("applicant-request")}>Applicant Contact / Reschedule</button>{user?<button className="btn secondary" onClick={onProfile}>Profile</button>:<button className="btn secondary" onClick={() => onNavigate("login")}>Boarder / Admin Login</button>}</div></div>
      <div className="hero-card"><h3>Casa Vicenta Availability</h3><div className="big-number">{rooms.length}</div><p>rooms currently available</p></div>
    </section>
    <section className="section"><div className="section-head"><div><div className="eyebrow">Vacant Rooms</div><h2>Available now</h2></div></div><div className="grid cards-3">
      {rooms.length === 0 && <div className="card"><h3>No rooms listed right now</h3><p className="muted">Please check again or contact Casa Vicenta.</p></div>}
      {rooms.map((r,index) => <div className="card room-card" key={r.id}><div className="room-copy"><div className="badge success">Available</div><h3>Room {r.roomNumber}</h3><p>{r.floor === 1 ? "First" : "Second"} Floor</p><div className="room-features"><span><Wifi size={12}/> Wi-Fi</span><span><Snowflake size={12}/> Air Conditioning</span><span><ShieldCheck size={12}/> 24/7 Security</span></div><div className="price">{peso(r.monthlyRate)} <span>/ month</span></div></div><img src={roomImages[index % roomImages.length]} alt={`Room ${r.roomNumber} interior`} loading="lazy"/><button className="btn primary full" onClick={() => onNavigate("apply")}>Apply for this room</button></div>)}
    </div></section>
    <section className="section soft"><div className="grid cards-3"><div className="mini-feature"><CheckCircle2/><div><strong>Simple application</strong><p>Submit details online.</p></div></div><div className="mini-feature"><CalendarDays/><div><strong>Scheduled viewing</strong><p>Admin confirms your visit.</p></div></div><div className="mini-feature"><Mail/><div><strong>Viewing updates</strong><p>Applicants can use the website to contact Casa Vicenta or request a new viewing schedule.</p></div></div></div></section>
    <section className="section contact-strip"><div><Phone size={18}/> {contact.landladyName || "Casa Vicenta"} {contact.landladyPhone ? `• ${contact.landladyPhone}` : ""} {contact.landladyEmail ? `• ${contact.landladyEmail}` : ""}</div></section>
  </div>;
}

