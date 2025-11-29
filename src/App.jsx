import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, 
  onSnapshot, serverTimestamp, deleteDoc, updateDoc, setDoc 
} from 'firebase/firestore';
import confetti from 'canvas-confetti'; // Requires: npm install canvas-confetti
import './App.css';

// --- CONFIGURATION ---
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

// --- PHASES DATA ---
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
  const [userData, setUserData] = useState(null); // stores db role, phase, etc.
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
          
          // CHECK FOR PROMOTION CELEBRATION
          if (data.celebratePromotion) {
            triggerCelebration();
            // Turn off the flag so it doesn't celebrate every time
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
    var duration = 3 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999 };

    var interval = setInterval(function() {
      var timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      var particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
    }, 250);
  };

  if (loading) return <div style={{padding:'20px', color:'white'}}>Loading Calibrate...</div>;
  if (!user) return <LoginPage />;
  if (userData?.role === 'unauthorized') return <UnauthorizedPage email={user.email} />;
  
  if (userData?.role === 'client') return <ClientApp user={user} userData={userData} />;
  if (userData?.role === 'coach' || userData?.role === 'owner') return <CoachApp user={user} />;
  return null;
}

// --- PAGES ---

function LoginPage() {
  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  return (
    <div className="app-container" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{textAlign:'center', padding:'20px'}} className="animate-page">
        <h1 style={{color:'white'}}>Calibrate</h1>
        <p style={{color:'#94a3b8'}}>Diet Coaching App</p>
        <button className="mission-btn" onClick={login}>Sign in with Google</button>
      </div>
    </div>
  );
}

function UnauthorizedPage({ email }) {
  return (
    <div className="app-container" style={{padding:'40px', textAlign:'center'}}>
      <h2>Access Restricted</h2>
      <p>The email {email} is not in our system.</p>
      <button className="mission-btn" onClick={() => signOut(auth)}>Logout</button>
    </div>
  );
}

// --- CLIENT APP ---
function ClientApp({ user, userData }) {
  const [tab, setTab] = useState('home'); 
  // Current Phase Info (Default to 1 if missing)
  const currentPhaseId = userData.currentPhase || 1;
  const phaseInfo = PHASES[currentPhaseId] || PHASES[1];

  return (
    <div className="app-container">
      {tab === 'home' && <ClientHome user={user} phaseInfo={phaseInfo} setTab={setTab} />}
      {tab === 'log' && <ClientLog user={user} />}
      {tab === 'coach' && <ClientChat user={user} />}
      {tab === 'profile' && <ClientProfile user={user} phaseInfo={phaseInfo} />}
      
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
      <span style={{fontSize:'1.5rem', marginBottom:'2px'}}>{children}</span>
      <span>{label}</span>
    </button>
  );
}

function ClientHome({ user, phaseInfo, setTab }) {
  const [greeting, setGreeting] = useState("Good Morning!");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) setGreeting("Good Morning!");
    else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon!");
    else if (hour >= 17 && hour < 23) setGreeting("Good Evening!");
    else setGreeting("Go to sleep, Improve your health :)");
  }, []);

  return (
    <div className="animate-page">
      <div className="top-header">
        <h1>Calibrate</h1>
        <p>{phaseInfo.name}</p>
      </div>
      
      <div className="welcome-card">
        <h2>{greeting}</h2>
        <p style={{color:'#94a3b8'}}>Ready to crush your goals today?</p>
        
        <div className="stat-card" style={{justifyContent:'center', textAlign:'center'}}>
           <span style={{fontSize:'1.5rem'}}>🍴</span>
           <div>
             <div style={{fontSize:'0.7rem', color:'#94a3b8'}}>TODAY'S LOGS</div>
             <div style={{fontWeight:'bold'}}>Check Log Tab</div>
           </div>
        </div>
      </div>

      <div className="mission-card">
        <div style={{fontSize:'0.8rem', opacity:0.8, marginBottom:'5px'}}>CURRENT MISSION</div>
        <h3 style={{margin:'0 0 10px 0'}}>{phaseInfo.name}</h3>
        <p style={{fontSize:'0.9rem', lineHeight:'1.4', color:'#cbd5e1'}}>
          Focus for the next {phaseInfo.days}. Stick to the plan.
        </p>
        <button className="mission-btn" onClick={() => setTab('log')}>+ Log Meal</button>
      </div>
    </div>
  );
}

