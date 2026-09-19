import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
import { api, dateLabel, peso, isDemoMode } from "../lib/api";

const tabs = ["dashboard","rooms","boarders","room history","payments","electricity","applicants","complaints","users","settings"];
const title = value => value.replace(/\b\w/g, c => c.toUpperCase());
const status = value => <span className={`payment-status ${(value || "due").toLowerCase()}`}>{value || "Due"}</span>;

export default function AdminDashboard() {
  const [tab,setTab] = useState("dashboard");
  const [data,setData] = useState(null);
  const [rooms,setRooms] = useState([]);
  const [profileId,setProfileId] = useState(null);
  const [profileBackTab,setProfileBackTab] = useState("rooms");
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [refresh,setRefresh] = useState(0);
  const reload = () => setRefresh(v => v + 1);
  useEffect(() => {
    setData(null); setError("");
    const endpoints = {
      dashboard:"/api/admin/dashboard", rooms:"/api/admin/rooms", boarders:"/api/admin/boarders", "room history":"/api/admin/room-history",
      payments:"/api/admin/payments", applicants:"/api/admin/applicants", complaints:"/api/admin/complaints",
      users:"/api/admin/users", settings:"/api/admin/settings"
    };
    if (endpoints[tab]) api(endpoints[tab]).then(setData).catch(e => setError(e.message));
    if (tab==="electricity") api("/api/admin/rooms").then(d => setRooms(d.rooms || [])).catch(e => setError(e.message));
  },[tab,refresh]);
  async function act(fn, success="Saved.") {
    setMessage(""); setError("");
    try {
      const result = await fn();
      setMessage(result?.message || success);
      reload();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }
  function openProfile(id) { setProfileId(id); setProfileBackTab(tab); setTab("boarder profile"); }
  return <div className="admin-shell">
    <aside className="sidebar"><div className="sidebar-brand">CV<br/><span>Casa Vicenta</span></div>
      {tabs.map(t => <button key={t} className={tab===t?"active":""} onClick={() => setTab(t)}>{title(t)}</button>)}
    </aside>
    <main className="admin-main">
      <div className="page-title"><div><div className="eyebrow">Casa Vicenta Admin Portal</div><h1>{title(tab)}</h1></div><div className="badge success">Admin Access</div></div>
      {message && <div className="notice success-note">{message}</div>}{error && <div className="notice error">{error}</div>}
      {tab==="dashboard" && <Dashboard data={data} openProfile={openProfile}/>}
      {tab==="rooms" && <Rooms data={data} act={act} openProfile={openProfile}/>}
      {tab==="boarders" && <Boarders data={data} act={act} openProfile={openProfile}/>}
      {tab==="boarder profile" && <BoarderProfile id={profileId} act={act} onBack={() => setTab(profileBackTab)} backLabel={profileBackTab} refresh={refresh}/>}
      {tab==="room history" && <RoomHistory data={data}/>}
      {tab==="payments" && <Payments data={data} act={act}/>}
      {tab==="electricity" && <Electricity rooms={rooms} act={act}/>}
      {tab==="applicants" && <Applicants data={data} act={act}/>}
      {tab==="complaints" && <Complaints data={data} act={act}/>}
      {tab==="users" && <Users data={data} act={act}/>}
      {tab==="settings" && <Settings data={data} act={act}/>}
      {!data && !["electricity","boarder profile"].includes(tab) && !error && <p>Loading…</p>}
    </main>
  </div>;
}

function Dashboard({data,openProfile}) {
  const c=data?.counts; if (!c) return null;
  const reminderStatus=value=><span className={`payment-status ${value==="Promise overdue"?"overdue":value==="Due today"?"due":"pending"}`}>{value}</span>;

  return <>
    <div className="grid cards-4">
      <StatCard label="Occupied Rooms" value={c.occupiedRooms}/>
      <StatCard label="Vacant Rooms" value={c.vacantRooms}/>
      <StatCard label="Due Soon" value={c.dueSoon} hint="within 3 days"/>
      <StatCard label="Pending Receipts" value={c.pendingReceipts}/>
    </div>

    <div className="grid cards-3">
      <StatCard label="New Applicants" value={c.newApplicants}/>
      <StatCard label="Open Complaints" value={c.complaints}/>
      <StatCard label="Payment Reminders" value={c.paymentReminders||0} hint="due today or past promised date"/>
    </div>

    <div className="card">
      <h3>Payment Promise Reminders</h3>
      <p className="muted">These are payment dates selected by boarders after their account became overdue. On the promised date, the reminder changes to “Due today”.</p>
      <Table columns={[
        {key:"boarder",label:"Boarder"},
        {key:"roomNumber",label:"Room",render:v=>v||"—"},
        {key:"overdueSince",label:"Overdue Since",render:v=>dateLabel(v)},
        {key:"overdueAmount",label:"Overdue Balance",render:v=>peso(v)},
        {key:"promisedDate",label:"Promised Payment Date",render:v=>dateLabel(v)},
        {key:"reminderStatus",label:"Reminder",render:v=>reminderStatus(v)},
        {key:"actions",label:"Actions",render:(_,r)=><button className="btn secondary small" onClick={()=>openProfile(r.boarderId)}>View Boarder</button>}
      ]} rows={data.paymentReminders||[]}/>
      {!(data.paymentReminders||[]).length&&<p className="muted">No active overdue payment promises.</p>}
    </div>

    <div className="card">
      <h3>Due within 3 days</h3>
      <Table columns={[
        {key:"roomNumber",label:"Room"},
        {key:"boarder",label:"Boarder"},
        {key:"dueDate",label:"Due",render:v=>dateLabel(v)},
        {key:"totalAmount",label:"Amount",render:v=>peso(v)}
      ]} rows={data.dueSoon||[]}/>
    </div>
  </>;
}

function Rooms({data,act,openProfile}) {
  const [showAdd,setShowAdd]=useState(false);
  const [editingRoom,setEditingRoom]=useState(null);
  if (!data) return null;
  const rooms=data.rooms||[];
  const availableBoarders=data.availableBoarders||[];
  async function addRoom(e) {
    e.preventDefault(); const f=new FormData(e.currentTarget);
    const ok=await act(()=>api("/api/admin/rooms",{method:"POST",body:{roomNumber:f.get("roomNumber"),floor:Number(f.get("floor")),monthlyRate:Number(f.get("monthlyRate"))}}),"Room added.");
    if (ok) { e.currentTarget.reset(); setShowAdd(false); }
  }
  return <>
    <div className="actions section-actions room-actions"><button className="btn primary" onClick={()=>setShowAdd(v=>!v)}>+ Add Room</button></div>
    {showAdd && <form className="card form-grid compact-form add-room-form" onSubmit={addRoom}><h3 className="full-span">Add room</h3><label>Room number<input name="roomNumber" required/></label><label>Floor<select name="floor"><option value="1">First</option><option value="2">Second</option></select></label><label>Monthly rent<input name="monthlyRate" type="number" min="0" step="0.01" required/></label><div className="full-span"><button className="btn primary">Save Room</button></div></form>}
    <div className="card"><Table columns={[
      {key:"roomNumber",label:"Room"},{key:"floor",label:"Floor",render:v=>v===1?"First":"Second"},
      {key:"boarder",label:"Boarder",render:(v,r)=>r.boarderId?<button className="link-button" onClick={()=>openProfile(r.boarderId)}>{v}</button>:"—"},
      {key:"startedAt",label:"Move-in Date",render:v=>dateLabel(v)},
      {key:"monthlyRate",label:"Monthly Rent",render:v=>peso(v)},{key:"waterRate",label:"Water / month",render:v=>peso(v)},
      {key:"dueDay",label:"Due day",render:v=>v||"—"},
      {key:"rentStatus",label:"Rent",render:(_,r)=>r.boarderId?status(r.paymentStatus?.rent):"—"},
      {key:"electricityStatus",label:"Electricity",render:(_,r)=>r.boarderId?status(r.paymentStatus?.electricity):"—"},
      {key:"waterStatus",label:"Water",render:(_,r)=>r.boarderId?status(r.paymentStatus?.water):"—"},
      {key:"status",label:"Occupancy",render:v=>title(v||"vacant")},
      {key:"actions",label:"Actions",render:(_,r)=><button className="btn secondary" onClick={()=>setEditingRoom(r)}>Edit Room</button>}
    ]} rows={rooms}/></div>
    {editingRoom&&<EditRoomModal key={editingRoom.id} room={editingRoom} availableBoarders={availableBoarders} onClose={()=>setEditingRoom(null)} onSave={async body=>{
      const ok=await act(()=>api(`/api/admin/rooms/${editingRoom.id}`,{method:"PATCH",body}),"Room updated.");
      if(ok)setEditingRoom(null);
    }}/>} 
  </>;
}

function EditRoomModal({room,availableBoarders,onClose,onSave}) {
  const [form,setForm]=useState({
    roomNumber:room.roomNumber||"", floor:String(room.floor||1), monthlyRate:String(room.monthlyRate??""),
    status:room.status==="occupied"?"occupied":"vacant", boarderId:room.boarderId?String(room.boarderId):"", dueDay:String(room.dueDay||1)
  });
  const change=e=>setForm(v=>e.target.name==="status"&&e.target.value==="vacant"?{...v,status:"vacant",boarderId:""}:{...v,[e.target.name]:e.target.value});
  const changeBoarder=e=>{const boarderId=e.target.value;setForm(v=>({...v,boarderId,status:boarderId?"occupied":"vacant"}))};
  const boarders=[...(room.boarderId?[{id:room.boarderId,fullName:room.boarder,email:room.email,phone:room.phone}]:[]),...availableBoarders.filter(b=>b.id!==room.boarderId)];
  const occupied=form.status==="occupied";
  async function submit(e){
    e.preventDefault();
    await onSave({roomNumber:form.roomNumber,floor:Number(form.floor),monthlyRate:Number(form.monthlyRate),status:form.status,
      boarderId:occupied?Number(form.boarderId):null,dueDay:occupied?Number(form.dueDay):null});
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="card modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-room-title">
      <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>×</button>
      <h2 id="edit-room-title">Edit Room {room.roomNumber}</h2>
      <p className="muted">Update the room details and choose whether the room is vacant or occupied.</p>
      <form className="form-grid" onSubmit={submit}>
        <label>Room number<input name="roomNumber" value={form.roomNumber} onChange={change} required/></label>
        <label>Floor<select name="floor" value={form.floor} onChange={change}><option value="1">First</option><option value="2">Second</option></select></label>
        <label>Monthly rent<input name="monthlyRate" type="number" min="0" step="0.01" value={form.monthlyRate} onChange={change} required/></label>
        <label>Occupancy<select name="status" value={form.status} onChange={change}><option value="vacant">Vacant</option><option value="occupied">Occupied</option></select></label>
        <label>Boarder<select name="boarderId" value={form.boarderId} onChange={changeBoarder} required={occupied}><option value="">No boarder (Vacant)</option>{boarders.map(b=><option key={b.id} value={b.id}>{b.fullName}{b.phone?` — ${b.phone}`:""}</option>)}</select></label>
        {occupied&&<label>Monthly due day<input name="dueDay" type="number" min="1" max="28" value={form.dueDay} onChange={change} required/></label>}
        {occupied&&!boarders.length&&<div className="notice error full-span">There are no unassigned boarder accounts available to assign to this room.</div>}
        {room.boarderId&&form.status==="vacant"&&<div className="notice full-span">Saving as vacant will end the active occupancy for {room.boarder}.</div>}
        <div className="actions modal-actions full-span"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary">Save Room</button></div>
      </form>
    </div>
  </div>;
}

function Boarders({data,act,openProfile}) {
  const [adding,setAdding]=useState(false);
  if(!data) return null;
  const rows=data.boarders||[];
  const vacantRooms=data.vacantRooms||[];
  return <><div className="card"><div className="section-head"><div><h3>Boarders</h3><p className="muted">Manage boarder contact information and login access.</p></div><button className="btn primary" onClick={()=>setAdding(true)}>+ Add Boarder</button></div>
    <Table columns={[
      {key:"fullName",label:"Boarder",render:(v,r)=><button className="link-button" onClick={()=>openProfile(r.id)}>{v}</button>},
      {key:"phone",label:"Phone Number",render:v=>v||"—"},
      {key:"facebook",label:"Facebook",render:v=>v||"—"},
      {key:"occupationSchool",label:"Occupation / School",render:v=>v||"—"},
      {key:"emergencyContact",label:"Emergency Contact",render:v=>v||"—"},
      {key:"deposit",label:"Deposit",render:v=>peso(v)},
      {key:"remainingBalance",label:"Remaining Balance",render:(v,r)=>{
        if(Number(v)<=0.001) return "Paid";
        const summary=`Rent - ${peso(r.rentBalance)}\nElectricity - ${peso(r.electricityBalance)}\nWater - ${peso(r.waterBalance)}`;
        return <span title={summary}>{peso(v)}</span>;
      }},
      {key:"actions",label:"Actions",render:(_,r)=><div className="actions">
        <button className="btn danger" onClick={()=>confirm(`Delete ${r.fullName}? This removes login access and active room assignment while keeping historical records.`)&&act(()=>api(`/api/admin/boarders/${r.id}`,{method:"DELETE"}),"Boarder deleted.")}>Delete</button>
        <button className="btn secondary" onClick={()=>confirm(`Reset ${r.fullName}'s password to the configured temporary password?`)&&act(()=>api(`/api/admin/users/${r.id}/reset-password`,{method:"POST"}),"Password reset to the configured temporary password.")}>Reset Password</button>
      </div>}
    ]} rows={rows}/>
    {!rows.length&&<p className="muted">No boarders found.</p>}
  </div>
  {adding&&<ManualBoarderModal vacantRooms={vacantRooms} onClose={()=>setAdding(false)} onSave={async body=>{
    const ok=await act(()=>api("/api/admin/boarders",{method:"POST",body}),"Boarder profile created.");
    if(ok)setAdding(false);
  }}/>}</>;
}

function ManualBoarderModal({vacantRooms,onClose,onSave}) {
  const [roomId,setRoomId]=useState("");
  async function submit(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    await onSave({
      fullName:f.get("fullName"),phone:f.get("phone"),facebook:f.get("facebook"),occupationSchool:f.get("occupationSchool"),
      emergencyContact:f.get("emergencyContact"),deposit:Number(f.get("deposit")||0),roomId:roomId?Number(roomId):null,
      dueDay:roomId?Number(f.get("dueDay")||1):1,occupants:1,preferredFloor:"No Preference"
    });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="card modal-card" role="dialog" aria-modal="true" aria-labelledby="manual-boarder-title">
      <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>×</button>
      <h2 id="manual-boarder-title">Add Boarder Manually</h2>
      <p className="muted">Create the boarder's profile and login. Room assignment is optional.</p>
      <form className="form-grid" onSubmit={submit}>
        <label>Full Name<input name="fullName" required/></label>
        <label>Phone Number<input name="phone" required/></label>
        <label>Facebook<input name="facebook" required placeholder="Facebook name or profile link"/></label>
        <label>Occupation / School<input name="occupationSchool"/></label>
        <label>Emergency Contact<input name="emergencyContact"/></label>
        <label>Deposit<input name="deposit" type="number" min="0" step="0.01" defaultValue="0"/></label>
        <label>Room<select name="roomId" value={roomId} onChange={e=>setRoomId(e.target.value)}><option value="">Unassigned</option>{vacantRooms.map(r=><option key={r.id} value={r.id}>Room {r.roomNumber} — {r.floor===1?"First":"Second"} Floor</option>)}</select></label>
        {roomId&&<label>Monthly Due Day<input name="dueDay" type="number" min="1" max="28" defaultValue="1" required/></label>}
        <p className="muted full-span">The boarder receives the configured temporary password and must change it after login.</p>
        <div className="actions modal-actions full-span"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary">Add Boarder</button></div>
      </form>
    </div>
  </div>;
}

function BoarderProfile({id,act,onBack,backLabel="rooms",refresh}) {
  const [data,setData]=useState(null),[edit,setEdit]=useState(false),[error,setError]=useState("");
  useEffect(()=>{if(id)api(`/api/admin/boarders/${id}`).then(setData).catch(e=>setError(e.message))},[id,refresh]);
  if(error) return <div className="notice error">{error}</div>;
  if(!data) return <p>Loading profile…</p>;
  const p=data.profile;
  async function save(e) {
    e.preventDefault();const f=new FormData(e.currentTarget);
    const body=Object.fromEntries(["fullName","phone","facebook","occupationSchool","preferredMoveIn","preferredFloor","occupants","emergencyContact","notes","dueDay","deposit"].map(k=>[k,f.get(k)]));
    const ok=await act(()=>api(`/api/admin/boarders/${id}`,{method:"PATCH",body}),"Boarder profile updated.");
    if(ok) setEdit(false);
  }
  async function addPromise(e) {
    e.preventDefault();const f=new FormData(e.currentTarget);
    const ok=await act(()=>api("/api/admin/payment-promises",{method:"POST",body:{boarderId:id,note:f.get("note"),promisedDate:f.get("promisedDate")}}),"Promise to pay note saved.");
    if(ok) e.currentTarget.reset();
  }
  const fields=[["fullName","Full name"],["phone","Phone"],["facebook","Facebook"],["occupationSchool","Occupation / School"],["preferredMoveIn","Preferred move-in"],["preferredFloor","Preferred floor"],["occupants","Occupants"],["emergencyContact","Emergency contact"],["deposit","Deposit"],["notes","Application notes"],["dueDay","Monthly due day"]];
  return <><div className="actions section-actions"><button className="btn secondary" onClick={onBack}>← Back to {title(backLabel)}</button><button className="btn primary" onClick={()=>setEdit(v=>!v)}>{edit?"Cancel edit":"Edit Profile"}</button></div>
    <div className="card"><h2>{p.fullName}</h2><p className="muted">Room {p.roomNumber||"Not assigned"} • {p.status}</p>
      {edit?<form className="form-grid" onSubmit={save}>{fields.map(([key,label])=><label key={key}>{label}<input name={key} defaultValue={p[key]??""} type={key==="preferredMoveIn"?"date":key==="occupants"||key==="dueDay"||key==="deposit"?"number":"text"} step={key==="deposit"?"0.01":undefined} min={key==="deposit"?"0":key==="dueDay"||key==="occupants"?"1":undefined} max={key==="dueDay"?"28":undefined}/></label>)}<div className="full-span"><button className="btn primary">Save Profile</button></div></form>
      :<div className="profile-grid">{fields.map(([key,label])=><div key={key}><strong>{label}</strong><div>{key==="deposit"?peso(p[key]):p[key]||"—"}</div></div>)}</div>}</div>
    <form className="card form-grid" onSubmit={addPromise}><h3 className="full-span">Promise to pay note</h3><label className="full-span">Note<textarea name="note" rows="3" required placeholder="What did the boarder promise?"/></label><label>Promised date<input name="promisedDate" type="date"/></label><div className="full-span"><button className="btn primary">Save Note</button></div></form>
    <div className="card"><h3>Payment notes</h3>{data.promises.length?data.promises.map((n,i)=><p key={i}><strong>{n.promisedDate?dateLabel(n.promisedDate):"No promised date"}</strong> — {n.note} <span className="muted tiny">({dateLabel(n.createdAt?.slice(0,10))})</span></p>):<p className="muted">No notes yet.</p>}</div>
  </>;
}

function RoomHistory({data}) {
  const [room,setRoom]=useState("all");
  if(!data) return null;
  const roomNumbers=[...new Set((data.readings||[]).map(r=>r.roomNumber))];
  const rows=room==="all"?(data.readings||[]):(data.readings||[]).filter(r=>r.roomNumber===room);
  const monthLabel=value=>new Date(`${value}-01T00:00:00`).toLocaleDateString("en-PH",{month:"short",year:"numeric"});
  return <div className="card"><div className="section-head"><div><h3>Six-month electricity history</h3><p className="muted">{monthLabel(data.start)} through {monthLabel(data.end)}. The six-month window includes the current month and moves forward automatically.</p></div><label className="history-filter">Room<select value={room} onChange={e=>setRoom(e.target.value)}><option value="all">All rooms</option>{roomNumbers.map(n=><option key={n} value={n}>Room {n}</option>)}</select></label></div>
    <Table columns={[{key:"roomNumber",label:"Room"},{key:"boarder",label:"Boarder"},{key:"period",label:"Month"},{key:"previousReading",label:"Previous"},{key:"currentReading",label:"Current"},{key:"consumption",label:"Consumption (kWh)"},{key:"amount",label:"Amount",render:v=>peso(v)}]} rows={rows}/>
    {!rows.length&&<p>No readings recorded for this selection in the current six-month window.</p>}</div>;
}

function Payments({data,act}) {
  if(!data) return null;
  async function completePayment(r){
    const answer=prompt(`Did ${r.boarder} pay the full remaining ${title(r.paymentType||"rent")} amount?\n\nType YES for full payment or NO to record the submitted amount as a partial payment.`);
    if(answer==null)return;
    const normalized=answer.trim().toLowerCase();
    if(!["yes","y","no","n"].includes(normalized)){alert("Please type YES or NO.");return;}
    const paidInFull=normalized==="yes"||normalized==="y";
    await act(()=>api(`/api/admin/payments/${r.id}/approve`,{method:"POST",body:{paidInFull}}),paidInFull?"Full payment recorded.":"Partial payment recorded. The unpaid remainder is now shown in Remaining Balance.");
  }
  return <div className="card"><p className="muted">Complete only after confirming the payment reached the bank. Each receipt applies to its selected charge.</p>
    <Table columns={[{key:"boarder",label:"Boarder"},{key:"roomNumber",label:"Room"},{key:"period",label:"Period"},{key:"paymentType",label:"For",render:v=>title(v||"rent")},{key:"amount",label:"Submitted",render:v=>peso(v)},{key:"submittedAt",label:"Submitted",render:v=>dateLabel(v?.slice(0,10))},{key:"status",label:"Status"},{key:"actions",label:"Actions",render:(_,r)=><div className="actions"><button className="btn secondary" onClick={()=>isDemoMode?alert("Demo mode: receipt preview is disabled because no real files are stored."):window.open(`/api/admin/payments/${r.id}/receipt`,`receipt-${r.id}`)}>View Receipt</button>{r.status==="pending"&&<><button className="btn primary" onClick={()=>completePayment(r)}>Complete</button><button className="btn danger" onClick={()=>{const reason=prompt("Reason for rejection");if(reason)act(()=>api(`/api/admin/payments/${r.id}/reject`,{method:"POST",body:{reason}}),"Receipt rejected.")}}>Reject</button></>}</div>}]} rows={data.submissions||[]}/></div>;
}

function Electricity({rooms,act}) {
  const occupied=rooms.filter(r=>r.status==="occupied");
  const [calc,setCalc]=useState(null);
  const [selectedRoomId,setSelectedRoomId]=useState("");
  const [previousReading,setPreviousReading]=useState("");
  const selectedRoom=occupied.find(r=>String(r.id)===selectedRoomId);

  function selectRoom(e){
    const roomId=e.target.value;
    const room=occupied.find(r=>String(r.id)===roomId);
    setSelectedRoomId(roomId);
    setPreviousReading(room?.lastElectricityReading==null?"":String(room.lastElectricityReading));
    setCalc(null);
  }

  async function submit(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    await act(async()=>{
      const res=await api("/api/admin/electricity",{
        method:"POST",
        body:{
          roomId:Number(f.get("roomId")),
          billingPeriod:f.get("billingPeriod"),
          previousReading:Number(f.get("previousReading")),
          currentReading:Number(f.get("currentReading"))
        }
      });
      setCalc(res);
      setPreviousReading(String(res.currentReading));
    },"Monthly bill saved.");
  }

  return <div className="card form-shell">
    <h3>Input Electricity Consumption</h3>
    <p className="muted">Saving a reading creates the monthly rent, electricity, and water bill. The electricity rate and the shared electricity/water due days are automatically taken from Settings. The previous reading is taken from the room's latest saved meter reading, even if that reading is more than six months old or belonged to a previous boarder.</p>
    <form className="form-grid" onSubmit={submit}>
      <label>Occupied Room
        <select name="roomId" value={selectedRoomId} onChange={selectRoom} required>
          <option value="">Select room</option>
          {occupied.map(r=><option key={r.id} value={r.id}>{r.roomNumber} — {r.boarder}</option>)}
        </select>
      </label>
      <label>Billing Month<input name="billingPeriod" type="month" required/></label>
      <label>Previous Reading
        <input name="previousReading" type="number" step="0.01" value={previousReading} onChange={e=>setPreviousReading(e.target.value)} required/>
        {selectedRoom?.lastElectricityPeriod&&<span className="tiny muted">Last saved reading: {selectedRoom.lastElectricityReading} kWh ({selectedRoom.lastElectricityPeriod})</span>}
        {selectedRoomId&&selectedRoom?.lastElectricityReading==null&&<span className="tiny muted">No previous meter reading is stored for this room yet. Enter the starting reading manually.</span>}
      </label>
      <label>Current Reading<input name="currentReading" type="number" step="0.01" min={previousReading!==""?previousReading:undefined} required/></label>
      <div className="full-span"><button className="btn primary">Save / Update Bill</button></div>
    </form>
    {calc&&<div className="notice success-note">Consumption: {calc.consumption} kWh • Electricity: {peso(calc.amount)} (due {dateLabel(calc.electricityDueDate)}) • Water: {peso(calc.waterAmount)} (due {dateLabel(calc.waterDueDate)}) • Rent due: {dateLabel(calc.rentDueDate)} • Current month: {peso(calc.total)}</div>}
  </div>;
}

function Applicants({data,act}) {
  const [adding,setAdding]=useState(null);
  if(!data) return null;

  const vacantRooms=data.vacantRooms||[];
  const requests=data.requests||[];

  const requestLabel=value=>({
    reschedule:"Reschedule Viewing",
    question:"Question",
    cancel:"Cancel Viewing"
  }[value]||title(value||"request"));

  const dateTimeLabel=value=>{
    if(!value) return "—";
    const d=new Date(value);
    if(Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-PH",{
      year:"numeric",
      month:"short",
      day:"numeric",
      hour:"numeric",
      minute:"2-digit"
    });
  };

  async function replyToRequest(r){
    const reply=prompt(
      `Reply to ${r.applicant}. This will be sent by SMS to ${r.phone}.`,
      r.adminReply||""
    );

    if(!reply?.trim()) return;

    await act(
      ()=>api(`/api/admin/applicant-requests/${r.id}`,{
        method:"PATCH",
        body:{status:"reviewed",adminReply:reply.trim()}
      }),
      "Reply sent and request marked reviewed."
    );
  }

  return <>
    <div className="card">
      <div className="section-head">
        <div>
          <h3>Applicant Requests</h3>
          <p className="muted">Messages, viewing reschedule requests, and cancellations submitted from the public website.</p>
        </div>
      </div>

      <Table columns={[
        {key:"applicant",label:"Applicant"},
        {key:"phone",label:"Phone"},
        {key:"requestType",label:"Request",render:v=>requestLabel(v)},
        {key:"currentViewingAt",label:"Current Viewing",render:v=>dateTimeLabel(v)},
        {key:"requestedViewingAt",label:"Requested Date",render:v=>dateTimeLabel(v)},
        {key:"message",label:"Message"},
        {key:"createdAt",label:"Sent",render:v=>dateTimeLabel(v)},
        {key:"status",label:"Status",render:v=>title(v||"new")},
        {key:"actions",label:"Actions",render:(_,r)=><div className="actions applicant-actions">
          {r.requestType==="reschedule"&&r.status!=="done"&&r.requestedViewingAt&&
            <button
              className="btn primary small"
              onClick={()=>confirm(`Accept ${r.applicant}'s requested viewing schedule for ${dateTimeLabel(r.requestedViewingAt)}?`)&&act(
                ()=>api(`/api/admin/applicant-requests/${r.id}/accept-reschedule`,{method:"POST"}),
                "Viewing rescheduled and confirmation SMS sent."
              )}
            >
              Accept New Schedule
            </button>
          }

          {r.status!=="done"&&
            <button className="btn secondary small" onClick={()=>replyToRequest(r)}>
              Reply / Mark Reviewed
            </button>
          }

          {r.status!=="done"&&
            <button
              className="btn secondary small"
              onClick={()=>act(
                ()=>api(`/api/admin/applicant-requests/${r.id}`,{method:"PATCH",body:{status:"done"}}),
                r.requestType==="cancel"?"Viewing cancelled.":"Applicant request marked done."
              )}
            >
              {r.requestType==="cancel"?"Confirm Cancellation":"Done"}
            </button>
          }
        </div>}
      ]} rows={requests}/>

      {!requests.length&&<p className="muted">No applicant requests yet.</p>}
    </div>

    <div className="card">
      <h3>Applicants</h3>
      <Table columns={[
        {key:"fullName",label:"Applicant"},
        {key:"phone",label:"Phone Number",render:v=>v||"—"},
        {key:"facebook",label:"Facebook",render:v=>v||"—"},
        {key:"occupationSchool",label:"Occupation / School",render:v=>v||"—"},
        {key:"preferredMoveIn",label:"Preferred Move-in",render:v=>dateLabel(v)},
        {key:"preferredFloor",label:"Preferred Floor",render:v=>v||"—"},
        {key:"occupants",label:"Occupants",render:v=>v||"—"},
        {key:"emergencyContact",label:"Emergency Contact",render:v=>v||"—"},
        {key:"scheduledAt",label:"Viewing",render:v=>v||"—"},
        {key:"actions",label:"Actions",render:(_,r)=><div className="actions applicant-actions">
          {!['accepted','declined'].includes(r.status)&&<button className="btn secondary small" onClick={()=>{
            const scheduledAt=prompt("Viewing date/time (example: 2026-09-25T14:00)",r.scheduledAt||"");
            if(scheduledAt)act(
              ()=>api(`/api/admin/applicants/${r.id}/schedule`,{method:"POST",body:{scheduledAt}}),
              "Viewing schedule saved."
            )
          }}>Schedule Viewing</button>}

          {!['accepted','declined'].includes(r.status)&&<button className="btn danger small" onClick={()=>confirm(`Decline ${r.fullName}'s application?`)&&act(
            ()=>api(`/api/admin/applicants/${r.id}/decline`,{method:"POST"}),
            "Applicant declined."
          )}>Decline</button>}

          {!['accepted','declined'].includes(r.status)&&<button className="btn primary small" disabled={!vacantRooms.length} title={!vacantRooms.length?"Add a vacant room first":""} onClick={()=>setAdding(r)}>
            Add as Boarder
          </button>}
        </div>}
      ]} rows={data.applicants||[]}/>
    </div>

    {adding&&<ApplicantBoarderModal
      applicant={adding}
      vacantRooms={vacantRooms}
      onClose={()=>setAdding(null)}
      onSave={async body=>{
        const ok=await act(
          ()=>api(`/api/admin/applicants/${adding.id}/add-as-boarder`,{method:"POST",body}),
          "Applicant added as boarder."
        );
        if(ok)setAdding(null)
      }}
    />}
  </>;
}

function ApplicantBoarderModal({applicant,vacantRooms,onClose,onSave}) {
  async function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);await onSave({roomId:Number(f.get("roomId")),dueDay:Number(f.get("dueDay")),deposit:Number(f.get("deposit")||0)})}
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="card modal-card" role="dialog" aria-modal="true" aria-labelledby="add-boarder-title">
      <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>×</button>
      <h2 id="add-boarder-title">Add {applicant.fullName} as Boarder</h2>
      <p className="muted">Create the login account and assign a vacant room.</p>
      <form className="form-grid" onSubmit={submit}>
        <label>Room<select name="roomId" required><option value="">Select vacant room</option>{vacantRooms.map(r=><option key={r.id} value={r.id}>Room {r.roomNumber} — {r.floor===1?"First":"Second"} Floor</option>)}</select></label>
        <label>Monthly due day<input name="dueDay" type="number" min="1" max="28" defaultValue="1" required/></label>
        <label>Deposit<input name="deposit" type="number" min="0" step="0.01" defaultValue="0"/></label>
        <p className="muted full-span">The boarder receives the configured temporary password.</p>
        <div className="actions modal-actions full-span"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary">Add as Boarder</button></div>
      </form>
    </div>
  </div>;
}

