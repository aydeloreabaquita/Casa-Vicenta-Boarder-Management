import { useState } from "react";
import { CalendarDays, MessageSquareText } from "lucide-react";
import { api } from "../lib/api";

export default function ApplicantRequest({onNavigate}) {
  const [requestType,setRequestType]=useState("reschedule");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);

  async function submit(e){
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    const f=new FormData(e.currentTarget);

    try{
      const result=await api("/api/public/applicant-requests",{
        method:"POST",
        body:{
          phone:f.get("phone"),
          requestType,
          requestedViewingAt:requestType==="reschedule"?f.get("requestedViewingAt"):null,
          message:f.get("message")
        }
      });
      setMessage(result.message||"Your request was sent to Casa Vicenta.");
      setSent(true);
      e.currentTarget.reset();
      setRequestType("reschedule");
    }catch(err){
      setError(err.message);
    }finally{
      setBusy(false);
    }
  }

  if(sent){
    return <div className="center-page">
      <div className="card success-panel">
        <div className="brand-mark"><MessageSquareText/></div>
        <h1>Request sent</h1>
        <p>{message}</p>
        <p className="muted">The admin can see it under Applicants → Applicant Requests.</p>
        <button className="btn primary" onClick={()=>onNavigate("home")}>Back to Website</button>
      </div>
    </div>;
  }

  return <div className="form-page">
    <form className="card form-shell" onSubmit={submit}>
      <div className="brand-mark"><CalendarDays/></div>
      <h1>Applicant Contact / Reschedule</h1>
      <p className="muted">Use the phone number from your application so Casa Vicenta can match your request.</p>

      {error&&<div className="notice error">{error}</div>}

      <label>
        Phone Number
        <input name="phone" placeholder="09XXXXXXXXX" required/>
      </label>

      <label>
        What do you need?
        <select value={requestType} onChange={e=>setRequestType(e.target.value)}>
          <option value="reschedule">Reschedule Viewing</option>
          <option value="question">Ask a Question</option>
          <option value="cancel">Cancel Viewing</option>
        </select>
      </label>

      {requestType==="reschedule"&&<label>
        Preferred new date and time
        <input name="requestedViewingAt" type="datetime-local" required/>
      </label>}

      <label>
        Message
        <textarea
          name="message"
          rows="5"
          maxLength="1000"
          required
          placeholder={requestType==="reschedule"?"Tell us why you need to reschedule or anything the admin should know.":"Type your message to Casa Vicenta."}
        />
      </label>

      <div className="actions">
        <button type="button" className="btn secondary" onClick={()=>onNavigate("home")}>Cancel</button>
        <button className="btn primary" disabled={busy}>{busy?"Sending…":"Send Request"}</button>
      </div>
    </form>
  </div>;
}
