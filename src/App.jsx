import { useEffect, useState } from "react";
import ThemeToggle from "./components/ThemeToggle";
import PublicWebsite from "./pages/PublicWebsite";
import ApplicationForm from "./pages/ApplicationForm";
import ApplicantRequest from "./pages/ApplicantRequest";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import BoarderDashboard from "./pages/BoarderDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { api, isDemoMode } from "./lib/api";

function publicPageFromPath() {
  if (isDemoMode) return window.location.hash === "#applicant-request" ? "applicant-request" : "home";
  return window.location.pathname === "/applicant-request" ? "applicant-request" : "home";
}

const demoUsers = {
  admin: { id: 1, fullName: "Demo Admin", email: "admin@demo.local", phone: null, role: "admin", mustChangePassword: false, status: "active" },
  boarder: { id: 11, fullName: "Jamie Santos", email: "boarder@demo.local", phone: "09170000011", role: "boarder", mustChangePassword: false, status: "active" }
};

export default function App(){
  const [page,setPage]=useState(publicPageFromPath);
  const [user,setUser]=useState(null);
  const [theme,setTheme]=useState(localStorage.getItem("theme")||"light");

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    localStorage.setItem("theme",theme)
  },[theme]);

  useEffect(()=>{
    api("/api/auth/me")
      .then(({user})=>{
        if(user){
          setUser(user);
          setPage(user.mustChangePassword?"change-password":user.role)
        }
      })
      .catch(()=>{})
  },[]);

  useEffect(()=>{
    const onPopState=()=>{
      if(!user) setPage(publicPageFromPath());
    };
    window.addEventListener("popstate",onPopState);
    return ()=>window.removeEventListener("popstate",onPopState);
  },[user]);

  function navigate(next){
    if(isDemoMode){
      if(next==="applicant-request") window.location.hash="applicant-request";
      else if(["home","apply","login"].includes(next) && window.location.hash) window.history.replaceState({},"",window.location.pathname+window.location.search);
    } else if(next==="applicant-request"){
      if(window.location.pathname!=="/applicant-request") window.history.pushState({},"","/applicant-request");
    } else if(["home","apply","login"].includes(next)){
      if(window.location.pathname!=="/") window.history.pushState({},"","/");
    }
    setPage(next);
  }

  function enterDemo(role){
    const demoUser=demoUsers[role];
    setUser(demoUser);
    setPage(role);
  }

  function authenticated(nextUser){
    setUser(nextUser);
    setPage(nextUser.mustChangePassword?"change-password":nextUser.role)
  }

  function goToProfile(){
    if(!user){
      navigate("login");
      return;
    }
    setPage(user.mustChangePassword?"change-password":user.role);
  }

  function passwordChanged(nextUser){
    if(nextUser){
      setUser(nextUser);
      setPage(nextUser.role);
      return;
    }
    setUser(null);
    navigate("login");
  }

  async function logout(){
    try{await api("/api/auth/logout",{method:"POST"})}catch{}
    setUser(null);
    navigate("home")
  }

  return <div className="app">
    <header className="topbar">
      <button className="brand" onClick={()=>navigate("home")}>
        <span className="logo">CV</span>
        <span>
          <strong>Casa Vicenta</strong>
          <small>Boarder Management System</small>
        </span>
      </button>

      <div className="top-actions">
        <button className="text-btn" onClick={()=>navigate("home")}>Website</button>
        {isDemoMode&&<>
          <span className="demo-badge">Portfolio Demo</span>
          <button className="text-btn demo-role" onClick={()=>enterDemo("admin")}>Admin Demo</button>
          <button className="text-btn demo-role" onClick={()=>enterDemo("boarder")}>Boarder Demo</button>
        </>}
        {user
          ?<>
            <button className="text-btn" onClick={goToProfile}>Profile</button>
            <button className="text-btn" onClick={logout}>Logout</button>
          </>
          :!isDemoMode&&<button className="text-btn" onClick={()=>navigate("login")}>Login</button>
        }
        <ThemeToggle theme={theme} onToggle={()=>setTheme(theme==="light"?"dark":"light")}/>
      </div>
    </header>

    {isDemoMode&&<div className="demo-switcher">
      <div><strong>Portfolio demo</strong><span>Sample data only. Actions are simulated.</span></div>
      <div className="actions"><button className="btn secondary small" onClick={()=>navigate("home")}>Public Site</button><button className="btn secondary small" onClick={()=>enterDemo("boarder")}>Boarder Demo</button><button className="btn primary small" onClick={()=>enterDemo("admin")}>Admin Demo</button></div>
    </div>}

    {page==="home"&&<PublicWebsite onNavigate={navigate} user={user} onProfile={goToProfile}/>} 
    {page==="apply"&&<ApplicationForm onNavigate={navigate}/>} 
    {page==="applicant-request"&&<ApplicantRequest onNavigate={navigate}/>} 
    {page==="login"&&<LoginPage onNavigate={navigate} onAuthenticated={authenticated}/>} 
    {page==="change-password"&&<ChangePasswordPage onChanged={passwordChanged}/>} 
    {page==="boarder"&&user?.role==="boarder"&&<BoarderDashboard/>} 
    {page==="admin"&&user?.role==="admin"&&<AdminDashboard/>} 
  </div>
}
