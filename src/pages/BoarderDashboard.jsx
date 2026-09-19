import { useEffect, useState } from "react";
import { CreditCard, FileText, MessageSquareWarning, Phone, Zap } from "lucide-react";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
import { api, dateLabel, peso } from "../lib/api";

const paymentTypes = ["rent","electricity","water"];
const title = value => String(value || "").replace(/\b\w/g, c => c.toUpperCase());

function billStatus(bill) {
  if (Number(bill.balance || 0) <= 0.001) return "Paid";
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const charges = [
    { due:Number(bill.rentDue||0), pending:Number(bill.rentPending||0), date:bill.rentDueDate||bill.dueDate },
    { due:Number(bill.electricityDue||0), pending:Number(bill.electricityPending||0), date:bill.electricityDueDate||bill.dueDate },
    { due:Number(bill.waterDue||0), pending:Number(bill.waterPending||0), date:bill.waterDueDate||bill.dueDate }
  ];
  const uncovered = charges.filter(c=>Math.max(0,c.due-c.pending)>0.001);
  if (uncovered.some(c=>c.date&&c.date<today)) return "Overdue";
  if (uncovered.length) return "Due";
  return Number(bill.pendingAmount||0)>0 ? "Pending" : "Due";
}

export default function BoarderDashboard() {
  const [data,setData]=useState(null),[message,setMessage]=useState(""),[error,setError]=useState(""),[contract,setContract]=useState(null);
  const [selectedBill,setSelectedBill]=useState(""),[paymentType,setPaymentType]=useState("rent"),[printBill,setPrintBill]=useState(null);
  const [promiseDate,setPromiseDate]=useState("");
  const load=()=>api("/api/boarder/dashboard").then(d=>{
    setData(d);
    setSelectedBill(current=>current&&d.bills.some(b=>String(b.id)===current)?current:String(d.bills.find(b=>b.balance>0)?.id||""));
    setPromiseDate(current=>current||(d.latestPaymentPromise?.promisedDate&&d.latestPaymentPromise.promisedDate>=d.today?d.latestPaymentPromise.promisedDate:""));
  }).catch(e=>setError(e.message));
  useEffect(()=>{load()},[]);

  async function submitReceipt(e){e.preventDefault();setMessage("");setError("");const f=new FormData(e.currentTarget);try{const res=await api("/api/boarder/payments",{method:"POST",body:f});setMessage(res.message);e.currentTarget.reset();load()}catch(err){setError(err.message)}}
  async function submitPaymentPromise(e){
    e.preventDefault();setMessage("");setError("");
    try{
      const res=await api("/api/boarder/payment-promise",{method:"POST",body:{promisedDate:promiseDate}});
      setMessage(res.message);
      load();
    }catch(err){setError(err.message)}
  }
  async function submitComplaint(e){e.preventDefault();setMessage("");setError("");const f=new FormData(e.currentTarget);try{await api("/api/boarder/complaints",{method:"POST",body:{category:f.get("category"),subject:f.get("subject"),description:f.get("description")}});setMessage("Complaint submitted.");e.currentTarget.reset();load()}catch(err){setError(err.message)}}
  async function viewContract(){try{const res=await api("/api/boarder/contract");setContract(res.contract)}catch(err){setError(err.message)}}
  function printOne(bill){setPrintBill(bill);document.body.classList.add("print-single-bill");setTimeout(()=>{window.print();document.body.classList.remove("print-single-bill")},80)}
  function printList(){setPrintBill(null);document.body.classList.remove("print-single-bill");setTimeout(()=>window.print(),50)}

  if(error&&!data)return <div className="dashboard-page"><div className="notice error">{error}</div></div>;
  if(!data)return <div className="dashboard-page"><p>Loading Casa Vicenta portal…</p></div>;

  const {boarder,occupancy,bill,bank,landlady,payments,complaints,bills,totalDue,depositBalance,promises,oldestUnpaidDueDate,today,overdueAmount,overdueSince,latestPaymentPromise}=data;
  const chosen=bills.find(b=>String(b.id)===selectedBill);
  const typeDue=chosen?Number(chosen[paymentType+"Due"]||0):0;
  const typePending=chosen?Number(chosen[paymentType+"Pending"]||0):0;
  const dueDate=oldestUnpaidDueDate||bill.dueDate;
  const dueDays=Math.ceil((new Date(`${dueDate}T23:59:59`)-new Date())/86400000);
  const currentStatement=bills[0];

  function chooseBill(value){
    setSelectedBill(value);
    const selected=bills.find(b=>String(b.id)===value);
    if(selected){const available=paymentTypes.find(t=>Number(selected[t+"Due"]||0)>0.001&&Number(selected[t+"Pending"]||0)<=0.001);if(available)setPaymentType(available)}
  }

  return <div className="dashboard-page">
    <div className="page-title"><div><div className="eyebrow">Casa Vicenta Boarder Portal</div><h1>Hello, {boarder.fullName}</h1><p className="muted">Room {occupancy.roomNumber} • {occupancy.floor===1?"First":"Second"} Floor</p></div><div className={`badge ${dueDays<=3&&totalDue?"warn":"success"}`}>{!totalDue?"No unpaid bills":dueDays<0?"Payment overdue":`Payment due ${dueDays===0?"today":`in ${dueDays} day${dueDays===1?"":"s"}`}`}</div></div>
    {message&&<div className="notice success-note">{message}</div>}{error&&<div className="notice error">{error}</div>}

    {Number(overdueAmount||0)>0.001&&<div className="card" style={{margin:"18px 0"}}>
      <div className="section-head">
        <div>
          <div className="eyebrow">Payment Overdue</div>
          <h2>Your account is overdue</h2>
          <p className="muted">You currently have {peso(overdueAmount)} overdue since {dateLabel(overdueSince)}. Please choose the date you expect to pay. The admin will receive this as a payment reminder.</p>
        </div>
        <span className="payment-status overdue">Overdue</span>
      </div>
      <form className="form-grid" onSubmit={submitPaymentPromise}>
        <label>When will you be able to pay?
          <input name="promisedDate" type="date" min={today} value={promiseDate} onChange={e=>setPromiseDate(e.target.value)} required/>
        </label>
        <div style={{alignSelf:"end"}}>
          <button className="btn primary">Send / Update Payment Date</button>
        </div>
      </form>
      {latestPaymentPromise?.promisedDate&&<p className="tiny muted">Latest date sent to admin: {dateLabel(latestPaymentPromise.promisedDate)}. You can submit a new date above if your schedule changes.</p>}
    </div>}

    <div className="grid cards-5"><StatCard label="Oldest Unpaid Due" value={totalDue?dateLabel(dueDate):"—"}/><StatCard label="Current Room Rent" value={peso(bill.roomRent)}/><StatCard label="Current Electricity" value={peso(bill.electricityAmount)} hint={`${bill.electricityConsumption||0} kWh`}/><StatCard label="Total Unpaid Balance" value={peso(totalDue)} hint="includes earlier months"/><StatCard label="Deposit Balance" value={peso(depositBalance||0)}/></div>

    <div className="grid dashboard-grid">
      <form className="card" onSubmit={submitReceipt}><div className="card-title"><CreditCard/><h3>Submit Payment Receipt</h3></div><p>Bank: {bank.name||"Not configured"}</p><p>Account Name: {bank.accountName||"Not configured"}</p><p>Account Number: {bank.accountNumber||"Not configured"}</p>
        <label>Bill month<select name="billingId" value={selectedBill} onChange={e=>chooseBill(e.target.value)} required><option value="">Select bill</option>{bills.filter(b=>b.balance>0).map(b=><option value={b.id} key={b.id}>{b.period} — {peso(b.balance)} remaining</option>)}</select></label>
        <label>Payment for<select name="paymentType" value={paymentType} onChange={e=>setPaymentType(e.target.value)}><option value="rent">Rent</option><option value="electricity">Electricity</option><option value="water">Water</option></select></label>
        <p className="muted">Remaining for this charge: {peso(typeDue)}</p>
        {typePending>0&&<p className="notice success-note">A {peso(typePending)} receipt for this charge is already pending admin review.</p>}
        <label>Amount paid<input name="amount" type="number" step="0.01" min="0.01" max={typeDue||undefined} defaultValue="" required/></label><label>Payment date<input name="paymentDate" type="date" required/></label><label>Reference Number<input name="referenceNumber" placeholder="Transaction reference"/></label><label>Upload proof of payment<input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required/></label>
        <button className="btn primary" disabled={!chosen||!typeDue||typePending>0||!data.receiptUploadAvailable}>Submit Receipt</button>
        {!data.receiptUploadAvailable&&<p className="notice error">Receipt uploads are unavailable until Casa Vicenta enables Cloudflare R2 storage.</p>}
        {!bills.length&&<p className="tiny muted">The admin must generate a monthly bill before a receipt can be submitted.</p>}
      </form>

      <div className="card"><div className="card-title"><Zap/><h3>Latest Bill {currentStatement?`— ${currentStatement.period}`:""}</h3></div><div className="meter">Rent: {peso(bill.roomRent)} • Due: {dateLabel(bill.rentDueDate||bill.dueDate)}</div><div className="meter">Electricity: {peso(bill.electricityAmount)} ({bill.electricityConsumption||0} kWh) • Due: {dateLabel(bill.electricityDueDate)}</div><div className="meter">Water: {peso(bill.waterAmount)} • Due: {dateLabel(bill.waterDueDate)}</div><div className="meter">Current month billed: {peso(bill.totalAmount)}</div>{currentStatement&&<><div className="meter">Current month unpaid: {peso(currentStatement.balance)}</div><div className="meter">Previous unpaid carryover: {peso(currentStatement.carryover)}</div></>}<div className="meter"><strong>Total unpaid balance: {peso(totalDue)}</strong></div></div>
      <div className="card"><div className="card-title"><FileText/><h3>Contract & Rules</h3></div><button className="btn secondary" onClick={viewContract}>View Current Contract</button>{contract&&<div className="contract-box"><strong>{contract.title}</strong><p>Version {contract.version}</p><p className="prewrap">{contract.content}</p></div>}</div>
      <form className="card" onSubmit={submitComplaint}><div className="card-title"><MessageSquareWarning/><h3>File a Complaint</h3></div><label>Category<select name="category"><option>Plumbing</option><option>Electrical</option><option>Noise</option><option>Maintenance</option><option>Other</option></select></label><label>Subject<input name="subject"/></label><label>Description<textarea name="description" rows="4" required placeholder="Describe the concern"/></label><button className="btn secondary">Submit Complaint</button></form>
      <div className="card"><div className="card-title"><Phone/><h3>Landlady Contact</h3></div><p>{landlady.name||"Not configured"}</p><p>{landlady.email||""}</p><p>{landlady.phone||""}</p></div>
    </div>

    <div className="card bill-list"><div className="section-head"><div><div className="eyebrow">Billing</div><h2>My Bills</h2></div><button className="btn secondary" onClick={printList}>Print Bill List</button></div>
      <Table columns={[{key:"period",label:"Month"},{key:"rentDueDate",label:"Rent Due",render:v=>dateLabel(v)},{key:"electricityDueDate",label:"Electricity Due",render:v=>dateLabel(v)},{key:"waterDueDate",label:"Water Due",render:v=>dateLabel(v)},{key:"roomRent",label:"Rent",render:v=>peso(v)},{key:"electricityAmount",label:"Electricity",render:v=>peso(v)},{key:"waterAmount",label:"Water",render:v=>peso(v)},{key:"balance",label:"Current Unpaid",render:v=>peso(v)},{key:"carryover",label:"Prior Unpaid",render:v=>peso(v)},{key:"amountDue",label:"Statement Due",render:v=>peso(v)},{key:"status",label:"Status",render:(_,r)=>billStatus(r)},{key:"actions",label:"Bill",render:(_,r)=><button className="btn secondary" onClick={()=>printOne(r)}>Print Bill</button>}]} rows={bills}/>
      {!bills.length&&<p className="muted">No bills have been issued yet.</p>}
      <p><strong>Total unpaid, including past months: {peso(totalDue)}</strong></p>
    </div>

    {printBill&&<div className="print-statement">
      <div className="bill-print-head"><div><div className="eyebrow">Casa Vicenta</div><h1>Boarder Bill Statement</h1></div><div><strong>Billing month</strong><div>{printBill.period}</div></div></div>
      <div className="print-meta"><div><strong>Boarder</strong><span>{boarder.fullName}</span></div><div><strong>Room</strong><span>{occupancy.roomNumber}</span></div><div><strong>Rent due</strong><span>{dateLabel(printBill.rentDueDate||printBill.dueDate)}</span></div><div><strong>Status</strong><span>{billStatus(printBill)}</span></div></div>
      <table className="statement-table"><thead><tr><th>Charge</th><th>Due</th><th>Billed</th><th>Approved Paid</th><th>Pending Receipt</th><th>Unpaid</th></tr></thead><tbody>
        <tr><td>Rent</td><td>{dateLabel(printBill.rentDueDate||printBill.dueDate)}</td><td>{peso(printBill.roomRent)}</td><td>{peso(printBill.rentPaid)}</td><td>{peso(printBill.rentPending)}</td><td>{peso(printBill.rentDue)}</td></tr>
        <tr><td>Electricity</td><td>{dateLabel(printBill.electricityDueDate)}</td><td>{peso(printBill.electricityAmount)}</td><td>{peso(printBill.electricityPaid)}</td><td>{peso(printBill.electricityPending)}</td><td>{peso(printBill.electricityDue)}</td></tr>
        <tr><td>Water</td><td>{dateLabel(printBill.waterDueDate)}</td><td>{peso(printBill.waterAmount)}</td><td>{peso(printBill.waterPaid)}</td><td>{peso(printBill.waterPending)}</td><td>{peso(printBill.waterDue)}</td></tr>
      </tbody></table>
      <div className="statement-totals"><div><span>Current month unpaid</span><strong>{peso(printBill.balance)}</strong></div><div><span>Previous unpaid carryover</span><strong>{peso(printBill.carryover)}</strong></div><div className="grand-total"><span>Total amount due</span><strong>{peso(printBill.amountDue)}</strong></div></div>
      <p className="tiny">Approved payments reduce the balance immediately. Pending receipts remain subject to admin verification.</p>
    </div>}

    <div className="card"><div className="section-head"><div><div className="eyebrow">History</div><h2>Payment History</h2></div></div><Table columns={[{key:"period",label:"Billing Period"},{key:"paymentType",label:"For",render:v=>title(v)},{key:"amount",label:"Amount",render:v=>peso(v)},{key:"paymentDate",label:"Paid",render:v=>dateLabel(v)},{key:"verifiedAt",label:"Status",render:()=>"Verified"}]} rows={payments}/></div>
    <div className="card"><h2>Payment Notes</h2>{promises?.length?promises.map((n,i)=><p key={i}>{n.note} {n.promisedDate&&<span className="muted">• Promised {dateLabel(n.promisedDate)}</span>}</p>):<p className="muted">No payment notes.</p>}</div>
    <div className="card"><div className="section-head"><div><div className="eyebrow">Requests</div><h2>Complaint History</h2></div></div><Table columns={[{key:"createdAt",label:"Date",render:v=>dateLabel(v?.slice(0,10))},{key:"category",label:"Category"},{key:"subject",label:"Subject"},{key:"status",label:"Status"}]} rows={complaints}/></div>
  </div>;
}
