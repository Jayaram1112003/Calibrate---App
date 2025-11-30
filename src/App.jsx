import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, onSnapshot, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import './App.css';

// --- CONFIGURATION ---
// !!! PASTE YOUR FIREBASE KEYS HERE !!!
const firebaseConfig = {
  apiKey: "AIzaSyBcMz0Y1ivVDLVrZ4CrL28LkiDThmsnBXE",
  authDomain: "calibrate-diet-app.firebaseapp.com",
  projectId: "calibrate-diet-app",
  storageBucket: "calibrate-diet-app.firebasestorage.app",
  messagingSenderId: "638688646370",
  appId: "1:638688646370:web:8f499c64174f773198babb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const PHASES = {
  1: { name: "Phase 1: The Audit", days: "7-10 days" },
  2: { name: "Phase 2: The Subtraction", days: "10 days" },
  3: { name: "Phase 3: NEAT Optimization", days: "15 days" },
  4: { name: "Phase 4: Lifestyle Integration", days: "15 days" },
  5: { name: "Phase 5: Autopilot", days: "Forever" },
  6: { name: "Phase 6: Exit Protocol", days: "15 days" }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.email);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);
          setUser(currentUser);
          if (data.celebratePromotion) {
            triggerCelebration();
            await updateDoc(userRef, { celebratePromotion: false });
          }
        } else {
          setUserData({ role: 'unauthorized' });
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const triggerCelebration = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  if (loading) return <div style={{padding:'20px', color:'white'}}>Loading...</div>;
  if (!user) return <LoginPage />;
  if (userData?.role === 'unauthorized') return <UnauthorizedPage email={user.email} />;
  
  // ROUTING
  if (userData?.role === 'client') return <ClientApp user={user} userData={userData} />;
  if (userData?.role === 'coach' || userData?.role === 'owner') return <CoachApp user={user} />;
  return null;
}

// --- SHARED LOGIN PAGES ---
function LoginPage() {
  return (
    <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#1a1d23'}}>
      <div style={{textAlign:'center'}}>
        <h1 style={{color:'white'}}>Calibrate</h1>
        <button className="mission-btn" onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}>Sign in with Google</button>
      </div>
    </div>
  );
}

function UnauthorizedPage({ email }) {
  return (
    <div style={{padding:'40px', textAlign:'center', color:'white'}}>
      <h2>Access Denied</h2>
      <p>{email} is not registered.</p>
      <button className="mission-btn" onClick={() => signOut(auth)} style={{background:'#ef4444'}}>Logout</button>
    </div>
  );
}

// ==========================================
// CLIENT APP (Revised Layout)
// ==========================================
function ClientApp({ user, userData }) {
  const [tab, setTab] = useState('home'); 
  const currentPhaseId = userData.currentPhase || 1;
  const phaseInfo = PHASES[currentPhaseId] || PHASES[1];

  return (
    <div className="client-container">
      {/* Scrollable Content Area */}
      <div className="client-content">
        {tab === 'home' && <ClientHome user={user} phaseInfo={phaseInfo} setTab={setTab} />}
        {tab === 'log' && <ClientLog user={user} />}
        {tab === 'coach' && <ClientChat user={user} />}
        {tab === 'profile' && <ClientProfile user={user} phaseInfo={phaseInfo} />}
      </div>
      
      {/* Fixed Bottom Nav */}
      <div className="bottom-nav">
        <NavBtn label="Home" active={tab === 'home'} onClick={() => setTab('home')}>🏠</NavBtn>
        <NavBtn label="Log" active={tab === 'log'} onClick={() => setTab('log')}>📝</NavBtn>
        <NavBtn label="Coach" active={tab === 'coach'} onClick={() => setTab('coach')}>💬</NavBtn>
        <NavBtn label="Profile" active={tab === 'profile'} onClick={() => setTab('profile')}>👤</NavBtn>
      </div>
    </div>
  );
}

function NavBtn({ label, active, onClick, children }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span style={{fontSize:'1.4rem'}}>{children}</span>
      <span>{label}</span>
    </button>
  );
}

