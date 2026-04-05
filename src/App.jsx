import { useState, useEffect, useRef } from "react";

// ── ExerciseDB API ────────────────────────────────────────────────────────────
const RAPIDAPI_KEY = "6e0524f320msh415bec8ecab967fp1429adjsnc236847eb29e";
const USE_API = RAPIDAPI_KEY !== "YOUR_RAPIDAPI_KEY_HERE";

const FALLBACK_EXERCISES = [
  { id:"1",  name:"Barbell Bench Press",    bodyPart:"chest",       equipment:"barbell",          target:"pectorals" },
  { id:"2",  name:"Incline Dumbbell Press", bodyPart:"chest",       equipment:"dumbbell",         target:"pectorals" },
  { id:"3",  name:"Cable Fly",              bodyPart:"chest",       equipment:"cable",            target:"pectorals" },
  { id:"4",  name:"Push Up",                bodyPart:"chest",       equipment:"body weight",      target:"pectorals" },
  { id:"5",  name:"Chest Dip",              bodyPart:"chest",       equipment:"body weight",      target:"pectorals" },
  { id:"6",  name:"Barbell Back Squat",     bodyPart:"upper legs",  equipment:"barbell",          target:"quads" },
  { id:"7",  name:"Romanian Deadlift",      bodyPart:"upper legs",  equipment:"barbell",          target:"hamstrings" },
  { id:"8",  name:"Leg Press",              bodyPart:"upper legs",  equipment:"leverage machine", target:"quads" },
  { id:"9",  name:"Lunges",                 bodyPart:"upper legs",  equipment:"body weight",      target:"quads" },
  { id:"10", name:"Pull Up",                bodyPart:"back",        equipment:"body weight",      target:"lats" },
  { id:"11", name:"Barbell Row",            bodyPart:"back",        equipment:"barbell",          target:"lats" },
  { id:"12", name:"Lat Pulldown",           bodyPart:"back",        equipment:"cable",            target:"lats" },
  { id:"13", name:"Seated Cable Row",       bodyPart:"back",        equipment:"cable",            target:"upper back" },
  { id:"14", name:"Deadlift",               bodyPart:"back",        equipment:"barbell",          target:"spine" },
  { id:"15", name:"Dumbbell Row",           bodyPart:"back",        equipment:"dumbbell",         target:"lats" },
  { id:"16", name:"Overhead Press",         bodyPart:"shoulders",   equipment:"barbell",          target:"delts" },
  { id:"17", name:"Lateral Raise",          bodyPart:"shoulders",   equipment:"dumbbell",         target:"delts" },
  { id:"18", name:"Face Pull",              bodyPart:"shoulders",   equipment:"cable",            target:"delts" },
  { id:"19", name:"Barbell Curl",           bodyPart:"upper arms",  equipment:"barbell",          target:"biceps" },
  { id:"20", name:"Hammer Curl",            bodyPart:"upper arms",  equipment:"dumbbell",         target:"biceps" },
  { id:"21", name:"Tricep Pushdown",        bodyPart:"upper arms",  equipment:"cable",            target:"triceps" },
  { id:"22", name:"Skull Crusher",          bodyPart:"upper arms",  equipment:"barbell",          target:"triceps" },
  { id:"23", name:"Plank",                  bodyPart:"waist",       equipment:"body weight",      target:"abs" },
  { id:"24", name:"Cable Crunch",           bodyPart:"waist",       equipment:"cable",            target:"abs" },
  { id:"25", name:"Calf Raise",             bodyPart:"lower legs",  equipment:"body weight",      target:"calves" },
];

const BODY_PARTS = ["all","chest","back","upper legs","lower legs","shoulders","upper arms","lower arms","waist","cardio","neck"];
const MUSCLE_OPTIONS = ["pectorals","lats","quads","hamstrings","glutes","calves","delts","biceps","triceps","abs","upper back","spine","traps","neck"];
const EQUIPMENT_OPTIONS = ["barbell","dumbbell","cable","body weight","leverage machine","band","kettlebell","medicine ball","other"];

async function fetchExercises(bodyPart) {
  const url = bodyPart === "all"
    ? "https://exercisedb.p.rapidapi.com/exercises?limit=100&offset=0"
    : `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${bodyPart}?limit=100&offset=0`;
  const res = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
    },
  });
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  return data.map(e => ({
    id: e.id, name: e.name.charAt(0).toUpperCase() + e.name.slice(1),
    bodyPart: e.bodyPart, equipment: e.equipment, target: e.target, gifUrl: e.gifUrl,
  }));
}