function ClientLog({ user }) {
  const [logs, setLogs] = useState([]);
  const [workout, setWorkout] = useState("");
  const [workoutId, setWorkoutId] = useState(null);
  
  const todayDate = new Date().toLocaleDateString();

  useEffect(() => {
    // Fetch Food Logs
    const q = query(collection(db, "food_logs"), where("user_email", "==", user.email), where("date_string", "==", todayDate));
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Workout Log
    const wQ = query(collection(db, "workouts"), where("user_email", "==", user.email), where("date_string", "==", todayDate));
    const unsubW = onSnapshot(wQ, (snapshot) => {
      if(!snapshot.empty) {
        setWorkout(snapshot.docs[0].data().text);
        setWorkoutId(snapshot.docs[0].id);
      }
    });

    return () => { unsub(); unsubW(); };
  }, [user.email, todayDate]);

  const saveWorkout = async () => {
    if(!workoutId) {
      await addDoc(collection(db, "workouts"), {
        user_email: user.email, text: workout, date_string: todayDate, timestamp: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, "workouts", workoutId), { text: workout });
    }
    alert("Workout Saved!");
  };

  const addLog = async (mealType) => {
    const item = prompt(`What did you eat for ${mealType}?`);
    if (!item) return;
    const qty = prompt("How much? (e.g. 1 bowl)");
    if (!qty) return;
    await addDoc(collection(db, "food_logs"), {
      user_email: user.email, meal: mealType, item, quantity: qty, date_string: todayDate, timestamp: serverTimestamp()
    });
  };

  const deleteLog = async (id) => {
    if(window.confirm("Delete this item?")) await deleteDoc(doc(db, "food_logs", id));
  };
  
  const editLog = async (log) => {
    const newItem = prompt("Update Item Name:", log.item); if (!newItem) return;
    const newQty = prompt("Update Quantity:", log.quantity); if (!newQty) return;
    await updateDoc(doc(db, "food_logs", log.id), { item: newItem, quantity: newQty });
  };

  return (
    <div className="animate-page">
      <div className="top-header">
        <h1>Today's Log</h1>
        <p>{todayDate}</p>
      </div>

      <div className="workout-card">
        <div style={{fontWeight:'bold'}}>💪 Today's Workout</div>
        <textarea 
          className="workout-input" 
          rows="3"
          placeholder="What training did you do today?"
          value={workout}
          onChange={(e) => setWorkout(e.target.value)}
          onBlur={saveWorkout} // Saves when they click away
        />
      </div>

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
  const chatPath = `users/${user.email}/messages`;
  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}} className="animate-page">
      <div className="top-header"><h1>Coach Chat</h1></div>
      <div style={{padding:'20px', flex:1, display:'flex', flexDirection:'column'}}>
        <ChatInterface currentUserEmail={user.email} chatPath={chatPath} />
      </div>
    </div>
  );
}

function ClientProfile({ user, phaseInfo }) {
  return (
    <div className="animate-page">
      <div className="top-header"><h1>Profile</h1></div>
      <div style={{padding:'20px', textAlign:'center'}}>
        <div style={{width:'80px', height:'80px', background:'#2d3748', borderRadius:'50%', margin:'0 auto 15px auto', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem'}}>👤</div>
        <h2>{user.displayName}</h2>
        <p style={{color:'#94a3b8'}}>{user.email}</p>
        <div style={{margin:'20px 0', padding:'10px', background:'#2d3748', borderRadius:'8px'}}>
          <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>CURRENT PHASE</div>
          <div style={{fontWeight:'bold', color:'#5daca5'}}>{phaseInfo.name}</div>
        </div>
        <button onClick={() => signOut(auth)} style={{marginTop:'30px', background:'transparent', border:'1px solid #ef4444', color:'#ef4444', padding:'10px 30px', borderRadius:'20px', cursor:'pointer'}}>Sign Out</button>
      </div>
    </div>
  );
}

// --- COACH APP ---
function CoachApp({ user }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      const q = query(collection(db, "users"), where("role", "==", "client"));
      const snapshot = await getDocs(q);
      setClients(snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() })));
    };
    fetchClients();
  }, []);

  return (
    <div className="coach-container animate-page">
      <div className="client-list">
        <div style={{padding:'15px', background:'#2d3748', borderBottom:'1px solid #334155', fontWeight:'bold', color:'white'}}>My Clients</div>
        {clients.map(c => (
          <div key={c.email} className={`client-item ${selectedClient?.email === c.email ? 'selected' : ''}`} onClick={() => setSelectedClient(c)}>
            <div style={{fontWeight:'600'}}>{c.email}</div>
            <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>{PHASES[c.currentPhase || 1].name}</div>
          </div>
        ))}
        <div style={{padding:'15px', marginTop:'auto', borderTop:'1px solid #334155'}}><button onClick={() => signOut(auth)} style={{border:'none', background:'none', color:'#ef4444', cursor:'pointer'}}>Logout</button></div>
      </div>
      <div className="detail-view">
        {selectedClient ? <CoachClientDetail client={selectedClient} coachEmail={user.email} /> : <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#64748b'}}>Select a client</div>}
      </div>
    </div>
  );
}