function ClientHome({ user, phaseInfo, setTab }) {
  return (
    <div>
      <div className="client-header">
        <h1>Calibrate</h1>
        <p>{phaseInfo.name}</p>
      </div>
      
      <div className="welcome-card">
        <h2>Good Morning!</h2>
        <p>Ready to crush your goals?</p>
        <div style={{marginTop:'15px', padding:'15px', background:'#2d3748', borderRadius:'8px', textAlign:'center', border:'1px solid #334155'}}>
           <div style={{fontSize:'1.5rem'}}>🍴</div>
           <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>MEALS</div>
           <div style={{fontWeight:'bold'}}>Check Log Tab</div>
        </div>
      </div>

      <div className="mission-card">
        <div style={{fontSize:'0.8rem', opacity:0.8}}>CURRENT MISSION</div>
        <h3>{phaseInfo.name}</h3>
        <p>Stick to the plan.</p>
        <button className="mission-btn" onClick={() => setTab('log')}>+ Log Meal</button>
      </div>
    </div>
  );
}

function ClientLog({ user }) {
  const [logs, setLogs] = useState([]);
  const [workout, setWorkout] = useState("");
  const [workoutId, setWorkoutId] = useState(null);
  
  // NEW: Track which date the user is looking at (Default = Today)
  const [viewDate, setViewDate] = useState(new Date());

  // Helper to format date consistent with DB
  const getFormattedDate = (dateObj) => dateObj.toLocaleDateString();
  const viewDateString = getFormattedDate(viewDate);
  const isToday = viewDateString === new Date().toLocaleDateString();

  // Helper to change date
  const changeDate = (days) => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + days);
    setViewDate(newDate);
  };

  useEffect(() => {
    // 1. Query Foods for SELECTED date
    const q = query(
      collection(db, "food_logs"), 
      where("user_email", "==", user.email), 
      where("date_string", "==", viewDateString)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // 2. Query Workout for SELECTED date
    const wQ = query(
      collection(db, "workouts"), 
      where("user_email", "==", user.email), 
      where("date_string", "==", viewDateString)
    );
    const unsubW = onSnapshot(wQ, (snapshot) => {
      if(!snapshot.empty) {
        setWorkout(snapshot.docs[0].data().text);
        setWorkoutId(snapshot.docs[0].id);
      } else {
        setWorkout(""); // Clear input if no workout found for that day
        setWorkoutId(null);
      }
    });

    return () => { unsub(); unsubW(); };
  }, [user.email, viewDateString]); // Re-run when date changes

  const saveWorkout = async () => {
    if(!workout.trim()) return; 
    // Save to the VIEWED date, not necessarily today
    if(!workoutId) {
      await addDoc(collection(db, "workouts"), { 
        user_email: user.email, 
        text: workout, 
        date_string: viewDateString, 
        timestamp: serverTimestamp() 
      });
    } else {
      await updateDoc(doc(db, "workouts", workoutId), { text: workout });
    }
  };

  const addLog = async (mealType) => {
    const item = prompt(`Add ${mealType} for ${viewDateString}?`); if (!item) return;
    const qty = prompt("Quantity?"); if (!qty) return;
    
    // Save to the VIEWED date
    await addDoc(collection(db, "food_logs"), { 
      user_email: user.email, 
      meal: mealType, 
      item, 
      quantity: qty, 
      date_string: viewDateString, 
      timestamp: serverTimestamp() 
    });
  };

  const deleteLog = async (id) => { if(confirm("Delete this item?")) await deleteDoc(doc(db, "food_logs", id)); };
  
  const editLog = async (log) => {
    const newItem = prompt("Update Item:", log.item); if(!newItem) return;
    const newQty = prompt("Update Qty:", log.quantity); if(!newQty) return;
    await updateDoc(doc(db, "food_logs", log.id), { item: newItem, quantity: newQty });
  };

  return (
    <div>
      {/* HEADER WITH DATE NAVIGATION */}
      <div className="client-header">
        <div className="date-nav-header">
          <button className="nav-arrow-btn" onClick={() => changeDate(-1)}>◀</button>
          <div style={{textAlign:'center'}}>
            <h1 style={{fontSize:'1.2rem'}}>{isToday ? "Today's Log" : viewDateString}</h1>
            {!isToday && <p style={{fontSize:'0.7rem', color:'#94a3b8', margin:0}}>History View</p>}
          </div>
          <button className="nav-arrow-btn" onClick={() => changeDate(1)}>▶</button>
        </div>
      </div>
      
      {/* WORKOUT CARD */}
      <div className="workout-card">
        <div style={{fontWeight:'bold', marginBottom:'10px'}}>
          💪 Workout ({isToday ? "Today" : viewDateString})
        </div>
        <textarea 
          style={{width:'100%', background:'#1a1d23', color:'white', padding:'10px', borderRadius:'8px', border:'1px solid #4a5568'}} 
          rows="3"
          placeholder="Log training..." 
          value={workout} 
          onChange={e=>setWorkout(e.target.value)} 
          onBlur={saveWorkout}
        />
      </div>

      {/* MEAL SECTIONS */}
      <div style={{paddingBottom:'20px'}}>
        {["Breakfast", "Morning Snack", "Lunch", "Evening Snack", "Dinner"].map(meal => {
          const loggedItems = logs.filter(l => l.meal === meal);
          return (
            <div key={meal} className="meal-section">
              <div className="meal-header">
                <div className="meal-title">{meal.includes("Snack") ? "☕" : "🍽️"} {meal}</div>
                <button className="add-btn-small" onClick={() => addLog(meal)}>+</button>
              </div>
              <div>
                {loggedItems.length === 0 ? <div style={{fontStyle:'italic', color:'#64748b', fontSize:'0.9rem'}}>No items</div> : 
                  loggedItems.map(log => (
                    <div key={log.id} className="log-item">
                      <div><div style={{fontWeight:'500'}}>{log.item}</div><div style={{fontSize:'0.85rem', color:'#94a3b8'}}>{log.quantity}</div></div>
                      <div style={{display:'flex', gap:'10px'}}>
                        <button className="icon-btn" onClick={() => editLog(log)}>✏️</button>
                        <button className="icon-btn" style={{color:'#ef4444'}} onClick={() => deleteLog(log.id)}>🗑️</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientChat({ user }) {
  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
      <div className="client-header"><h1>Coach Chat</h1></div>
      <div style={{flex:1, padding:'15px', display:'flex', flexDirection:'column'}}>
         <ChatInterface currentUserEmail={user.email} chatPath={`users/${user.email}/messages`} />
      </div>
    </div>
  );
}

function ClientProfile({ user, phaseInfo }) {
  
  // NEW: Function to generate Word Doc
  const downloadReport = async () => {
    if(!window.confirm("Download your full food history?")) return;

    // 1. Fetch ALL logs for this user
    const q = query(collection(db, "food_logs"), where("user_email", "==", user.email));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => d.data());

    // 2. Sort by Date (Newest first) -> Then by Time
    data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

    // 3. Group by Date -> Then by Meal
    const grouped = {};
    data.forEach(log => {
      if (!grouped[log.date_string]) grouped[log.date_string] = {};
      if (!grouped[log.date_string][log.meal]) grouped[log.date_string][log.meal] = [];
      grouped[log.date_string][log.meal].push(log);
    });

    // 4. Build HTML String (This becomes the Word Doc)
    let docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title>
      <style>
        body { font-family: Arial, sans-serif; }
        h1 { color: #2d3748; font-size: 24px; }
        .date-header { background: #5daca5; color: white; padding: 5px 10px; font-weight: bold; margin-top: 20px; }
        .meal-header { color: #2d3748; font-weight: bold; margin-top: 10px; text-decoration: underline; }
        li { margin-bottom: 5px; }
      </style>
      </head><body>
      <h1>Calibrate Food Log</h1>
      <p><b>Client:</b> ${user.displayName || user.email}<br/><b>Generated:</b> ${new Date().toLocaleDateString()}</p>
      <hr/>
    `;

    // Loop through dates
    const MEAL_ORDER = ["Breakfast", "Morning Snack", "Lunch", "Evening Snack", "Dinner"];
    
    // Sort dates descending (Newest on top) but we want the doc to read logically? 
    // Usually newest first is better for checking recent progress.
    const sortedDates = Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a));

    sortedDates.forEach(date => {
      docContent += `<div class='date-header'>📅 ${date}</div>`;
      
      const meals = grouped[date];
      MEAL_ORDER.forEach(meal => {
        if (meals[meal]) {
          docContent += `<div class='meal-header'>${meal}</div><ul>`;
          meals[meal].forEach(item => {
            docContent += `<li><b>${item.item}</b> - ${item.quantity}</li>`;
          });
          docContent += `</ul>`;
        }
      });
    });

    docContent += "</body></html>";

    // 5. Trigger Download
    const blob = new Blob(['\ufeff', docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Filename: Calibrate_Log_11-29-2025.doc
    link.download = `Calibrate_Log_${new Date().toLocaleDateString().replace(/\//g, '-')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="client-header"><h1>Profile</h1></div>
      <div style={{padding:'30px', textAlign:'center'}}>
        <div style={{width:'80px', height:'80px', background:'#2d3748', borderRadius:'50%', margin:'0 auto 15px auto', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem'}}>👤</div>
        <h2>{user.displayName}</h2>
        <p style={{color:'#94a3b8'}}>{user.email}</p>
        
        <div style={{margin:'20px 0', padding:'15px', background:'#2d3748', borderRadius:'8px', border:'1px solid #334155'}}>
          <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>CURRENT PHASE</div>
          <div style={{color:'#5daca5', fontWeight:'bold', fontSize:'1.1rem'}}>{phaseInfo.name}</div>
        </div>

        {/* NEW: Download Button */}
        <button 
          onClick={downloadReport} 
          className="mission-btn" 
          style={{background:'#4a5568', marginBottom:'15px', border:'none'}}
        >
          📄 Download My Logs (.doc)
        </button>

        <button onClick={() => signOut(auth)} style={{background:'transparent', border:'1px solid #ef4444', color:'#ef4444', padding:'10px 30px', borderRadius:'20px', cursor:'pointer', width:'100%'}}>Sign Out</button>
      </div>
    </div>
  );
}

// ==========================================
// COACH APP (Revised Layout)
// ==========================================
// --- COACH APP (Fixed Scrolling) ---
function CoachApp({ user }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "client"));
    const unsub = onSnapshot(q, (snap) => setClients(snap.docs.map(d => ({ email: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const handleSelect = (e) => {
    const client = clients.find(c => c.email === e.target.value);
    setSelectedClient(client || null);
  };

  return (
    <div className="coach-container">
      {/* HEADER */}
      <div className="coach-header">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h1>Coach Dashboard</h1>
          <button onClick={() => signOut(auth)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}}>🚪</button>
        </div>
        <select style={{width:'100%', padding:'10px', marginTop:'10px', background:'#1a1d23', color:'white', border:'1px solid #4a5568', borderRadius:'5px'}} 
          onChange={handleSelect} value={selectedClient?.email || ""}>
          <option value="">-- Select Client --</option>
          {clients.map(c => <option key={c.email} value={c.email}>{c.email}</option>)}
        </select>
      </div>

      {/* BODY - NOW LOCKED (No Outer Scroll) */}
      <div className="coach-scroll-area" style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
        {selectedClient ? <CoachClientDetail client={selectedClient} coachEmail={user.email} /> : 
          <div style={{padding:'50px', textAlign:'center', color:'#64748b'}}>Select a client to begin</div>
        }
      </div>
    </div>
  );
}

function CoachClientDetail({ client, coachEmail }) {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [workout, setWorkout] = useState("No workout");
  
  // Standard meal order for the report
  const MEAL_ORDER = ["Breakfast", "Morning Snack", "Lunch", "Evening Snack", "Dinner"];

  useEffect(() => {
    // 1. Fetch Logs
    const q = query(collection(db, "food_logs"), where("user_email", "==", client.email));
    const unsub = onSnapshot(q, (snap) => {
      const d = snap.docs.map(doc => ({id:doc.id, ...doc.data()}));
      d.sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));
      setLogs(d);
    });
    
    // 2. Fetch Today's Workout
    const today = new Date().toLocaleDateString();
    const wQ = query(collection(db, "workouts"), where("user_email", "==", client.email), where("date_string", "==", today));
    const unsubW = onSnapshot(wQ, (snap) => {
      if(!snap.empty) setWorkout(snap.docs[0].data().text);
      else setWorkout("No workout logged today");
    });

    return () => { unsub(); unsubW(); };
  }, [client]);

  const changePhase = async (dir) => {
    const next = (client.currentPhase || 1) + dir;
    if(next < 1 || next > 6) return;
    if(confirm(`Move to Phase ${next}?`)) await updateDoc(doc(db, "users", client.email), { currentPhase: next, celebratePromotion: dir===1 });
  };

  // --- NEW: Word Document Download Logic ---
  const downloadLogs = () => {
    if(!window.confirm(`Download report for ${client.email}?`)) return;

    // 1. Sort logs by Date (Newest First)
    const sortedLogs = [...logs].sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));

    // 2. Group by Date -> Then by Meal
    const grouped = {};
    sortedLogs.forEach(log => {
      if (!grouped[log.date_string]) grouped[log.date_string] = {};
      if (!grouped[log.date_string][log.meal]) grouped[log.date_string][log.meal] = [];
      grouped[log.date_string][log.meal].push(log);
    });

    // 3. Build HTML String (Word Doc Format)
    let docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Coach Report</title>
      <style>
        body { font-family: Arial, sans-serif; }
        h1 { color: #2d3748; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
        .date-header { background: #e2e8f0; color: #1a202c; padding: 8px; font-weight: bold; margin-top: 20px; border-left: 5px solid #5daca5; }
        .meal-header { color: #2d3748; font-weight: bold; margin-top: 10px; text-decoration: underline; }
        li { margin-bottom: 5px; }
        .qty { color: #5daca5; font-weight: bold; }
      </style>
      </head><body>
      <h1>Calibrate Client Report</h1>
      <div class='meta'>
        <b>Client:</b> ${client.email}<br/>
        <b>Current Phase:</b> ${PHASES[client.currentPhase || 1].name}<br/>
        <b>Generated:</b> ${new Date().toLocaleString()}
      </div>
      <hr/>
    `;

    // Iterate through dates
    Object.keys(grouped).forEach(date => {
      docContent += `<div class='date-header'>📅 ${date}</div>`;
      const meals = grouped[date];
      MEAL_ORDER.forEach(meal => {
        if (meals[meal]) {
          docContent += `<div class='meal-header'>${meal}</div><ul>`;
          meals[meal].forEach(item => {
            docContent += `<li>${item.item} - <span class='qty'>${item.quantity}</span></li>`;
          });
          docContent += `</ul>`;
        }
      });
    });

    docContent += "</body></html>";

    // 4. Trigger Download
    const blob = new Blob(['\ufeff', docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${client.email}_Full_Report.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
      {/* INFO CARD */}
      <div style={{padding:'15px', background:'#252a33', borderBottom:'1px solid #334155', flexShrink:0}}>
        <div style={{color:'#94a3b8', fontSize:'0.8rem'}}>CURRENT PHASE</div>
        <div style={{fontSize:'1.1rem', fontWeight:'bold', marginBottom:'10px'}}>{PHASES[client.currentPhase||1].name}</div>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={() => changePhase(1)} className="mission-btn" style={{margin:0, flex:1, background:'#eab308'}}>Promote</button>
          <button onClick={() => changePhase(-1)} className="mission-btn" style={{margin:0, flex:1, background:'#ef4444'}}>Demote</button>
          <button onClick={downloadLogs} className="mission-btn" style={{margin:0, flex:1, background:'#4a5568'}}>Download</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:'flex', borderBottom:'1px solid #334155', flexShrink:0}}>
        <button onClick={() => setActiveTab('logs')} style={{flex:1, padding:'15px', background: activeTab==='logs'?'#2d3748':'transparent', color: activeTab==='logs'?'#5daca5':'#94a3b8', border:'none', fontWeight:'bold'}}>Logs</button>
        <button onClick={() => setActiveTab('chat')} style={{flex:1, padding:'15px', background: activeTab==='chat'?'#2d3748':'transparent', color: activeTab==='chat'?'#5daca5':'#94a3b8', border:'none', fontWeight:'bold'}}>Chat</button>
      </div>

      {/* CONTENT AREA */}
      {activeTab === 'logs' && (
        <div style={{flex:1, overflowY:'auto', padding:'15px'}}>
          <div style={{background:'#2d3748', padding:'10px', borderRadius:'8px', marginBottom:'20px'}}>
             <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>TODAY'S WORKOUT</div>
             <div style={{whiteSpace:'pre-wrap'}}>{workout}</div>
          </div>
          <h3 style={{marginTop:0, color:'#94a3b8'}}>History</h3>
          {logs.map(l => (
            <div key={l.id} className="log-item">
              <div>{l.item}</div><div style={{color:'#5daca5'}}>{l.quantity}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'chat' && (
        <div style={{flex:1, overflow:'hidden', padding:'15px', display:'flex', flexDirection:'column'}}>
           <ChatInterface currentUserEmail={coachEmail} chatPath={`users/${client.email}/messages`} />
        </div>
      )}
    </div>
  );
}

// --- SHARED CHAT ---
function ChatInterface({ currentUserEmail, chatPath }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const dummyDiv = useRef(null);

  useEffect(() => {
    const q = query(collection(db, chatPath));
    const unsub = onSnapshot(q, (snap) => {
      const m = snap.docs.map(d => ({id:d.id, ...d.data()}));
      m.sort((a,b) => (a.timestamp?.seconds||0) - (b.timestamp?.seconds||0));
      setMessages(m);
      // FIX: 'nearest' prevents the whole page from jumping up
      setTimeout(() => dummyDiv.current?.scrollIntoView({behavior:'smooth', block:'nearest'}), 100);
    });
    return () => unsub();
  }, [chatPath]);

  const send = async () => {
    if(!input.trim()) return;
    await addDoc(collection(db, chatPath), { text: input, sender: currentUserEmail, timestamp: serverTimestamp(), isDeleted: false });
    setInput("");
  };

  const deleteMsg = async (id) => { if(confirm("Delete?")) await updateDoc(doc(db, chatPath, id), { text: "🚫 Deleted", isDeleted: true }); };

  return (
    <div className="chat-window" style={{height:'100%'}}>
      <div className="messages-area">
        {messages.map(m => {
          const isMine = m.sender === currentUserEmail;
          return (
            <div key={m.id} className={`msg-row ${isMine?'mine':'theirs'}`}>
              {isMine && !m.isDeleted && <button className="delete-btn-outside" onClick={() => deleteMsg(m.id)}>🗑️</button>}
              <div className={`message-bubble ${isMine?'msg-mine':'msg-theirs'}`} style={m.isDeleted?{opacity:0.5}:{}}>{m.text}</div>
            </div>
          );
        })}
        <div ref={dummyDiv}></div>
      </div>
      <div className="chat-input-area">
        <input className="chat-input" value={input} onChange={e=>setInput(e.target.value)} placeholder="Type..." onKeyDown={e=>e.key==='Enter'&&send()} />
        <button onClick={send} style={{background:'#5daca5', border:'none', borderRadius:'50%', width:'35px', height:'35px', color:'white'}}>➤</button>
      </div>
    </div>
  );
}