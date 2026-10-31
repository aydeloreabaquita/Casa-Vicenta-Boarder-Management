import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Download, ExternalLink, FileText, Mail, MessageCircle, ShieldCheck, Snowflake, Wifi } from "lucide-react";
import { api, peso } from "../lib/api";

export default function PublicWebsite({ onNavigate, user, onProfile }) {
  const [rooms, setRooms] = useState([]);
  const [contact, setContact] = useState({});
  const [contract, setContract] = useState(null);
  useEffect(() => {
    api("/api/public/rooms").then(d => setRooms(d.rooms || [])).catch(() => setRooms([]));
    api("/api/public/contact").then(setContact).catch(() => {});
    api("/api/public/contract").then(d => setContract(d.contract || null)).catch(() => setContract(null));
  }, []);
  const contractRules = String(contract?.content || "")
    .split(/\r?\n/)
    .map(line => line.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
  const requiredRules = [
    "No pets are allowed.",
    "Visitors staying at Casa Vicenta are subject to additional charges."
  ];
  const ruleSummary = [...contractRules.filter(rule => !requiredRules.includes(rule)).slice(0, 3), ...requiredRules];

  function downloadContract() {
    if (!contract?.content) return;
    const documentText = `${contract.title || "Casa Vicenta Contract"}\nVersion ${contract.version || "Current"}\n\n${contract.content}`;
    const url = URL.createObjectURL(new Blob([documentText], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Casa-Vicenta-Contract.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

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
    <section className="section rules-section">
      <div className="rules-panel">
        <div>
          <div className="eyebrow">Before You Apply</div>
          <h2>Rules & regulations at a glance</h2>
          <p className="muted">Review the current Casa Vicenta house rules before submitting your application.</p>
          {ruleSummary.length > 0 ? <ul className="rules-list">{ruleSummary.map((rule, index) => <li key={index}><CheckCircle2 size={18}/><span>{rule}</span></li>)}</ul> : <p className="muted">The current contract will be available here once it has been published.</p>}
        </div>
        <div className="contract-download card">
          <FileText size={34}/>
          <h3>{contract?.title || "Casa Vicenta Contract"}</h3>
          {contract?.version && <p className="muted">Current version: {contract.version}</p>}
          <button className="btn primary full" onClick={downloadContract} disabled={!contract?.content}><Download size={16}/> Download Contract</button>
        </div>
      </div>
    </section>
    <section className="section soft"><div className="grid cards-3"><div className="mini-feature"><CheckCircle2/><div><strong>Simple application</strong><p>Submit details online.</p></div></div><div className="mini-feature"><CalendarDays/><div><strong>Scheduled viewing</strong><p>Admin confirms your visit.</p></div></div><div className="mini-feature"><Mail/><div><strong>Viewing updates</strong><p>Applicants can use the website to contact Casa Vicenta or request a new viewing schedule.</p></div></div></div></section>
    <section className="section contact-strip"><div className="contact-details"><strong>{contact.landladyName || "Casa Vicenta"}</strong><span>Questions about rooms or applications?</span></div><div className="contact-actions">{contact.landladyPhone&&<a className="btn secondary" href={`https://wa.me/${contact.landladyPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={18}/> WhatsApp {contact.landladyPhone}</a>}{contact.landladyFacebook&&<a className="btn secondary" href={contact.landladyFacebook} target="_blank" rel="noreferrer"><ExternalLink size={18}/> Chat on Facebook</a>}</div></section>
  </div>;
}