function CoachClientDetail({ client, coachEmail }) {
  const [logs, setLogs] = useState([]);
  const [workout, setWorkout] = useState("No workout logged");
  const [phaseId, setPhaseId] = useState(client.currentPhase || 1);

  useEffect(() => {
    // Logs
    const q = query(collection(db, "food_logs"), where("user_email", "==", client.email));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(data);
    });
    
    // Workout (Today)
    const today = new Date().toLocaleDateString();
    const wQ = query(collection(db, "workouts"), where("user_email", "==", client.email), where("date_string", "==", today));
    const unsubW = onSnapshot(wQ, (snap) => {
      if(!snap.empty) setWorkout(snap.docs[0].data().text);
      else setWorkout("No workout logged today");
    });

    return () => { unsub(); unsubW(); };
  }, [client]);

  const promoteClient = async () => {
    const nextPhase = parseInt(phaseId) + 1;
    if(nextPhase > 6) return alert("Max phase reached");
    if(!window.confirm(`Promote ${client.email} to Phase ${nextPhase}?`)) return;

    await updateDoc(doc(db, "users", client.email), {
      currentPhase: nextPhase,
      celebratePromotion: true
    });
    setPhaseId(nextPhase);
    alert("Client Promoted! They will see confetti next login.");
  };

  const downloadLogs = () => {
    const text = logs.map(l => `${l.date_string} | ${l.meal} | ${l.item} | ${l.quantity}`).join("\n");
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${client.email}_logs.txt`; a.click();
  };

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <div>
          <h2>{client.email}</h2>
          <div style={{color:'#5daca5', fontWeight:'bold', marginTop:'5px'}}>
            Currently: {PHASES[phaseId].name}
          </div>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
           <button onClick={promoteClient} className="mission-btn" style={{width:'auto', margin:0, background:'#eab308'}}>Promote Client ⬆</button>
           <button onClick={downloadLogs} className="mission-btn" style={{width:'auto', margin:0, background:'#2d3748', border:'1px solid #4a5568'}}>Download Data</button>
        </div>
      </div>

      <div style={{background:'#1a1d23', padding:'15px', borderRadius:'8px', marginBottom:'20px', border:'1px solid #334155'}}>
        <div style={{fontSize:'0.8rem', color:'#94a3b8', marginBottom:'5px'}}>TODAY'S WORKOUT</div>
        <div style={{color:'white', whiteSpace:'pre-wrap'}}>{workout}</div>
      </div>

      <div style={{display:'flex', gap:'20px', flex:1, overflow:'hidden'}}>
        <div style={{flex:1, overflowY:'auto', border:'1px solid #334155', borderRadius:'8px', padding:'15px', background:'#1a1d23'}}>
          <h3 style={{color:'#94a3b8', borderBottom:'1px solid #334155', paddingBottom:'10px', marginTop:0}}>Food Log History</h3>
          {logs.map(log => (
            <div key={log.id} style={{padding:'10px', borderBottom:'1px solid #2d3748'}}>
              <div style={{fontSize:'0.8rem', color:'#64748b'}}>{log.date_string} - {log.meal}</div>
              <div style={{fontWeight:'500'}}>{log.item}</div>
              <div style={{color:'#5daca5'}}>{log.quantity}</div>
            </div>
          ))}
        </div>
        <div style={{flex:1, display:'flex', flexDirection:'column'}}>
           <h3 style={{color:'#94a3b8', marginTop:0}}>Chat</h3>
           <ChatInterface currentUserEmail={coachEmail} chatPath={`users/${client.email}/messages`} />
        </div>
      </div>
    </div>
  );
}

function ChatInterface({ currentUserEmail, chatPath }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const dummyDiv = useRef(null);

  useEffect(() => {
    const q = query(collection(db, chatPath));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setMessages(msgs);
      setTimeout(() => dummyDiv.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [chatPath]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    await addDoc(collection(db, chatPath), { text: input, sender: currentUserEmail, timestamp: serverTimestamp(), isDeleted: false });
    setInput("");
  };

  const deleteMessage = async (msgId) => {
    if(!window.confirm("Delete?")) return;
    await updateDoc(doc(db, chatPath, msgId), { text: "🚫 Message deleted", isDeleted: true });
  };

  return (
    <div className="chat-window" style={{height:'100%', marginTop:0, display:'flex', flexDirection:'column'}}>
      <div className="messages-area" style={{flex:1}}>
        {messages.map(m => {
          const isMine = m.sender === currentUserEmail;
          return (
            <div key={m.id} className={`msg-row ${isMine ? 'mine' : 'theirs'}`}>
              {isMine && !m.isDeleted && <button className="delete-btn-outside" onClick={() => deleteMessage(m.id)}>🗑️</button>}
              <div className={`message-bubble ${isMine ? 'msg-mine' : 'msg-theirs'}`} style={m.isDeleted ? {fontStyle:'italic', opacity:0.6, background:'#333'} : {}}>{m.text}</div>
            </div>
          );
        })}
        <div ref={dummyDiv}></div>
      </div>
      <div className="chat-input-area">
        <input className="chat-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === 'Enter' && sendMessage()} />
        <button onClick={sendMessage} style={{background:'#5daca5', color:'white', border:'none', borderRadius:'50%', width:'40px', height:'40px', cursor:'pointer'}}>➤</button>
      </div>
    </div>
  );
}