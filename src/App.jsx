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
  const todayDate = new Date().toLocaleDateString();

  useEffect(() => {
    const q = query(collection(db, "food_logs"), where("user_email", "==", user.email), where("date_string", "==", todayDate));
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user.email]);

  const addLog = async (mealType) => {
    const item = prompt(`What did you eat?`); if (!item) return;
    const qty = prompt("Quantity?"); if (!qty) return;
    await addDoc(collection(db, "food_logs"), { user_email: user.email, meal: mealType, item, quantity: qty, date_string: todayDate, timestamp: serverTimestamp() });
  };

  const deleteLog = async (id) => { if(confirm("Delete?")) await deleteDoc(doc(db, "food_logs", id)); };

  return (
    <div>
      <div className="client-header"><h1>Today's Log</h1><p>{todayDate}</p></div>
      
      <div className="workout-card">
        <div style={{fontWeight:'bold', marginBottom:'10px'}}>💪 Today's Workout</div>
        <textarea style={{width:'100%', background:'#1a1d23', color:'white', padding:'10px', borderRadius:'8px', border:'1px solid #4a5568'}} 
          placeholder="Log training..." value={workout} onChange={e=>setWorkout(e.target.value)} />
      </div>

      {["Breakfast", "Morning Snack", "Lunch", "Evening Snack", "Dinner"].map(meal => (
        <div key={meal} className="meal-section">
          <div className="meal-header">
            <div style={{fontWeight:'bold'}}>{meal}</div>
            <button className="add-btn-small" onClick={() => addLog(meal)}>+</button>
          </div>
          {logs.filter(l => l.meal === meal).map(log => (
            <div key={log.id} className="log-item">
              <div><div>{log.item}</div><div style={{fontSize:'0.8rem', color:'#94a3b8'}}>{log.quantity}</div></div>
              <button className="icon-btn" onClick={() => deleteLog(log.id)} style={{color:'#ef4444'}}>🗑️</button>
            </div>
          ))}
        </div>
      ))}
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
  return (
    <div>
      <div className="client-header"><h1>Profile</h1></div>
      <div style={{padding:'30px', textAlign:'center'}}>
        <div style={{fontSize:'3rem', marginBottom:'10px'}}>👤</div>
        <h2>{user.displayName}</h2>
        <div style={{background:'#2d3748', padding:'15px', borderRadius:'8px', margin:'20px 0'}}>
          <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>CURRENT PHASE</div>
          <div style={{color:'#5daca5', fontWeight:'bold'}}>{phaseInfo.name}</div>
        </div>
        <button className="mission-btn" style={{background:'transparent', border:'1px solid #ef4444', color:'#ef4444'}} onClick={() => signOut(auth)}>Sign Out</button>
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
  
  useEffect(() => {
    const q = query(collection(db, "food_logs"), where("user_email", "==", client.email));
    const unsub = onSnapshot(q, (snap) => {
      const d = snap.docs.map(doc => ({id:doc.id, ...doc.data()}));
      d.sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));
      setLogs(d);
    });
    return () => unsub();
  }, [client]);

  const changePhase = async (dir) => {
    const next = (client.currentPhase || 1) + dir;
    if(next < 1 || next > 6) return;
    if(confirm(`Move to Phase ${next}?`)) await updateDoc(doc(db, "users", client.email), { currentPhase: next, celebratePromotion: dir===1 });
  };

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
      {/* STATIC INFO CARD (Never Scrolls) */}
      <div style={{padding:'15px', background:'#252a33', borderBottom:'1px solid #334155', flexShrink: 0}}>
        <div style={{color:'#94a3b8', fontSize:'0.8rem'}}>PHASE: {PHASES[client.currentPhase||1].name}</div>
        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
          <button onClick={() => changePhase(1)} className="mission-btn" style={{margin:0, flex:1, background:'#eab308'}}>Promote</button>
          <button onClick={() => changePhase(-1)} className="mission-btn" style={{margin:0, flex:1, background:'#ef4444'}}>Demote</button>
        </div>
      </div>

      {/* STATIC TABS (Never Scrolls) */}
      <div style={{display:'flex', borderBottom:'1px solid #334155', flexShrink: 0}}>
        <button onClick={() => setActiveTab('logs')} style={{flex:1, padding:'15px', background: activeTab==='logs'?'#2d3748':'transparent', color:'white', border:'none'}}>Logs</button>
        <button onClick={() => setActiveTab('chat')} style={{flex:1, padding:'15px', background: activeTab==='chat'?'#2d3748':'transparent', color:'white', border:'none'}}>Chat</button>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      {activeTab === 'logs' && (
        <div style={{flex:1, overflowY:'auto', padding:'15px'}}>
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