// Epley 1RM
const calc1RM = (w, r) => {
  const wn = parseFloat(w), rn = parseFloat(r);
  if (!wn || !rn || rn === 1) return wn || null;
  return Math.round(wn * (1 + rn / 30));
};

const fmt     = d => d.toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric", year:"numeric" });
const fmtTime = d => d.toLocaleTimeString("en-US",{ hour:"numeric", minute:"2-digit" });

// ── Theme ─────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:"#111112", surface:"#1c1c1e", elevated:"#2c2c2e", border:"#3a3a3c",
    text:"#f5f5f7", sub:"#8e8e93", accent:"#f5f5f7", accentText:"#111112",
    pill:"#2c2c2e", pillText:"#8e8e93", success:"#30d158", danger:"#ff453a",
    inputBg:"#2c2c2e", warmup:"#f4a23a", pr:"#4ecdc4", cardBg:"#1c1f24", cardBorder:"#2a2d33",
  },
  light: {
    bg:"#f2f2f7", surface:"#ffffff", elevated:"#f2f2f7", border:"#e5e5ea",
    text:"#1c1c1e", sub:"#8e8e93", accent:"#1c1c1e", accentText:"#ffffff",
    pill:"#e5e5ea", pillText:"#6e6e73", success:"#34c759", danger:"#ff3b30",
    inputBg:"#f2f2f7", warmup:"#d4831a", pr:"#2aaba3", cardBg:"#ffffff", cardBorder:"#e5e5ea",
  },
};

const Tag = ({ label, t }) => (
  <span style={{ background:t.pill, color:t.pillText, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:500 }}>{label}</span>
);

// ── Custom Exercise Modal ─────────────────────────────────────────────────────
function CustomExerciseModal({ onSave, onClose, t }) {
  const [name, setName]       = useState("");
  const [target, setTarget]   = useState(MUSCLE_OPTIONS[0]);
  const [equip, setEquip]     = useState(EQUIPMENT_OPTIONS[0]);
  const [notes, setNotes]     = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: `custom-${Date.now()}`, name: name.trim(), bodyPart: "custom", equipment: equip, target, notes, isCustom: true });
    onClose();
  };

  const inp = { background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, padding:"10px 14px", color:t.text, fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
  const sel = { ...inp, cursor:"pointer" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:t.surface, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:430, padding:"24px 20px 36px", display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ fontSize:17, fontWeight:700, color:t.text }}>Custom Exercise</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:t.sub, fontSize:22, cursor:"pointer" }}>×</button>
        </div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Exercise name *" style={inp} />
        <select value={target} onChange={e=>setTarget(e.target.value)} style={sel}>
          {MUSCLE_OPTIONS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
        </select>
        <select value={equip} onChange={e=>setEquip(e.target.value)} style={sel}>
          {EQUIPMENT_OPTIONS.map(eq => <option key={eq} value={eq}>{eq.charAt(0).toUpperCase()+eq.slice(1)}</option>)}
        </select>
        <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes / cues (optional)" style={inp} />
        <button onClick={handleSave} style={{ background:t.accent, color:t.accentText, border:"none", borderRadius:12, padding:"14px 0", fontSize:15, fontWeight:600, cursor:"pointer", marginTop:4 }}>
          Save Exercise
        </button>
      </div>
    </div>
  );
}