function Complaints({data,act}) {
  if(!data) return null;

  return <div className="card"><Table columns={[
    {key:"roomNumber",label:"Room",render:v=>v||"—"},
    {key:"boarder",label:"Boarder"},
    {key:"category",label:"Category"},
    {key:"description",label:"Complaint"},
    {key:"status",label:"Status"},
    {key:"actions",label:"Actions",render:(_,r)=>{
      const closed=r.status==="resolved"||r.status==="closed";

      if(r.requestType==="password_reset") {
        return <div className="actions">
          <button
            className="btn primary"
            disabled={closed}
            onClick={()=>confirm(`Reset ${r.boarder}'s password to the configured temporary password? The boarder will receive an SMS notification.`)&&act(
              ()=>api(`/api/admin/complaints/${r.id}/reset-password`,{method:"POST"}),
              "Password reset request completed."
            )}
          >
            Reset Password
          </button>

          <button
            className="btn secondary"
            disabled={closed}
            onClick={()=>act(
              ()=>api(`/api/admin/complaints/${r.id}`,{method:"PATCH",body:{status:"resolved",adminNotes:r.adminNotes||""}}),
              "Request marked resolved."
            )}
          >
            Resolved
          </button>
        </div>;
      }

      return <button
        className="btn primary"
        disabled={closed}
        onClick={()=>{
          const resolution=prompt(
            "What did you do to resolve this complaint? This message will be sent to the boarder.",
            r.adminNotes||""
          );

          if(resolution?.trim()) {
            act(
              ()=>api(`/api/admin/complaints/${r.id}`,{
                method:"PATCH",
                body:{
                  status:"resolved",
                  adminNotes:resolution.trim()
                }
              }),
              "Complaint marked resolved."
            );
          }
        }}
      >
        Done
      </button>;
    }}
  ]} rows={data.complaints||[]}/></div>;
}

