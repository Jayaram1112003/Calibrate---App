import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, 
  onSnapshot, serverTimestamp, deleteDoc, updateDoc 
} from 'firebase/firestore';
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

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if user exists in DB
        const userRef = doc(db, "users", currentUser.email);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setRole(userSnap.data().role);
          setUser(currentUser);
        } else {
          setRole('unauthorized');
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{padding:'20px', color:'white'}}>Loading Calibrate...</div>;
  if (!user) return <LoginPage />;
  if (role === 'unauthorized') return <UnauthorizedPage email={user.email} />;
  if (role === 'client') return <ClientApp user={user} />;
  if (role === 'coach' || role === 'owner') return <CoachApp user={user} />;
  return null;
}

// --- LOGIN PAGES ---
function LoginPage() {
  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  return (
    <div className="app-container" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{textAlign:'center', padding:'20px'}}>
        <h1 style={{color:'white'}}>Calibrate</h1>
        <p style={{color:'#94a3b8'}}>Diet Coaching App</p>
        <button className="mission-btn" onClick={login}>
          Sign in with Google
        </button>
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
function ClientApp({ user }) {
  const [tab, setTab] = useState('home'); 

  return (
    <div className="app-container">
      {tab === 'home' && <ClientHome user={user} setTab={setTab} />}
      {tab === 'log' && <ClientLog user={user} />}
      {tab === 'coach' && <ClientChat user={user} />}
      {tab === 'profile' && <ClientProfile user={user} />}
      
      <div className="bottom-nav">
        <NavBtn label="Home" active={tab === 'home'} onClick={() => setTab('home')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </NavBtn>
        <NavBtn label="Log" active={tab === 'log'} onClick={() => setTab('log')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        </NavBtn>
        <NavBtn label="Coach" active={tab === 'coach'} onClick={() => setTab('coach')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        </NavBtn>
        <NavBtn label="Profile" active={tab === 'profile'} onClick={() => setTab('profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </NavBtn>
      </div>
    </div>
  );
}

function NavBtn({ label, active, onClick, children }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
      <span>{label}</span>
    </button>
  );
}

// --- CLIENT SUB-PAGES ---
function ClientHome({ user, setTab }) {
  return (
    <div>
      <div className="top-header">
        <h1>Calibrate</h1>
        <p>Phase 1: The Audit</p>
      </div>
      
      <div className="welcome-card">
        <h2>Good Morning!</h2>
        <p style={{color:'#94a3b8'}}>Ready to crush your goals today?</p>
        
        <div className="stats-row">
          <div className="stat-card">
             <span style={{fontSize:'1.5rem'}}>🔥</span>
             <div>
               <div style={{fontSize:'0.7rem', color:'#94a3b8'}}>STREAK</div>
               <div style={{fontWeight:'bold'}}>3 Days</div>
             </div>
          </div>
          <div className="stat-card">
             <span style={{fontSize:'1.5rem'}}>🍴</span>
             <div>
               <div style={{fontSize:'0.7rem', color:'#94a3b8'}}>LOGS TODAY</div>
               <div style={{fontWeight:'bold'}}>0</div>
             </div>
          </div>
        </div>
      </div>

      <div className="mission-card">
        <div style={{fontSize:'0.8rem', opacity:0.8, marginBottom:'5px'}}>CURRENT MISSION</div>
        <h3 style={{margin:'0 0 10px 0'}}>Phase 1: The Audit</h3>
        <p style={{fontSize:'0.9rem', lineHeight:'1.4', color:'#cbd5e1'}}>Don't change anything. Just log EVERYTHING you eat. Honesty is key.</p>
        <button className="mission-btn" onClick={() => setTab('log')}>+ Log Meal</button>
      </div>
    </div>
  );
}

function ClientLog({ user }) {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    const today = new Date().toLocaleDateString();
    // FIX: Removed 'orderBy' so it doesn't crash without an Index. 
    // We filter in memory or just display as is.
    const q = query(
      collection(db, "food_logs"), 
      where("user_email", "==", user.email),
      where("date_string", "==", today)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user.email]);

  const addLog = async (mealType) => {
    const item = prompt(`What did you eat for ${mealType}?`);
    if (!item) return;
    const qty = prompt("How much? (e.g. 1 bowl)");
    if (!qty) return;

    await addDoc(collection(db, "food_logs"), {
      user_email: user.email,
      meal: mealType,
      item,
      quantity: qty,
      date_string: new Date().toLocaleDateString(),
      timestamp: serverTimestamp()
    });
  };

  const deleteLog = async (id) => {
    if(window.confirm("Delete this item?")) {
      await deleteDoc(doc(db, "food_logs", id));
    }
  };

  const editLog = async (log) => {
    const newItem = prompt("Update Item Name:", log.item);
    if (!newItem) return;
    const newQty = prompt("Update Quantity:", log.quantity);
    if (!newQty) return;

    await updateDoc(doc(db, "food_logs", log.id), {
      item: newItem,
      quantity: newQty
    });
  };

  const meals = ["Breakfast", "Morning Snack", "Lunch", "Evening Snack", "Dinner"];

  return (
    <div>
      <div className="top-header">
        <h1>Today's Meals</h1>
        <p>{new Date().toLocaleDateString()}</p>
      </div>
      <div style={{paddingBottom:'20px'}}>
        {meals.map(meal => {
          const loggedItems = logs.filter(l => l.meal === meal);
          return (
            <div key={meal} className="meal-section">
              <div className="meal-header">
                <div className="meal-title">
                  {meal.includes("Snack") ? "☕" : "🍽️"} {meal}
                </div>
                <button className="add-btn-small" onClick={() => addLog(meal)}>+</button>
              </div>

              <div>
                {loggedItems.length === 0 ? (
                  <div style={{fontStyle:'italic', color:'#64748b', fontSize:'0.9rem'}}>No items logged</div>
                ) : (
                  loggedItems.map(log => (
                    <div key={log.id} className="log-item">
                      <div>
                        <div style={{fontWeight:'500'}}>{log.item}</div>
                        <div style={{fontSize:'0.85rem', color:'#94a3b8'}}>{log.quantity}</div>
                      </div>
                      <div className="log-actions">
                        <button className="icon-btn" onClick={() => editLog(log)}>✏️</button>
                        <button className="icon-btn" style={{color:'#ef4444'}} onClick={() => deleteLog(log.id)}>🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientChat({ user }) {
  // FIX: Chat path is now users/{clientEmail}/messages
  // This ensures the coach always knows where to look
  const chatPath = `users/${user.email}/messages`;

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
       <div className="top-header">
        <h1>Coach Chat</h1>
        <p>Direct line to your coach</p>
      </div>
      <div style={{padding:'20px', flex:1}}>
        <ChatInterface 
          currentUserEmail={user.email} 
          chatPath={chatPath}
        />
      </div>
    </div>
  );
}

function ClientProfile({ user }) {
  return (
    <div>
      <div className="top-header">
        <h1>Profile</h1>
      </div>
      <div style={{padding:'20px', textAlign:'center'}}>
        <div style={{width:'80px', height:'80px', background:'#2d3748', borderRadius:'50%', margin:'0 auto 15px auto', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem'}}>
          👤
        </div>
        <h2>{user.displayName}</h2>
        <p style={{color:'#94a3b8'}}>{user.email}</p>
        
        <button 
          onClick={() => signOut(auth)}
          style={{marginTop:'30px', background:'transparent', border:'1px solid #ef4444', color:'#ef4444', padding:'10px 30px', borderRadius:'20px', cursor:'pointer'}}
        >
          Sign Out
        </button>
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
    <div className="coach-container">
      <div className="client-list">
        <div style={{padding:'15px', background:'#2d3748', borderBottom:'1px solid #334155', fontWeight:'bold', color:'white'}}>
          My Clients
        </div>
        {clients.map(c => (
          <div 
            key={c.email} 
            className={`client-item ${selectedClient?.email === c.email ? 'selected' : ''}`}
            onClick={() => setSelectedClient(c)}
          >
            <div style={{fontWeight:'600'}}>{c.email}</div>
            <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>Phase 1: Audit</div>
          </div>
        ))}
        <div style={{padding:'15px', marginTop:'auto', borderTop:'1px solid #334155'}}>
           <button onClick={() => signOut(auth)} style={{border:'none', background:'none', color:'#ef4444', cursor:'pointer'}}>Logout</button>
        </div>
      </div>

      <div className="detail-view">
        {selectedClient ? (
          <CoachClientDetail client={selectedClient} coachEmail={user.email} />
        ) : (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#64748b'}}>
            Select a client to view details
          </div>
        )}
      </div>
    </div>
  );
}

function CoachClientDetail({ client, coachEmail }) {
  const [logs, setLogs] = useState([]);
  
  // FIX: Fetch logs AND capture the ID so React knows what to delete
  useEffect(() => {
    const q = query(
      collection(db, "food_logs"), 
      where("user_email", "==", client.email)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // capture doc.id here
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort manually (Newest first)
      data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(data);
    });
    return () => unsubscribe();
  }, [client]);

  const downloadLogs = () => {
    const text = logs.map(l => `${l.date_string} | ${l.meal} | ${l.item} | ${l.quantity}`).join("\n");
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.email}_logs.txt`;
    a.click();
  };

  const chatPath = `users/${client.email}/messages`;

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h2>{client.email}</h2>
        <button onClick={downloadLogs} className="mission-btn" style={{width:'auto', margin:0, background:'#2d3748', color:'white', border:'1px solid #4a5568'}}>
          Download Logs
        </button>
      </div>

      <div style={{display:'flex', gap:'20px', flex:1, overflow:'hidden'}}>
        {/* Left: Food Logs */}
        <div style={{flex:1, overflowY:'auto', border:'1px solid #334155', borderRadius:'8px', padding:'15px', background:'#1a1d23'}}>
          <h3 style={{color:'#94a3b8', borderBottom:'1px solid #334155', paddingBottom:'10px'}}>Recent Food Logs</h3>
          
          {logs.length === 0 && <div style={{padding:'20px', color:'#666', fontStyle:'italic'}}>No logs found</div>}

          {/* FIX: Use log.id as key instead of index (i) */}
          {logs.map((log) => (
            <div key={log.id} style={{padding:'10px', borderBottom:'1px solid #2d3748'}}>
              <div style={{fontSize:'0.8rem', color:'#64748b'}}>{log.date_string} - {log.meal}</div>
              <div style={{fontWeight:'500'}}>{log.item}</div>
              <div style={{color:'#5daca5'}}>{log.quantity}</div>
            </div>
          ))}
        </div>

        {/* Right: Chat */}
        <div style={{flex:1, display:'flex', flexDirection:'column'}}>
           <h3 style={{color:'#94a3b8'}}>Chat</h3>
           <ChatInterface 
             currentUserEmail={coachEmail} 
             chatPath={chatPath}
           />
        </div>
      </div>
    </div>
  );
}

// --- SHARED CHAT COMPONENT (UPDATED) ---
function ChatInterface({ currentUserEmail, chatPath }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const dummyDiv = useRef(null);

  useEffect(() => {
    // Now we use the specific path passed down
    const q = query(collection(db, chatPath), window.orderBy ? window.orderBy("timestamp", "asc") : undefined);
    // Simple snapshot for now, we will sort in JS to be safe
    const unsubscribe = onSnapshot(collection(db, chatPath), (snapshot) => {
      const msgs = snapshot.docs.map(d => d.data());
      msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setMessages(msgs);
      setTimeout(() => dummyDiv.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [chatPath]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    await addDoc(collection(db, chatPath), {
      text: input,
      sender: currentUserEmail,
      timestamp: serverTimestamp()
    });
    setInput("");
  };

  return (
    <div className="chat-window" style={{height:'100%', marginTop:0}}>
      <div className="messages-area">
        {messages.length === 0 && <div style={{textAlign:'center', marginTop:'50px', color:'#555'}}>No messages yet</div>}
        {messages.map((m, i) => (
          <div key={i} className={`message-bubble ${m.sender === currentUserEmail ? 'msg-mine' : 'msg-theirs'}`}>
            {m.text}
          </div>
        ))}
        <div ref={dummyDiv}></div>
      </div>
      <div className="chat-input-area">
        <input 
          className="chat-input" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Type a message..."
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} style={{background:'#5daca5', color:'white', border:'none', borderRadius:'50%', width:'40px', height:'40px', cursor:'pointer'}}>➤</button>
      </div>
    </div>
  );
}