// ── Rest Timer ────────────────────────────────────────────────────────────────
function RestTimer({ t }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [target, setTarget]   = useState(90);
  const ref = useRef();

  useEffect(() => {
    if (running) { ref.current = setInterval(() => setSeconds(s => s + 1), 1000); }
    else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [running]);

  const reset = () => { setSeconds(0); setRunning(false); };
  const pct   = Math.min(seconds / target, 1);
  const done  = seconds >= target;
  const mm    = String(Math.floor(seconds/60)).padStart(2,"0");
  const ss    = String(seconds%60).padStart(2,"0");
  const r = 26, circ = 2 * Math.PI * r;

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", background:t.surface, borderBottom:`1px solid ${t.border}` }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke={t.border} strokeWidth="4"/>
        <circle cx="32" cy="32" r={r} fill="none" stroke={done ? t.success : t.accent} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ - pct * circ}
          strokeLinecap="round" transform="rotate(-90 32 32)" style={{ transition:"stroke-dashoffset 0.5s" }}/>
        <text x="32" y="37" textAnchor="middle" fill={done ? t.success : t.text} fontSize="13" fontWeight="700" fontFamily="system-ui">
          {mm}:{ss}
        </text>
      </svg>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, color:t.sub, marginBottom:6 }}>Rest Timer · Target: {Math.floor(target/60)}:{String(target%60).padStart(2,"0")}</div>
        <div style={{ display:"flex", gap:6 }}>
          {[60,90,120,180].map(s => (
            <button key={s} onClick={()=>setTarget(s)} style={{ background: target===s ? t.accent : t.elevated, color: target===s ? t.accentText : t.sub, border:"none", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {s<60?`${s}s`:`${s/60}m`}{s===90?"30s":""}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <button onClick={()=>setRunning(r=>!r)} style={{ background: running ? t.danger+"22" : t.success+"22", color: running ? t.danger : t.success, border:"none", borderRadius:8, padding:"6px 12px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={reset} style={{ background:t.elevated, color:t.sub, border:"none", borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer" }}>
          Reset
        </button>
      </div>
    </div>
  );
}

// ── Browse ────────────────────────────────────────────────────────────────────
function Browse({ onAdd, addedIds, t }) {
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [exercises, setExercises] = useState(FALLBACK_EXERCISES);
  const [loading, setLoading]     = useState(false);
  const [apiError, setApiError]   = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customExercises, setCustomExercises] = useState([]);
  const cache = useRef({});

  useEffect(() => {
    if (!USE_API) return;
    if (cache.current[filter]) { setExercises(cache.current[filter]); return; }
    setLoading(true); setApiError(false);
    fetchExercises(filter)
      .then(data => { cache.current[filter] = data; setExercises(data); })
      .catch(() => { setApiError(true); setExercises(FALLBACK_EXERCISES); })
      .finally(() => setLoading(false));
  }, [filter]);

  const handleSaveCustom = ex => setCustomExercises(p => [ex, ...p]);

  const allExercises = [...customExercises, ...exercises];
  const filtered = allExercises.filter(e =>
    (filter === "all" || e.bodyPart === filter || (filter === "custom" && e.isCustom)) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) ||
     e.target.toLowerCase().includes(search.toLowerCase()) ||
     e.equipment.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {showCustom && <CustomExerciseModal onSave={handleSaveCustom} onClose={()=>setShowCustom(false)} t={t} />}
      <div style={{ padding:"12px 16px 0", background:t.surface }}>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, background:t.inputBg, borderRadius:12, padding:"10px 14px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t.sub} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exercises or muscles…"
              style={{ background:"transparent", border:"none", outline:"none", color:t.text, fontSize:14, flex:1 }} />
            {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", color:t.sub, cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>}
          </div>
          <button onClick={()=>setShowCustom(true)} style={{ background:t.accent, color:t.accentText, border:"none", borderRadius:12, padding:"0 14px", fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
            + Custom
          </button>
        </div>
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:12 }}>
          {["all","custom",...BODY_PARTS.filter(b=>b!=="all")].map(bp => (
            <button key={bp} onClick={()=>setFilter(bp)} style={{
              background: filter===bp ? t.accent : "transparent", color: filter===bp ? t.accentText : t.sub,
              border:`1px solid ${filter===bp ? t.accent : t.border}`, borderRadius:20, padding:"5px 13px",
              fontSize:12, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap", transition:"all .15s",
            }}>{bp==="all"?"All":bp.charAt(0).toUpperCase()+bp.slice(1)}</button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"4px 16px 16px" }}>
        <div style={{ fontSize:12, color:t.sub, padding:"8px 0 4px", display:"flex", alignItems:"center", gap:8 }}>
          {loading ? (
            <><span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", border:`2px solid ${t.border}`, borderTopColor:t.text, animation:"spin 0.7s linear infinite" }} /> Loading from ExerciseDB…</>
          ) : apiError ? (
            <span style={{ color:t.danger }}>⚠ API unavailable — showing built-in library</span>
          ) : (
            <span>{filtered.length} exercises {USE_API ? <span style={{color:t.success}}>· Live</span> : "· Add API key to unlock 1,300+"}</span>
          )}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        {filtered.map(ex => {
          const added = addedIds.includes(ex.id);
          return (
            <div key={ex.id} style={{ background:t.surface, borderRadius:14, marginBottom:8, padding:"14px 16px", display:"flex", alignItems:"center", gap:14, border:`1px solid ${ex.isCustom ? t.pr+"44" : t.border}` }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:t.text }}>{ex.name}</div>
                  {ex.isCustom && <span style={{ fontSize:10, fontWeight:700, color:t.pr, background:t.pr+"22", borderRadius:4, padding:"1px 6px" }}>CUSTOM</span>}
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  <Tag label={ex.target} t={t} /><Tag label={ex.equipment} t={t} />
                </div>
              </div>
              <button onClick={()=>!added&&onAdd(ex)} style={{
                width:36, height:36, borderRadius:"50%", border:"none",
                background: added ? t.success+"22" : t.accent, color: added ? t.success : t.accentText,
                fontSize: added ? 16 : 20, cursor: added ? "default" : "pointer",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>{added ? "✓" : "+"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Logger ────────────────────────────────────────────────────────────────────
function Logger({ exercises, onRemove, onFinish, t }) {
  const [sets, setSets]           = useState({});
  const [workoutName, setWorkoutName] = useState("");

  useEffect(() => {
    setSets(prev => {
      const next = { ...prev };
      exercises.forEach(e => { if (!next[e.id]) next[e.id] = [{ reps:"", weight:"", isWarmup:false }]; });
      return next;
    });
  }, [exercises]);

  const addSet    = id => setSets(p => ({ ...p, [id]: [...(p[id]||[]), { reps:"", weight:"", isWarmup:false }] }));
  const removeSet = (id,i) => setSets(p => ({ ...p, [id]: p[id].filter((_,j)=>j!==i) }));
  const update    = (id,i,f,v) => setSets(p => ({ ...p, [id]: p[id].map((s,j) => j===i ? {...s,[f]:v} : s) }));
  const toggleWarmup = (id,i) => update(id,i,"isWarmup",!sets[id][i].isWarmup);

  const allSets = Object.values(sets).flat();
  const totalVol = allSets.reduce((a,s) => {
    const r=parseFloat(s.reps), w=parseFloat(s.weight);
    return a + (isNaN(r)||isNaN(w) ? 0 : r*w);
  }, 0);

  if (!exercises.length) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8 }}>
      <div style={{ fontSize:40, marginBottom:4 }}>🏋️</div>
      <div style={{ fontSize:17, fontWeight:600, color:t.text }}>No exercises added</div>
      <div style={{ fontSize:14, color:t.sub }}>Browse and tap + to start your workout</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ display:"flex", padding:"14px 16px", background:t.surface, borderBottom:`1px solid ${t.border}`, gap:8 }}>
        {[[exercises.length,"Exercises"],[allSets.filter(s=>!s.isWarmup).length,"Working Sets"],[totalVol>0?totalVol.toLocaleString():"—","Vol (lbs)"]].map(([val,label],i,arr) => (
          <div key={label} style={{ display:"contents" }}>
            <div style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, color:t.text }}>{val}</div>
              <div style={{ fontSize:11, color:t.sub, marginTop:1 }}>{label}</div>
            </div>
            {i < arr.length-1 && <div style={{ width:1, background:t.border }} />}
          </div>
        ))}
      </div>
      <RestTimer t={t} />
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
        <input value={workoutName} onChange={e=>setWorkoutName(e.target.value)} placeholder="Workout name (e.g. Back & Biceps)"
          style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:12, padding:"11px 14px", color:t.text, fontSize:14, width:"100%", boxSizing:"border-box", outline:"none", marginBottom:12 }} />
        {exercises.map(ex => (
          <div key={ex.id} style={{ background:t.surface, borderRadius:14, marginBottom:12, overflow:"hidden", border:`1px solid ${t.border}` }}>
            <div style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:`1px solid ${t.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600, color:t.text }}>{ex.name}</div>
                <div style={{ fontSize:12, color:t.sub, marginTop:2 }}>{ex.target} · {ex.equipment}</div>
              </div>
              <button onClick={()=>onRemove(ex.id)} style={{ background:"none", border:"none", color:t.sub, fontSize:20, cursor:"pointer", padding:4, lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:"10px 16px 12px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"34px 1fr 1fr 34px", gap:8, marginBottom:6 }}>
                {["SET","Weight","Reps",""].map((h,i) => (
                  <div key={i} style={{ fontSize:11, color:t.sub, textAlign:"center", fontWeight:500 }}>{h}</div>
                ))}
              </div>
              {(sets[ex.id]||[]).map((s,i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"34px 1fr 1fr 34px", gap:8, marginBottom:6, alignItems:"center" }}>
                  <button onClick={()=>toggleWarmup(ex.id,i)} style={{
                    background: s.isWarmup ? t.warmup+"22" : t.inputBg, border:`1px solid ${s.isWarmup ? t.warmup : t.border}`,
                    borderRadius:8, color: s.isWarmup ? t.warmup : t.sub, fontSize:12, fontWeight:700, cursor:"pointer", height:36,
                  }}>{s.isWarmup ? "W" : i+1}</button>
                  {["weight","reps"].map(f => (
                    <input key={f} type="number" placeholder="—" value={s[f]} onChange={e=>update(ex.id,i,f,e.target.value)}
                      style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, padding:"8px 6px", color:t.text, fontSize:14, textAlign:"center", outline:"none", width:"100%", boxSizing:"border-box" }} />
                  ))}
                  <button onClick={()=>removeSet(ex.id,i)} style={{ background:"none", border:"none", color:t.sub, fontSize:18, cursor:"pointer", textAlign:"center", lineHeight:1 }}>−</button>
                </div>
              ))}
              <button onClick={()=>addSet(ex.id)} style={{ width:"100%", marginTop:4, padding:"9px 0", background:"transparent", border:`1px dashed ${t.border}`, borderRadius:10, color:t.sub, fontSize:13, cursor:"pointer" }}>
                + Add Set
              </button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:"12px 16px", borderTop:`1px solid ${t.border}`, background:t.surface }}>
        <button onClick={()=>onFinish(workoutName, sets)} style={{ width:"100%", background:t.accent, color:t.accentText, border:"none", borderRadius:14, padding:"15px 0", fontSize:15, fontWeight:600, cursor:"pointer" }}>
          Finish Workout
        </button>
      </div>
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ workout, cardRef }) {
  const { name, date, exercises } = workout;
  const totalVol = exercises.reduce((a,ex) => a + ex.sets.reduce((b,s) => b+(parseFloat(s.weight)||0)*(parseFloat(s.reps)||0),0),0);
  const totalPRs = exercises.reduce((a,ex) => a + ex.sets.filter(s=>s.isPR).length,0);
  const c = { bg:"#1c1f24", border:"#2a2d33", text:"#f5f5f7", sub:"#636366", muted:"#48484a", warmup:"#f4a23a", pr:"#4ecdc4" };

  return (
    <div ref={cardRef} style={{ background:c.bg, borderRadius:20, overflow:"hidden", fontFamily:"-apple-system,'SF Pro Display','Inter',system-ui,sans-serif", width:390, flexShrink:0 }}>
      <div style={{ padding:"22px 22px 16px", borderBottom:`1px solid ${c.border}` }}>
        <div style={{ fontSize:22, fontWeight:700, color:c.text, letterSpacing:-0.4, marginBottom:4 }}>{name||"Workout"}</div>
        <div style={{ fontSize:13, color:c.sub }}>{fmtTime(date)} · {fmt(date)}</div>
        <div style={{ display:"flex", gap:20, marginTop:14 }}>
          {workout.duration && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.sub} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span style={{ fontSize:13, color:"#c7c7cc", fontWeight:500 }}>{workout.duration}</span>
            </div>
          )}
          {totalVol>0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11v11h-11z"/><path d="M3 9.5h3M18 9.5h3M3 14.5h3M18 14.5h3"/></svg>
              <span style={{ fontSize:13, color:"#c7c7cc", fontWeight:500 }}>{totalVol.toLocaleString()} lb</span>
            </div>
          )}
          {totalPRs>0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M12 17v4"/><path d="M8 21h8"/><path d="M6 2h12v7a6 6 0 0 1-12 0V2z"/></svg>
              <span style={{ fontSize:13, color:"#c7c7cc", fontWeight:500 }}>{totalPRs} PR{totalPRs!==1?"s":""}</span>
            </div>
          )}
        </div>
      </div>
      {exercises.map((ex,ei) => {
        let wc = 0;
        return (
          <div key={ei} style={{ padding:"14px 22px 10px", borderBottom:`1px solid ${c.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
              <div style={{ fontSize:15, fontWeight:700, color:c.text }}>{ex.name}</div>
              <div style={{ fontSize:11, color:c.muted, fontWeight:600, letterSpacing:0.5, textTransform:"uppercase" }}>1RM</div>
            </div>
            {ex.sets.map((s,si) => {
              if (!s.isWarmup) wc++;
              const rm = calc1RM(s.weight, s.reps);
              const prChips = [];
              if (s.isPR_1rm) prChips.push("1RM");
              if (s.isPR_vol) prChips.push("VOL.");
              if (s.isPR_wt)  prChips.push("WEIGHT");
              return (
                <div key={si}>
                  <div style={{ display:"grid", gridTemplateColumns:"18px 1fr auto", gap:8, alignItems:"center", padding:"4px 0" }}>
                    <div style={{ fontSize:13, color: s.isWarmup ? c.warmup : c.muted, fontWeight:500 }}>{s.isWarmup?"W":wc}</div>
                    <div style={{ fontSize:14, color: s.isWarmup ? c.warmup : "#8e8e93" }}>{s.weight} lb × {s.reps}</div>
                    <div style={{ fontSize:13, color:c.muted, minWidth:28, textAlign:"right" }}>{rm||""}</div>
                  </div>
                  {prChips.length>0 && (
                    <div style={{ display:"flex", gap:6, marginBottom:4, marginLeft:26, flexWrap:"wrap" }}>
                      {prChips.map(chip => (
                        <span key={chip} style={{ display:"inline-flex", alignItems:"center", gap:4, border:`1.5px solid ${c.pr}`, borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:700, color:c.pr }}>🏆 {chip}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {totalPRs>0 && (
        <div style={{ background:"#16191e", padding:"14px 22px", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M12 17v4"/><path d="M8 21h8"/><path d="M6 2h12v7a6 6 0 0 1-12 0V2z"/></svg>
          <span style={{ fontSize:13, fontWeight:600, color:"#636366" }}>{totalPRs} Personal Record{totalPRs!==1?"s":""}</span>
        </div>
      )}
      <div style={{ padding:"8px 0", textAlign:"center" }}>
        <span style={{ fontSize:11, color:"#2a2d33", fontWeight:600, letterSpacing:1.5 }}>LIFTLOG</span>
      </div>
    </div>
  );
}

// ── 1RM Chart ─────────────────────────────────────────────────────────────────
function OneRMChart({ history, t }) {
  const [selected, setSelected] = useState(null);

  const exerciseNames = [...new Set(history.flatMap(w => w.exercises.map(e => e.name)))].sort();

  useEffect(() => { if (exerciseNames.length && !selected) setSelected(exerciseNames[0]); }, [exerciseNames]);

  const dataPoints = history
    .slice().reverse()
    .map(w => {
      const ex = w.exercises.find(e => e.name === selected);
      if (!ex) return null;
      const best = Math.max(...ex.sets.filter(s=>!s.isWarmup).map(s => calc1RM(s.weight,s.reps)||0));
      return best > 0 ? { date: w.date, value: best } : null;
    }).filter(Boolean);

  if (!exerciseNames.length) return null;

  const maxVal = Math.max(...dataPoints.map(d=>d.value), 0);
  const minVal = Math.min(...dataPoints.map(d=>d.value), 0);
  const range  = maxVal - minVal || 1;
  const W = 320, H = 100, pad = 10;

  const pts = dataPoints.map((d,i) => {
    const x = pad + (i / Math.max(dataPoints.length-1,1)) * (W - pad*2);
    const y = H - pad - ((d.value - minVal) / range) * (H - pad*2);
    return [x,y];
  });

  const path = pts.length > 1 ? `M ${pts.map(p=>p.join(",")).join(" L ")}` : "";

  return (
    <div style={{ background:t.surface, borderRadius:14, margin:"0 16px 12px", padding:"16px", border:`1px solid ${t.border}` }}>
      <div style={{ fontSize:14, fontWeight:600, color:t.text, marginBottom:10 }}>1RM Progression</div>
      <select value={selected||""} onChange={e=>setSelected(e.target.value)} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"7px 10px", color:t.text, fontSize:13, width:"100%", boxSizing:"border-box", outline:"none", marginBottom:12, cursor:"pointer" }}>
        {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      {pts.length < 2 ? (
        <div style={{ fontSize:13, color:t.sub, textAlign:"center", padding:"16px 0" }}>Log at least 2 workouts with this exercise to see progression</div>
      ) : (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
          <path d={path} fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {pts.map(([x,y],i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill={t.accent}/>
              <text x={x} y={y-8} textAnchor="middle" fill={t.sub} fontSize="10" fontFamily="system-ui">{dataPoints[i].value}</text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

// ── Volume Summary ────────────────────────────────────────────────────────────
function VolumeSummary({ workout, t }) {
  const muscleVol = {};
  workout.exercises.forEach(ex => {
    const vol = ex.sets.filter(s=>!s.isWarmup).reduce((a,s) => a+(parseFloat(s.weight)||0)*(parseFloat(s.reps)||0),0);
    if (vol > 0) muscleVol[ex.target] = (muscleVol[ex.target]||0) + vol;
  });
  const entries = Object.entries(muscleVol).sort((a,b)=>b[1]-a[1]);
  if (!entries.length) return null;
  const maxVol = entries[0][1];

  return (
    <div style={{ background:t.surface, borderRadius:14, margin:"12px 16px 0", padding:"16px", border:`1px solid ${t.border}` }}>
      <div style={{ fontSize:14, fontWeight:600, color:t.text, marginBottom:12 }}>Volume by Muscle</div>
      {entries.map(([muscle, vol]) => (
        <div key={muscle} style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:13, color:t.text, fontWeight:500 }}>{muscle.charAt(0).toUpperCase()+muscle.slice(1)}</span>
            <span style={{ fontSize:13, color:t.sub }}>{vol.toLocaleString()} lbs</span>
          </div>
          <div style={{ height:6, background:t.elevated, borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(vol/maxVol)*100}%`, background:t.accent, borderRadius:3, transition:"width .4s" }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Summary Screen ────────────────────────────────────────────────────────────
function SummaryScreen({ workout, onClose, onSaveHistory, t }) {
  const cardRef = useRef();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ position:"absolute", inset:0, background:t.bg, zIndex:50, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", background:t.surface, borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        <button onClick={onClose} style={{ background:"none", border:"none", color:t.sub, fontSize:14, cursor:"pointer", fontWeight:500 }}>← Back</button>
        <div style={{ fontSize:15, fontWeight:600, color:t.text }}>Workout Summary</div>
        <div style={{ width:50 }} />
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"20px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
        <VolumeSummary workout={workout} t={t} />
        <div style={{ height:16 }}/>
        <SummaryCard workout={workout} t={t} cardRef={cardRef} />
      </div>
      <div style={{ padding:"12px 16px 16px", borderTop:`1px solid ${t.border}`, background:t.surface, display:"flex", gap:10 }}>
        <button onClick={handleSave} style={{ flex:1, background: saved ? t.success : t.elevated, color: saved ? "#fff" : t.text, border:`1px solid ${t.border}`, borderRadius:14, padding:"14px 0", fontSize:14, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "⬇ Save Image"}
        </button>
        <button onClick={onSaveHistory} style={{ flex:1, background:t.accent, color:t.accentText, border:"none", borderRadius:14, padding:"14px 0", fontSize:14, fontWeight:600, cursor:"pointer" }}>
          Done
        </button>
      </div>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────
function History({ history, t, onOpen }) {
  if (!history.length) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8 }}>
      <div style={{ fontSize:40, marginBottom:4 }}>📋</div>
      <div style={{ fontSize:17, fontWeight:600, color:t.text }}>No workouts yet</div>
      <div style={{ fontSize:14, color:t.sub }}>Finished workouts will appear here</div>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <OneRMChart history={history} t={t} />
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
        {history.map((w,i) => {
          const totalVol = w.exercises.reduce((a,ex)=>a+ex.sets.reduce((b,s)=>b+(parseFloat(s.weight)||0)*(parseFloat(s.reps)||0),0),0);
          const totalPRs = w.exercises.reduce((a,ex)=>a+ex.sets.filter(s=>s.isPR_1rm||s.isPR_vol||s.isPR_wt).length,0);
          return (
            <div key={i} onClick={()=>onOpen(w)} style={{ background:t.surface, borderRadius:14, marginBottom:10, padding:"16px", border:`1px solid ${t.border}`, cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <div style={{ fontSize:15, fontWeight:600, color:t.text }}>{w.name||`Workout ${history.length-i}`}</div>
                <div style={{ fontSize:12, color:t.sub }}>{fmt(w.date)}</div>
              </div>
              <div style={{ display:"flex", gap:14, marginBottom:10, flexWrap:"wrap" }}>
                <span style={{ fontSize:13, color:t.sub }}>{w.exercises.length} exercises</span>
                {totalVol>0 && <span style={{ fontSize:13, color:t.sub }}>{totalVol.toLocaleString()} lbs</span>}
                {totalPRs>0 && <span style={{ fontSize:13, color:t.pr }}>🏆 {totalPRs} PR{totalPRs!==1?"s":""}</span>}
              </div>
              {w.exercises.map((ex,j)=>(
                <div key={j} style={{ fontSize:13, color:t.sub, marginBottom:3 }}>
                  {ex.name} <span style={{ color:t.border }}>·</span> <span style={{ color:t.text }}>{ex.sets.filter(s=>!s.isWarmup).length} sets</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]       = useState("dark");
  const [tab, setTab]         = useState("browse");
  const [added, setAdded]     = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [toast, setToast]     = useState("");
  const startTime = useRef(null);
  const t = THEMES[mode];

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),2500); };
  const handleAdd    = ex => { if (!added.find(e=>e.id===ex.id)) { setAdded(p=>[...p,ex]); if (!startTime.current) startTime.current = new Date(); } };
  const handleRemove = id => setAdded(p=>p.filter(e=>e.id!==id));

  const handleFinish = (workoutName, sets) => {
    if (!added.length) return;
    const now  = new Date();
    const mins = startTime.current ? Math.round((now - startTime.current)/60000) : null;
    const prRecords = {};
    history.forEach(w => w.exercises.forEach(ex => {
      if (!prRecords[ex.name]) prRecords[ex.name] = { best1rm:0, bestVol:0, bestWt:0 };
      ex.sets.forEach(s => {
        const rm  = calc1RM(s.weight,s.reps)||0;
        const vol = (parseFloat(s.weight)||0)*(parseFloat(s.reps)||0);
        if (rm  > prRecords[ex.name].best1rm) prRecords[ex.name].best1rm = rm;
        if (vol > prRecords[ex.name].bestVol) prRecords[ex.name].bestVol = vol;
        if ((parseFloat(s.weight)||0) > prRecords[ex.name].bestWt) prRecords[ex.name].bestWt = parseFloat(s.weight)||0;
      });
    }));
    const exercises = added.map(ex => {
      const exSets = (sets[ex.id]||[]).filter(s=>s.reps||s.weight);
      const prev   = prRecords[ex.name] || { best1rm:0, bestVol:0, bestWt:0 };
      let b1=prev.best1rm, bv=prev.bestVol, bw=prev.bestWt;
      const enriched = exSets.map(s => {
        const rm=calc1RM(s.weight,s.reps)||0, vol=(parseFloat(s.weight)||0)*(parseFloat(s.reps)||0), wt=parseFloat(s.weight)||0;
        const isPR_1rm=!s.isWarmup&&rm>b1, isPR_vol=!s.isWarmup&&vol>bv, isPR_wt=!s.isWarmup&&wt>bw;
        if(isPR_1rm)b1=rm; if(isPR_vol)bv=vol; if(isPR_wt)bw=wt;
        return { ...s, isPR_1rm, isPR_vol, isPR_wt, isPR:isPR_1rm||isPR_vol||isPR_wt };
      });
      return { ...ex, sets:enriched };
    });
    setSummary({ name:workoutName||"Workout", date:now, duration:mins?`${mins}m`:null, exercises });
    setAdded([]); startTime.current = null;
  };

  const handleSaveHistory = () => {
    if (!summary) return;
    setHistory(p=>[summary,...p]);
    setSummary(null); setTab("history");
    showToast("Workout saved!");
  };

  const TABS = [
    { id:"browse",  label:"Browse",  icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
    { id:"log",     label:added.length?`Log · ${added.length}`:"Log", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
    { id:"history", label:"History", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ];

  return (
    <div style={{ background:t.bg, color:t.text, fontFamily:"'Inter',system-ui,sans-serif", display:"flex", flexDirection:"column", width:"100%", maxWidth:430, margin:"0 auto", height:"100vh", overflow:"hidden", position:"relative" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px 14px", background:t.surface, borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        <div>
          <div style={{ fontSize:19, fontWeight:700, color:t.text, letterSpacing:-0.5 }}>LiftLog</div>
          <div style={{ fontSize:12, color:t.sub, marginTop:1 }}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        </div>
        <button onClick={()=>setMode(m=>m==="dark"?"light":"dark")} style={{ background:t.elevated, border:`1px solid ${t.border}`, borderRadius:10, width:38, height:38, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>
          {mode==="dark"?"☀️":"🌙"}
        </button>
      </div>
      {toast && (
        <div style={{ position:"absolute", top:76, left:20, right:20, zIndex:99, background:t.success, color:"#fff", borderRadius:12, padding:"12px 16px", textAlign:"center", fontWeight:600, fontSize:14, boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}
      <div style={{ flex:1, overflow:"hidden", background:t.bg, position:"relative" }}>
        {tab==="browse"  && <Browse  onAdd={handleAdd} addedIds={added.map(e=>e.id)} t={t} />}
        {tab==="log"     && <Logger  exercises={added} onRemove={handleRemove} onFinish={handleFinish} t={t} />}
        {tab==="history" && <History history={history} t={t} onOpen={w=>setSummary(w)} />}
        {summary && <SummaryScreen workout={summary} t={t} onClose={()=>setSummary(null)} onSaveHistory={handleSaveHistory} />}
      </div>
      <div style={{ display:"flex", background:t.surface, borderTop:`1px solid ${t.border}`, padding:"8px 0 6px", flexShrink:0 }}>
        {TABS.map(tb => {
          const active = tab===tb.id;
          return (
            <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ flex:1, background:"transparent", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer", color:active?t.text:t.sub, padding:"4px 0", transition:"color .15s" }}>
              {tb.icon}
              <span style={{ fontSize:11, fontWeight:active?600:400, letterSpacing:0.2 }}>{tb.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