function Users({data,act}) {
  if(!data) return null;
  async function addAdmin(e){e.preventDefault();const f=new FormData(e.currentTarget);const ok=await act(()=>api("/api/admin/users",{method:"POST",body:{fullName:f.get("fullName"),email:f.get("email")}}),"Admin created with the configured temporary password.");if(ok)e.currentTarget.reset()}
  return <><div className="card"><h2>Admins & Boarders</h2><Table columns={[{key:"fullName",label:"Name"},{key:"role",label:"Role"},{key:"email",label:"Email",render:v=>v||"—"},{key:"phone",label:"Phone",render:v=>v||"—"},{key:"roomNumber",label:"Room",render:v=>v||"—"},{key:"mustChangePassword",label:"Password",render:v=>v?"Change required":"Updated"},{key:"actions",label:"Actions",render:(_,r)=><button className="btn secondary" onClick={()=>confirm(`Reset ${r.fullName}'s password to the configured temporary password?`)&&act(()=>api(`/api/admin/users/${r.id}/reset-password`,{method:"POST"}),"Password reset to the configured temporary password.")}>Reset Password</button>}]} rows={data.users||[]}/></div>
    <form className="card form-shell" onSubmit={addAdmin}><h3>Add Administrator</h3><p className="muted">New administrators use the configured temporary password and must change it after login.</p><label>Name<input name="fullName" required/></label><label>Email<input name="email" type="email" required/></label><button className="btn primary">Add Admin</button></form></>;
}

function Settings({data,act}) {
  const initial=data?.settings||{},[form,setForm]=useState(initial);
  useEffect(()=>setForm(initial),[data]);
  if(!data) return null;
  const change=e=>setForm(v=>({...v,[e.target.name]:e.target.value}));
  const fields=["electricity_rate","electricity_due_day","water_due_day","bank_name","bank_account_name","bank_account_number","landlady_name","landlady_email","landlady_phone"];
  async function saveWater(e){
    e.preventDefault();
    await act(()=>api("/api/admin/settings",{method:"PUT",body:{water_monthly_amount:form.water_monthly_amount||"0"}}),"Monthly water charge saved for all rooms. It applies when future bills are generated.");
  }
  return <><form className="grid cards-2" onSubmit={e=>{e.preventDefault();const body=Object.fromEntries(fields.map(k=>[k,form[k]||""]));act(()=>api("/api/admin/settings",{method:"PUT",body}),"Settings saved.")}}>
    <div className="card"><h3>Billing & Bank</h3><label>Default electricity rate<input name="electricity_rate" type="number" min="0" step="0.01" value={form.electricity_rate||""} onChange={change}/></label><label>Electricity due day (all rooms)<input name="electricity_due_day" type="number" min="1" max="28" step="1" value={form.electricity_due_day||"1"} onChange={change} required/></label><label>Water due day (all rooms)<input name="water_due_day" type="number" min="1" max="28" step="1" value={form.water_due_day||"1"} onChange={change} required/></label><p className="tiny muted">These are recurring monthly due days. For example, 15 means the utility is due on the 15th of every month for every room.</p><label>Bank name<input name="bank_name" value={form.bank_name||""} onChange={change}/></label><label>Account name<input name="bank_account_name" value={form.bank_account_name||""} onChange={change}/></label><label>Account number<input name="bank_account_number" value={form.bank_account_number||""} onChange={change}/></label></div>
    <div className="card"><h3>Landlady Contact</h3><label>Name<input name="landlady_name" value={form.landlady_name||""} onChange={change}/></label><label>Email<input name="landlady_email" type="email" value={form.landlady_email||""} onChange={change}/></label><label>Phone<input name="landlady_phone" value={form.landlady_phone||""} onChange={change}/></label><button className="btn primary">Save Settings</button></div></form>
    <form className="card form-shell" onSubmit={saveWater}><h3>Water bill per month — all rooms</h3><p className="muted">Set one monthly water amount for every room. Saving does not change bills already issued.</p><label>Monthly water amount<input name="water_monthly_amount" type="number" min="0" step="0.01" value={form.water_monthly_amount||""} onChange={change} required/></label><button className="btn primary">Save Water Charge</button></form></>;
}

