import { useState, useEffect, useMemo } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://deuscfvwuowvskpahulm.supabase.co";
const SUPABASE_KEY = "sb_publishable_GsJWIIa_Tp1SOePeUUcCog__qfMCAfC";

const sb = {
  headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
  url: (table, params="") => `${SUPABASE_URL}/rest/v1/${table}${params}`,

  async getAll() {
    const res = await fetch(this.url("organizations", "?order=created_at.desc"), { headers: this.headers });
    if (!res.ok) throw new Error("Failed to load");
    return res.json();
  },
  async insert(org) {
    const res = await fetch(this.url("organizations"), {
      method: "POST", headers: { ...this.headers, "Prefer": "return=representation" },
      body: JSON.stringify(org)
    });
    if (!res.ok) throw new Error("Failed to insert");
    return res.json();
  },
  async update(id, data) {
    const res = await fetch(this.url("organizations", `?id=eq.${id}`), {
      method: "PATCH", headers: { ...this.headers, "Prefer": "return=representation" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update");
    return res.json();
  },
  async delete(id) {
    const res = await fetch(this.url("organizations", `?id=eq.${id}`), {
      method: "DELETE", headers: this.headers
    });
    if (!res.ok) throw new Error("Failed to delete");
  },
};

// Map DB row (snake_case) to app org (camelCase)
const fromDB = r => ({
  id: r.id, status: r.status, name: r.name, description: r.description,
  type: r.type, website: r.website || "", email: r.email || "",
  focusAreas: r.focus_areas || [], location: r.location || "", state: r.state || "",
  social: r.social || {}, founded: r.founded || "", size: r.size || "",
  events: r.events || [], ein: r.ein || "", _source: r.source || "",
});

// Map app org to DB row
const toDB = o => ({
  name: o.name, description: o.description, type: o.type,
  website: o.website || "", email: o.email || "",
  focus_areas: o.focusAreas || [], location: o.location || "", state: o.state || "",
  social: o.social || {}, founded: o.founded || "", size: o.size || "",
  events: o.events || [], status: o.status || "pending",
  ein: o.ein || "", source: o._source || "",
});

const FOCUS_AREAS = ["Civil Rights","Climate","Democracy","Environment","Healthcare","Immigration","LGBTQ+","Labor","Media","Public Lands","Reproductive Rights","Voting Rights"];
const ORG_TYPES = ["Nonprofit","PAC","Informal Group","Coalition","Legal Organization","Media Organization","Faith-Based"];
const US_STATES = ["National","AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

const SEED = [
  {
    id:1, status:"approved",
    name:"ACLU",
    description:"The American Civil Liberties Union defends individual rights and liberties guaranteed by the Constitution and U.S. law, fighting government overreach across all three branches.",
    type:"Nonprofit", website:"https://aclu.org", email:"info@aclu.org",
    focusAreas:["Civil Rights","Immigration","Voting Rights"],
    location:"National", state:"NY",
    social:{ twitter:"ACLU", instagram:"aclu_nationwide" },
    founded:"1920", size:"500,000+ members",
    events:[
      {id:"e1",title:"Know Your Rights Workshop",date:"2026-04-10",desc:"Free constitutional rights training for the public."},
      {id:"e2",title:"Annual Gala",date:"2026-05-20",desc:"Fundraising dinner and civil liberties awards."}
    ]
  },
  {
    id:2, status:"approved",
    name:"Indivisible Project",
    description:"A grassroots movement of thousands of local groups using collective action to hold Congress accountable and resist authoritarian policies.",
    type:"Informal Group", website:"https://indivisible.org", email:"hello@indivisible.org",
    focusAreas:["Democracy","Voting Rights","Healthcare"],
    location:"National", state:"DC",
    social:{ twitter:"IndivisibleTeam" },
    founded:"2017", size:"6,000+ local chapters",
    events:[
      {id:"e3",title:"Lobby Day Training",date:"2026-03-20",desc:"Learn to effectively lobby your representatives."}
    ]
  },
  {
    id:3, status:"approved",
    name:"Sierra Club",
    description:"America's largest grassroots environmental organization, fighting climate change, protecting public lands, and opposing rollbacks of environmental regulations.",
    type:"Nonprofit", website:"https://sierraclub.org", email:"info@sierraclub.org",
    focusAreas:["Environment","Climate","Public Lands"],
    location:"National", state:"CA",
    social:{ twitter:"SierraClub", instagram:"sierraclub" },
    founded:"1892", size:"3.8M members",
    events:[
      {id:"e4",title:"Earth Day March — SF",date:"2026-04-22",desc:"March and rally in San Francisco for climate action."}
    ]
  },
  {
    id:4, status:"approved",
    name:"Planned Parenthood Action Fund",
    description:"Advocates for access to reproductive healthcare and fights legislation that restricts abortion rights and contraceptive access nationwide.",
    type:"Nonprofit", website:"https://plannedparenthoodaction.org", email:"",
    focusAreas:["Reproductive Rights","Healthcare","Civil Rights"],
    location:"National", state:"NY",
    social:{ twitter:"PPact", instagram:"ppact" },
    founded:"1970", size:"Millions of patients served",
    events:[]
  },
  {
    id:5, status:"pending",
    name:"New Sanctuary Coalition",
    description:"An interfaith network that accompanies undocumented immigrants through deportation defense, providing legal support and community solidarity.",
    type:"Faith-Based", website:"https://newsanctuarynyc.org", email:"contact@newsanctuarynyc.org",
    focusAreas:["Immigration","Civil Rights"],
    location:"New York, NY", state:"NY",
    social:{ twitter:"NewSanctuaryNYC" },
    founded:"2007", size:"500+ volunteers",
    events:[]
  }
];

const fmt = d => new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});

const typeClass = t => "tag tag-type-" + t.replace(/\s+/g,"-");

const TYPE_COLORS = {
  "Nonprofit":          { bg:"#e8f0f8", color:"#2c5f8a" },
  "PAC":                { bg:"#f0e8f8", color:"#6a3a9a" },
  "Informal Group":     { bg:"#fff4e0", color:"#a05a00" },
  "Coalition":          { bg:"#e8f8f0", color:"#1a7a50" },
  "Legal Organization": { bg:"#fde8e8", color:"#a02020" },
  "Media Organization": { bg:"#e8f8f8", color:"#1a6a7a" },
  "Faith-Based":        { bg:"#f8f0e8", color:"#8a5a20" },
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #f5f0e8;
    --bg2: #ede8de;
    --surface: #ffffff;
    --border: #d8d0c0;
    --text: #1a1710;
    --muted: #7a7060;
    --red: #c0392b;
    --red-light: #f9ebe9;
    --red-border: #e8c0bb;
    --blue: #2c5f8a;
    --blue-light: #e8f0f8;
    --green: #2a6644;
    --green-light: #e8f4ee;
  }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }
  h1,h2,h3,h4 { font-family: 'DM Serif Display', serif; font-weight: 400; }
  a { color: var(--blue); text-decoration: none; }
  a:hover { text-decoration: underline; }

  .app { min-height: 100vh; }

  /* NAV */
  .nav { background: var(--text); color: #f5f0e8; padding: 0 32px; display: flex; align-items: center; gap: 4px; position: sticky; top: 0; z-index: 200; }
  .nav-brand { font-family: 'DM Serif Display', serif; font-size: 20px; color: #f5f0e8; margin-right: 24px; padding: 18px 0; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .nav-brand span { color: var(--red); font-style: italic; }
  .nav-btn { padding: 8px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; letter-spacing: 0.04em; color: #b0a898; transition: color 0.15s, background 0.15s; border: none; background: none; font-family: 'DM Sans', sans-serif; }
  .nav-btn:hover { color: #f5f0e8; background: rgba(255,255,255,0.08); }
  .nav-btn.active { color: #f5f0e8; background: rgba(255,255,255,0.12); }
  .badge { background: var(--red); color: white; border-radius: 10px; padding: 1px 7px; font-size: 11px; margin-left: 5px; font-weight: 600; }

  /* LAYOUT */
  .page { max-width: 1140px; margin: 0 auto; padding: 0 24px 80px; }

  /* HERO */
  .hero { padding: 64px 0 48px; border-bottom: 1px solid var(--border); margin-bottom: 40px; }
  .hero-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--red); margin-bottom: 16px; }
  .hero-title { font-size: clamp(36px, 5vw, 64px); line-height: 1.05; margin-bottom: 20px; color: var(--text); }
  .hero-title em { font-style: italic; color: var(--red); }
  .hero-sub { font-size: 16px; color: var(--muted); max-width: 520px; line-height: 1.75; margin-bottom: 36px; }
  .stats { display: flex; gap: 32px; flex-wrap: wrap; }
  .stat { }
  .stat-n { font-family: 'DM Serif Display', serif; font-size: 40px; color: var(--red); line-height: 1; }
  .stat-l { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-top: 4px; }

  /* FILTERS */
  .filters { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  @media(max-width:800px){ .filters { grid-template-columns: 1fr 1fr; } }
  .filter-wrap { position: relative; }
  .filter-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 15px; pointer-events: none; }
  input, select, textarea {
    background: var(--surface); border: 1px solid var(--border); color: var(--text);
    padding: 10px 14px; border-radius: 6px; font-family: 'DM Sans', sans-serif;
    font-size: 14px; width: 100%; transition: border-color 0.15s;
  }
  .filter-wrap input { padding-left: 36px; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: var(--red); box-shadow: 0 0 0 3px rgba(192,57,43,0.1); }
  select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%237a7060'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }

  /* RESULTS */
  .results-meta { font-size: 13px; color: var(--muted); margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
  .clear-btn { color: var(--red); cursor: pointer; font-weight: 600; font-size: 13px; border: none; background: none; font-family: 'DM Sans', sans-serif; padding: 0; }

  /* CARDS */
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 20px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 24px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; }
  .card:hover { border-color: var(--red); box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-2px); }
  .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 10px; }
  .card-name { font-family: 'DM Serif Display', serif; font-size: 20px; line-height: 1.15; }
  .card-desc { font-size: 13.5px; color: var(--muted); line-height: 1.65; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .card-footer { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted); border-top: 1px solid var(--border); margin-top: 14px; padding-top: 12px; }
  .card-events { color: var(--blue); font-weight: 500; }

  /* TAGS */
  .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .tag { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.03em; }
  .tag-type-Nonprofit { background: #e8f0f8; color: #2c5f8a; border: 1px solid #b8d0e8; }
  .tag-type-PAC { background: #f0e8f8; color: #6a3a9a; border: 1px solid #d0b8e8; }
  .tag-type-Informal-Group { background: #fff4e0; color: #a05a00; border: 1px solid #f0d090; }
  .tag-type-Coalition { background: #e8f8f0; color: #1a7a50; border: 1px solid #a0dfc0; }
  .tag-type-Legal-Organization { background: #fde8e8; color: #a02020; border: 1px solid #f0b8b8; }
  .tag-type-Media-Organization { background: #e8f8f8; color: #1a6a7a; border: 1px solid #a0d8e0; }
  .tag-type-Faith-Based { background: #f8f0e8; color: #8a5a20; border: 1px solid #e0c898; }
  .legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .legend-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .tag-focus { background: var(--red-light); color: var(--red); border: 1px solid var(--red-border); }
  .tag-state { background: var(--green-light); color: var(--green); border: 1px solid #b0d8c0; }
  .tag-year { background: #f5f0dc; color: #80700a; border: 1px solid #e0d090; }

  /* BUTTONS */
  .btn { padding: 10px 22px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; letter-spacing: 0.04em; transition: all 0.15s; font-family: 'DM Sans', sans-serif; display: inline-flex; align-items: center; gap: 6px; }
  .btn-red { background: var(--red); color: white; }
  .btn-red:hover { background: #a93226; }
  .btn-outline { background: transparent; color: var(--text); border: 1px solid var(--border); }
  .btn-outline:hover { border-color: var(--red); color: var(--red); }
  .btn-green { background: var(--green-light); color: var(--green); border: 1px solid #b0d8c0; }
  .btn-green:hover { background: #d0eedd; }
  .btn-danger { background: var(--red-light); color: var(--red); border: 1px solid var(--red-border); }
  .btn-danger:hover { background: #f0d0cc; }
  .btn-sm { padding: 6px 14px; font-size: 12px; }

  /* ORG DETAIL */
  .org-header { background: var(--text); color: #f5f0e8; padding: 48px 0 36px; margin: 0 -24px 40px; padding-left: 24px; padding-right: 24px; }
  .org-header-inner { max-width: 1140px; margin: 0 auto; }
  .org-title { font-size: clamp(30px, 4vw, 50px); color: #f5f0e8; margin: 12px 0 16px; }
  .detail-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 48px; }
  @media(max-width:800px){ .detail-grid { grid-template-columns: 1fr; } }
  .section-head { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; color: var(--muted); margin-bottom: 12px; font-family: 'DM Sans', sans-serif; }
  .info-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .info-table tr { border-bottom: 1px solid var(--border); }
  .info-table td { padding: 10px 0; }
  .info-table td:first-child { color: var(--muted); width: 110px; }
  .divider { border: none; border-top: 1px solid var(--border); margin: 28px 0; }

  /* EVENTS */
  .event-item { border-left: 3px solid var(--red); padding: 12px 16px; background: var(--bg); border-radius: 0 6px 6px 0; margin-bottom: 10px; }
  .event-date { font-size: 11px; color: var(--red); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
  .event-title { font-weight: 600; font-size: 14px; margin-bottom: 3px; }
  .event-desc { font-size: 13px; color: var(--muted); }

  /* SUBMIT FORM */
  .form-section { margin-bottom: 28px; }
  .form-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; display: block; }
  .form-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media(max-width:600px){ .form-grid2 { grid-template-columns: 1fr; } }
  .cb-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
  @media(max-width:500px){ .cb-grid { grid-template-columns: repeat(2,1fr); } }
  .cb-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; transition: border-color 0.15s; font-size: 13px; }
  .cb-item.on { border-color: var(--red); background: var(--red-light); }
  .cb-item input { width: auto; accent-color: var(--red); cursor: pointer; }
  textarea { resize: vertical; line-height: 1.6; }

  /* ADMIN */
  .admin-tabs { display: flex; gap: 8px; margin-bottom: 32px; }
  .pending-card { background: var(--surface); border: 1px solid #e8d8b0; border-radius: 10px; padding: 24px; margin-bottom: 16px; }
  .pending-actions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }

  /* API DOCS */
  .endpoint { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 24px; margin-bottom: 18px; }
  .ep-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .ep-method { background: var(--green-light); color: var(--green); border: 1px solid #b0d8c0; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; }
  .ep-name { font-family: 'Courier New', monospace; color: var(--blue); font-size: 15px; font-weight: 600; }
  .ep-desc { font-size: 13.5px; color: var(--muted); margin-bottom: 12px; line-height: 1.6; }
  .code { background: #1a1710; color: #80d890; border-radius: 6px; padding: 16px; font-family: 'Courier New', monospace; font-size: 13px; overflow-x: auto; white-space: pre; line-height: 1.6; }

  /* TOAST */
  .toast { position: fixed; bottom: 32px; right: 32px; padding: 14px 22px; border-radius: 8px; font-weight: 600; font-size: 14px; z-index: 999; animation: toastIn 0.25s ease; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
  .toast-ok { background: var(--green-light); color: var(--green); border: 1px solid #b0d8c0; }
  .toast-err { background: var(--red-light); color: var(--red); border: 1px solid var(--red-border); }
  @keyframes toastIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  /* EMPTY */
  .empty { text-align: center; padding: 80px 0; color: var(--muted); }
  .empty-icon { font-size: 48px; margin-bottom: 16px; }
`;

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [view, setView] = useState("directory");
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ q:"", type:"", state:"", focus:"", month:"" });
  const [adminTab, setAdminTab] = useState("pending");
  const [toast, setToast] = useState(null);

  // Load all orgs from Supabase on mount
  useEffect(() => {
    sb.getAll()
      .then(rows => { setOrgs(rows.map(fromDB)); setLoading(false); })
      .catch(e => { setDbError("Could not connect to database."); setLoading(false); });
  }, []);

  const approved = useMemo(() => orgs.filter(o => o.status === "approved"), [orgs]);
  const pending = useMemo(() => orgs.filter(o => o.status === "pending"), [orgs]);

  const filtered = useMemo(() => approved.filter(o => {
    if (filters.q && !o.name.toLowerCase().includes(filters.q.toLowerCase()) && !o.description.toLowerCase().includes(filters.q.toLowerCase())) return false;
    if (filters.type && o.type !== filters.type) return false;
    if (filters.state && o.state !== filters.state) return false;
    if (filters.focus && !o.focusAreas.includes(filters.focus)) return false;
    if (filters.month && !o.events.some(e => e.date.startsWith(filters.month))) return false;
    return true;
  }), [approved, filters]);

  useEffect(() => {
    window.__RESISTANCE_API = {
      getAll: () => approved,
      getById: id => approved.find(o => o.id === id) ?? null,
      search: ({ q="", type="", state="", focus="" }={}) => approved.filter(o =>
        (!q || o.name.toLowerCase().includes(q.toLowerCase()) || o.description.toLowerCase().includes(q.toLowerCase())) &&
        (!type || o.type === type) && (!state || o.state === state) &&
        (!focus || o.focusAreas.includes(focus))
      ),
      getEvents: ({ from="", to="" }={}) => approved
        .flatMap(o => o.events.map(e => ({ ...e, orgId: o.id, orgName: o.name })))
        .filter(e => (!from || e.date >= from) && (!to || e.date <= to))
        .sort((a,b) => a.date.localeCompare(b.date)),
    };
  }, [approved]);

  const toast$ = (msg, err=false) => { setToast({msg,err}); setTimeout(()=>setToast(null),3500); };
  const filt = (k,v) => setFilters(f => ({...f,[k]:v}));
  const clearFilters = () => setFilters({q:"",type:"",state:"",focus:"",month:""});
  const hasFilter = Object.values(filters).some(Boolean);
  const openOrg = o => { setSelected(o); setView("org"); };

  const approve = async id => {
    try {
      await sb.update(id, { status: "approved" });
      setOrgs(p => p.map(o => o.id===id ? {...o, status:"approved"} : o));
      toast$("Organization approved.");
    } catch { toast$("Failed to approve.", true); }
  };

  const remove = async id => {
    try {
      await sb.delete(id);
      setOrgs(p => p.filter(o => o.id!==id));
      toast$("Organization removed.", true);
    } catch { toast$("Failed to remove.", true); }
  };

  const submitOrg = async data => {
    try {
      const rows = await sb.insert(toDB({ ...data, status: "pending" }));
      setOrgs(p => [...p, fromDB(rows[0])]);
      setView("directory");
      toast$("Submitted! It'll appear after admin review.");
    } catch { toast$("Submission failed. Please try again.", true); }
  };

  const importOrgs = async batch => {
    try {
      const rows = await Promise.all(batch.map(o => sb.insert(toDB(o))));
      setOrgs(p => [...p, ...rows.map(r => fromDB(r[0]))]);
      toast$(`${batch.length} org${batch.length!==1?"s":""} added to pending queue.`);
      setAdminTab("pending");
    } catch { toast$("Import failed. Please try again.", true); }
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f5f0e8",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:16}}>⏳</div>
        <p style={{color:"#7a7060",fontSize:16}}>Connecting to database…</p>
      </div>
    </div>
  );

  if (dbError) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f5f0e8",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:400}}>
        <div style={{fontSize:36,marginBottom:16}}>⚠️</div>
        <p style={{color:"#c0392b",fontSize:16,fontWeight:600}}>{dbError}</p>
        <p style={{color:"#7a7060",fontSize:14,marginTop:8}}>Check your Supabase configuration and try refreshing.</p>
      </div>
    </div>
  );

  return (
    <div className="app">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-brand" onClick={() => setView("directory")}>
          Resistance<span>DB</span>
        </div>
        {[["directory","Directory"],["submit","Submit Org"],["api","API Docs"],["admin","Admin"]].map(([v,l]) => (
          <button key={v} className={`nav-btn${view===v?" active":""}`} onClick={() => setView(v)}>
            {l}{v==="admin" && pending.length > 0 && <span className="badge">{pending.length}</span>}
          </button>
        ))}
      </nav>

      <div className="page">

        {/* ── DIRECTORY ── */}
        {view === "directory" && <>
          <div className="hero">
            <p className="hero-eyebrow">The Resistance Directory</p>
            <h1 className="hero-title">Organizations <em>fighting back</em><br/>against the Trump administration</h1>
            <p className="hero-sub">A searchable database of nonprofits, coalitions, informal groups, and organizations actively opposing Trump Administration policies.</p>
            <div style={{marginBottom:32}}>
              <p className="legend-title">Organization Type Key</p>
              <div className="legend">
                {ORG_TYPES.map(t => (
                  <span key={t} className={typeClass(t)} style={{display:"inline-block",padding:"4px 11px",borderRadius:20,fontSize:12,fontWeight:600}}>{t}</span>
                ))}
              </div>
            </div>

            <div className="stats">
              <div className="stat"><div className="stat-n">{approved.length}</div><div className="stat-l">Organizations</div></div>
              <div className="stat"><div className="stat-n">{approved.flatMap(o=>o.events).length}</div><div className="stat-l">Events</div></div>
              <div className="stat"><div className="stat-n">{[...new Set(approved.flatMap(o=>o.focusAreas))].length}</div><div className="stat-l">Focus Areas</div></div>
            </div>
          </div>

          <div className="filters">
            <div className="filter-wrap">
              <span className="filter-icon">⌕</span>
              <input placeholder="Search organizations…" value={filters.q} onChange={e=>filt("q",e.target.value)} />
            </div>
            <select value={filters.type} onChange={e=>filt("type",e.target.value)}>
              <option value="">All Types</option>
              {ORG_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <select value={filters.state} onChange={e=>filt("state",e.target.value)}>
              <option value="">All States</option>
              {US_STATES.map(s=><option key={s}>{s}</option>)}
            </select>
            <select value={filters.focus} onChange={e=>filt("focus",e.target.value)}>
              <option value="">All Focus Areas</option>
              {FOCUS_AREAS.map(a=><option key={a}>{a}</option>)}
            </select>
            <div className="filter-wrap" style={{position:"relative"}}>
              <input type="month" value={filters.month} onChange={e=>filt("month",e.target.value)} style={{paddingTop:20,paddingBottom:4}} />
              <span style={{position:"absolute",top:6,left:14,fontSize:10,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:"var(--muted)",pointerEvents:"none"}}>Event Month</span>
            </div>
          </div>

          <div className="results-meta">
            Showing <strong style={{margin:"0 4px"}}>{filtered.length}</strong> organization{filtered.length!==1?"s":""}
            {hasFilter && <button className="clear-btn" onClick={clearFilters}>✕ Clear filters</button>}
          </div>

          <div className="grid">
            {filtered.map(org => (
              <div key={org.id} className="card" onClick={()=>openOrg(org)}>
                <div className="card-top">
                  <h3 className="card-name">{org.name}</h3>
                  <span className={typeClass(org.type)}>{org.type}</span>
                </div>
                <p className="card-desc">{org.description}</p>
                <div className="tags">
                  {org.focusAreas.slice(0,3).map(a=><span key={a} className="tag tag-focus">{a}</span>)}
                </div>
                <div className="card-footer">
                  <span>📍 {org.location}</span>
                  {org.events.length>0 && <span className="card-events">📅 {org.events.length} event{org.events.length!==1?"s":""}</span>}
                </div>
              </div>
            ))}
          </div>

          {filtered.length===0 && (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <p style={{fontSize:18,marginBottom:8}}>No organizations match your filters.</p>
              <button className="clear-btn" onClick={clearFilters}>Clear all filters</button>
            </div>
          )}
        </>}

        {/* ── ORG DETAIL ── */}
        {view === "org" && selected && (
          <div>
            <div className="org-header">
              <div className="org-header-inner">
                <button className="btn btn-outline" style={{borderColor:"rgba(255,255,255,0.2)",color:"#b0a898",background:"transparent"}} onClick={()=>{setView("directory");setSelected(null);}}>← Back</button>
                <h1 className="org-title">{selected.name}</h1>
                <div className="tags">
                  <span className={typeClass(selected.type)}>{selected.type}</span>
                  {selected.state && <span className="tag tag-state">📍 {selected.location}</span>}
                  {selected.founded && <span className="tag tag-year">Est. {selected.founded}</span>}
                </div>
              </div>
            </div>

            <div className="detail-grid">
              <div>
                <p className="section-head">About</p>
                <p style={{lineHeight:1.8,color:"#3a3020",fontSize:15,marginBottom:24}}>{selected.description}</p>

                <p className="section-head">Focus Areas</p>
                <div className="tags" style={{marginBottom:24}}>
                  {selected.focusAreas.map(a=><span key={a} className="tag tag-focus" style={{fontSize:12}}>{a}</span>)}
                </div>

                <hr className="divider"/>
                <p className="section-head">Details</p>
                <table className="info-table">
                  <tbody>
                    {[["Type",selected.type],["Location",selected.location],["State",selected.state],["Size",selected.size],["Founded",selected.founded],["Email",selected.email]].filter(([,v])=>v).map(([k,v])=>(
                      <tr key={k}><td>{k}</td><td>{v}</td></tr>
                    ))}
                    {selected.website && <tr><td>Website</td><td><a href={selected.website} target="_blank" rel="noreferrer">{selected.website}</a></td></tr>}
                  </tbody>
                </table>

                {(selected.social?.twitter || selected.social?.instagram) && <>
                  <hr className="divider"/>
                  <p className="section-head">Social Media</p>
                  {selected.social.twitter && <p style={{fontSize:14,marginBottom:6}}>𝕏 <a href={`https://twitter.com/${selected.social.twitter}`} target="_blank" rel="noreferrer">@{selected.social.twitter}</a></p>}
                  {selected.social.instagram && <p style={{fontSize:14}}>📷 <a href={`https://instagram.com/${selected.social.instagram}`} target="_blank" rel="noreferrer">@{selected.social.instagram}</a></p>}
                </>}

                {selected.website && <div style={{marginTop:24}}>
                  <a href={selected.website} target="_blank" rel="noreferrer"><button className="btn btn-red">Visit Website →</button></a>
                </div>}
              </div>

              <div>
                <p className="section-head">Events</p>
                {selected.events.length===0 && <p style={{fontSize:14,color:"var(--muted)"}}>No events listed.</p>}
                {[...selected.events].sort((a,b)=>a.date.localeCompare(b.date)).map(ev=>(
                  <div key={ev.id} className="event-item">
                    <div className="event-date">{fmt(ev.date)}</div>
                    <div className="event-title">{ev.title}</div>
                    <div className="event-desc">{ev.desc}</div>
                  </div>
                ))}

                <hr className="divider"/>
                <p className="section-head">API Preview</p>
                <div className="code">{JSON.stringify({id:selected.id,name:selected.name,type:selected.type,state:selected.state,focusAreas:selected.focusAreas},null,2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── SUBMIT ── */}
        {view === "submit" && <SubmitForm onSubmit={submitOrg} onCancel={()=>setView("directory")} />}

        {/* ── API DOCS ── */}
        {view === "api" && <ApiDocs />}

        {/* ── ADMIN ── */}
        {view === "admin" && (
          <div style={{paddingTop:40}}>
            <p className="section-head">Admin Panel</p>
            <h2 style={{fontSize:36,marginBottom:32}}>Moderation Queue</h2>
            <div className="admin-tabs">
              {[["pending",`Pending (${pending.length})`],["approved",`Approved (${approved.length})`],["import","⬇ Import from ProPublica"]].map(([t,l])=>(
                <button key={t} className={`btn ${adminTab===t?"btn-red":"btn-outline"}`} onClick={()=>setAdminTab(t)}>{l}</button>
              ))}
            </div>

            {adminTab==="pending" && (
              pending.length===0
                ? <p style={{color:"var(--muted)"}}>No pending submissions 🎉</p>
                : pending.map(org=>(
                  <div key={org.id} className="pending-card">
                    <div style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                      <div style={{flex:1}}>
                        <h3 style={{fontSize:22,marginBottom:8}}>{org.name}</h3>
                        <div className="tags" style={{marginBottom:10}}>
                          <span className={typeClass(org.type)}>{org.type}</span>
                          <span className="tag tag-state">{org.state}</span>
                          {org.focusAreas.map(a=><span key={a} className="tag tag-focus">{a}</span>)}
                        </div>
                        <p style={{fontSize:14,color:"var(--muted)",lineHeight:1.65,maxWidth:540}}>{org.description}</p>
                        {org.website && <p style={{fontSize:13,color:"var(--blue)",marginTop:8}}>🌐 {org.website}</p>}
                        {org.email && <p style={{fontSize:13,color:"var(--muted)",marginTop:4}}>✉ {org.email}</p>}
                      </div>
                      <div className="pending-actions">
                        <button className="btn btn-green" onClick={()=>approve(org.id)}>✓ Approve</button>
                        <button className="btn btn-danger" onClick={()=>remove(org.id)}>✕ Reject</button>
                        <button className="btn btn-outline btn-sm" onClick={()=>openOrg(org)}>Preview →</button>
                      </div>
                    </div>
                  </div>
                ))
            )}

            {adminTab==="approved" && (
              <div>
                {approved.map(org=>(
                  <div key={org.id} style={{background:"white",border:"1px solid var(--border)",borderRadius:8,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div>
                      <strong style={{fontSize:16}}>{org.name}</strong>
                      <span className={typeClass(org.type)} style={{marginLeft:10}}>{org.type}</span>
                      <span className="tag tag-state">{org.state}</span>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn btn-outline btn-sm" onClick={()=>openOrg(org)}>View</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>remove(org.id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {adminTab==="import" && (
              <ProPublicaImporter
                existingIds={orgs.map(o=>o.ein).filter(Boolean)}
                onImport={importOrgs}
              />
            )}
          </div>
        )}

      </div>

      {toast && <div className={`toast ${toast.err?"toast-err":"toast-ok"}`}>{toast.msg}</div>}
    </div>
  );
}

// ─── SUBMIT FORM ──────────────────────────────────────────────────────────────
function SubmitForm({ onSubmit, onCancel }) {
  const [f, setF] = useState({
    name:"", description:"", type:"", website:"", email:"",
    focusAreas:[], location:"", state:"", founded:"", size:"",
    social:{ twitter:"", instagram:"" }, events:[]
  });
  const [newEv, setNewEv] = useState({ title:"", date:"", desc:"" });
  const [addingEv, setAddingEv] = useState(false);

  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const toggleFocus = a => set("focusAreas", f.focusAreas.includes(a) ? f.focusAreas.filter(x=>x!==a) : [...f.focusAreas, a]);
  const addEvent = () => {
    if (!newEv.title || !newEv.date) return;
    set("events", [...f.events, {...newEv, id:`ev-${Date.now()}`}]);
    setNewEv({title:"",date:"",desc:""}); setAddingEv(false);
  };
  const submit = () => {
    if (!f.name.trim() || !f.description.trim() || !f.type) { alert("Please fill in Name, Description, and Type."); return; }
    onSubmit(f);
  };

  return (
    <div style={{paddingTop:40,maxWidth:720}}>
      <p className="section-head">Submit an Organization</p>
      <h2 style={{fontSize:36,marginBottom:8}}>Add to the Directory</h2>
      <p style={{color:"var(--muted)",marginBottom:40,lineHeight:1.7}}>Submissions are reviewed before appearing publicly. Provide as much detail as possible.</p>

      <div className="form-section">
        <label className="form-label">Organization Name *</label>
        <input value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Full official name" />
      </div>
      <div className="form-section">
        <label className="form-label">Description *</label>
        <textarea rows={4} value={f.description} onChange={e=>set("description",e.target.value)} placeholder="What does this org do? Who do they serve? Why are they relevant?" />
      </div>
      <div className="form-section">
        <div className="form-grid2">
          <div>
            <label className="form-label">Organization Type *</label>
            <select value={f.type} onChange={e=>set("type",e.target.value)}>
              <option value="">Select…</option>
              {ORG_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">State</label>
            <select value={f.state} onChange={e=>set("state",e.target.value)}>
              <option value="">Select…</option>
              {US_STATES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="form-section">
        <label className="form-label">Location</label>
        <input value={f.location} onChange={e=>set("location",e.target.value)} placeholder="e.g. Chicago, IL or National" />
      </div>
      <div className="form-section">
        <div className="form-grid2">
          <div>
            <label className="form-label">Website</label>
            <input value={f.website} onChange={e=>set("website",e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="form-label">Contact Email</label>
            <input value={f.email} onChange={e=>set("email",e.target.value)} placeholder="contact@org.org" />
          </div>
        </div>
      </div>
      <div className="form-section">
        <div className="form-grid2">
          <div>
            <label className="form-label">Founded (Year)</label>
            <input value={f.founded} onChange={e=>set("founded",e.target.value)} placeholder="e.g. 2017" />
          </div>
          <div>
            <label className="form-label">Size / Membership</label>
            <input value={f.size} onChange={e=>set("size",e.target.value)} placeholder="e.g. 5,000+ members" />
          </div>
        </div>
      </div>
      <div className="form-section">
        <div className="form-grid2">
          <div>
            <label className="form-label">Twitter / X Handle</label>
            <input value={f.social.twitter} onChange={e=>set("social",{...f.social,twitter:e.target.value})} placeholder="handle (no @)" />
          </div>
          <div>
            <label className="form-label">Instagram Handle</label>
            <input value={f.social.instagram} onChange={e=>set("social",{...f.social,instagram:e.target.value})} placeholder="handle (no @)" />
          </div>
        </div>
      </div>
      <div className="form-section">
        <label className="form-label">Focus Areas</label>
        <div className="cb-grid">
          {FOCUS_AREAS.map(a=>(
            <label key={a} className={`cb-item ${f.focusAreas.includes(a)?"on":""}`}>
              <input type="checkbox" checked={f.focusAreas.includes(a)} onChange={()=>toggleFocus(a)} />
              {a}
            </label>
          ))}
        </div>
      </div>
      <div className="form-section">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <label className="form-label" style={{marginBottom:0}}>Events (Optional)</label>
          <button className="btn btn-outline btn-sm" onClick={()=>setAddingEv(true)}>+ Add Event</button>
        </div>
        {f.events.map(ev=>(
          <div key={ev.id} className="event-item" style={{display:"flex",justifyContent:"space-between"}}>
            <div><strong>{ev.title}</strong> — {ev.date}</div>
            <span style={{cursor:"pointer",color:"var(--red)"}} onClick={()=>set("events",f.events.filter(e=>e.id!==ev.id))}>✕</span>
          </div>
        ))}
        {addingEv && (
          <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,padding:16,marginTop:10}}>
            <div className="form-grid2" style={{marginBottom:12}}>
              <input placeholder="Event title" value={newEv.title} onChange={e=>setNewEv(n=>({...n,title:e.target.value}))} />
              <input type="date" value={newEv.date} onChange={e=>setNewEv(n=>({...n,date:e.target.value}))} />
            </div>
            <input placeholder="Brief description (optional)" value={newEv.desc} onChange={e=>setNewEv(n=>({...n,desc:e.target.value}))} style={{marginBottom:12}} />
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-red btn-sm" onClick={addEvent}>Add</button>
              <button className="btn btn-outline btn-sm" onClick={()=>setAddingEv(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:12,paddingTop:8,borderTop:"1px solid var(--border)"}}>
        <button className="btn btn-red" onClick={submit}>Submit for Review →</button>
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── API DOCS ─────────────────────────────────────────────────────────────────
function ApiDocs() {
  return (
    <div style={{paddingTop:40}}>
      <p className="section-head">Developer Reference</p>
      <h2 style={{fontSize:36,marginBottom:8}}>API Documentation</h2>
      <p style={{color:"var(--muted)",marginBottom:40,lineHeight:1.7,maxWidth:600}}>
        The ResistanceDB API is exposed via <code style={{background:"var(--bg2)",padding:"2px 6px",borderRadius:3,fontSize:13}}>window.__RESISTANCE_API</code> in the browser. In production, these map directly to REST endpoints returning JSON.
      </p>

      {[
        { method:"GET", name:".getAll()", desc:"Returns all approved organizations as an array of objects.", code:`const orgs = window.__RESISTANCE_API.getAll();\n// Returns: Array<Org>` },
        { method:"GET", name:".getById(id)", desc:"Returns a single organization by its numeric ID, or null if not found.", code:`const org = window.__RESISTANCE_API.getById(1);\n// Returns: Org | null` },
        { method:"GET", name:".search(params)", desc:"Filter organizations. All params optional: q (keyword), type, state, focus.", code:`const results = window.__RESISTANCE_API.search({\n  state: "NY",\n  focus: "Immigration"\n});\n// Returns: Array<Org>` },
        { method:"GET", name:".getEvents(params)", desc:"Returns events across all orgs, sorted by date. Optional: from, to (YYYY-MM-DD).", code:`const events = window.__RESISTANCE_API.getEvents({\n  from: "2026-04-01",\n  to: "2026-04-30"\n});\n// Returns: Array<Event & { orgId, orgName }>` },
      ].map(ep=>(
        <div key={ep.name} className="endpoint">
          <div className="ep-head">
            <span className="ep-method">{ep.method}</span>
            <span className="ep-name">{ep.name}</span>
          </div>
          <p className="ep-desc">{ep.desc}</p>
          <div className="code">{ep.code}</div>
        </div>
      ))}

      <div className="endpoint" style={{marginTop:32}}>
        <p className="section-head" style={{marginBottom:12}}>Sample Org Object</p>
        <div className="code">{JSON.stringify({
          id:1, name:"ACLU", description:"...", type:"Nonprofit",
          website:"https://aclu.org", email:"info@aclu.org",
          focusAreas:["Civil Rights","Immigration","Voting Rights"],
          state:"NY", location:"National", founded:"1920", size:"500,000+ members",
          social:{ twitter:"ACLU", instagram:"aclu_nationwide" },
          events:[{ id:"e1", title:"Know Your Rights Workshop", date:"2026-04-10", desc:"..." }]
        }, null, 2)}</div>
      </div>

      <div style={{marginTop:32,padding:24,background:"#fffbf0",border:"1px solid #e8d890",borderRadius:8}}>
        <strong style={{color:"#806010"}}>🔌 Production Deployment</strong>
        <p style={{fontSize:14,color:"#806010",marginTop:8,lineHeight:1.7}}>
          In a full backend deployment (e.g. Supabase, Firebase, or a custom Node.js API), the methods above correspond to REST endpoints like <code>GET /api/orgs</code>, <code>GET /api/orgs/:id</code>, and <code>GET /api/events</code> — all returning JSON with the same shape as the sample object above.
        </p>
      </div>
    </div>
  );
}

// ─── PROPUBLICA IMPORTER ──────────────────────────────────────────────────────
const NTEE_CATEGORIES = [
  { label: "Civil Rights & Advocacy", code: "R" },
  { label: "Environment & Climate", code: "C" },
  { label: "Health & Reproductive Rights", code: "E" },
  { label: "Immigration & Refugees", code: "P" },
  { label: "Legal Aid & Civil Liberties", code: "I" },
  { label: "Voter Rights & Democracy", code: "W" },
  { label: "LGBTQ+ Rights", code: "R26" },
  { label: "Labor & Workers Rights", code: "J" },
  { label: "Media & Journalism", code: "X" },
  { label: "Community & Social Action", code: "S" },
];

const STATE_NTEE_TO_FOCUS = {
  "R": ["Civil Rights"], "C": ["Environment","Climate"], "E": ["Healthcare","Reproductive Rights"],
  "P": ["Immigration"], "I": ["Civil Rights","Legal"], "W": ["Voting Rights","Democracy"],
  "J": ["Labor"], "X": ["Media"], "S": ["Civil Rights"],
};

function ProPublicaImporter({ existingIds, onImport }) {
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!keyword && !category) { setError("Enter a keyword or select a category."); return; }
    setLoading(true); setError(""); setResults([]); setSelected(new Set()); setSearched(false);
    try {
      const q = keyword || NTEE_CATEGORIES.find(c=>c.code===category)?.label || "";
      const stateParam = state && state !== "National" ? `&state_ab=${state}` : "";
      const url = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(q)}${stateParam}&per_page=25`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const orgs = (data.organizations || []).filter(o => !existingIds.includes(o.ein));
      setResults(orgs);
      setSearched(true);
      if (orgs.length === 0) setError("No results found. Try a different keyword or category.");
    } catch(e) {
      setError("Could not reach ProPublica API. Please try again.");
    }
    setLoading(false);
  };



  const toggleSelect = ein => setSelected(s => {
    const n = new Set(s);
    n.has(ein) ? n.delete(ein) : n.add(ein);
    return n;
  });

  const selectAll = () => setSelected(new Set(results.map(r=>r.ein)));
  const clearAll = () => setSelected(new Set());

  const importSelected = () => {
    const toImport = results
      .filter(r => selected.has(r.ein))
      .map(r => ({
        id: Date.now() + Math.random(),
        ein: r.ein,
        status: "pending",
        name: r.name,
        description: r.city ? `${r.name} is a nonprofit organization based in ${r.city}, ${r.state}.` : `${r.name} is a registered nonprofit organization.`,
        type: "Nonprofit",
        website: "",
        email: "",
        focusAreas: STATE_NTEE_TO_FOCUS[r.ntee_code?.[0]] || ["Civil Rights"],
        location: r.city ? `${r.city}, ${r.state}` : r.state || "Unknown",
        state: r.state || "",
        social: { twitter:"", instagram:"" },
        founded: r.ruling_date ? r.ruling_date.toString().slice(0,4) : "",
        size: r.income_amount ? `Revenue: $${Number(r.income_amount).toLocaleString()}` : "",
        events: [],
        _source: "ProPublica",
      }));
    onImport(toImport);
  };

  return (
    <div>
      <div style={{background:"var(--blue-light)",border:"1px solid #b8d0e8",borderRadius:8,padding:20,marginBottom:28}}>
        <strong style={{color:"var(--blue)"}}>📡 ProPublica Nonprofit Explorer</strong>
        <p style={{fontSize:13,color:"var(--blue)",marginTop:6,lineHeight:1.6}}>
          Search 1.8M+ registered nonprofits. Results land in your <strong>Pending</strong> queue — you review and approve before anything goes live.
        </p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:12,marginBottom:20,alignItems:"end"}}>
        <div>
          <label className="form-label">Keyword Search</label>
          <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder='e.g. "voting rights" or "immigration"'
            onKeyDown={e=>e.key==="Enter"&&search()} />
        </div>
        <div>
          <label className="form-label">Category (NTEE)</label>
          <select value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="">Any category</option>
            {NTEE_CATEGORIES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">State</label>
          <select value={state} onChange={e=>setState(e.target.value)}>
            <option value="">All States</option>
            {US_STATES.filter(s=>s!=="National").map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-red" onClick={search} disabled={loading} style={{height:42}}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <p style={{color:"var(--red)",fontSize:14,marginBottom:16}}>{error}</p>}

      {results.length > 0 && (
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <p style={{fontSize:14,color:"var(--muted)"}}>
              Found <strong style={{color:"var(--text)"}}>{results.length}</strong> organizations
              {selected.size > 0 && <span style={{marginLeft:8,color:"var(--blue)",fontWeight:600}}>{selected.size} selected</span>}
            </p>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-outline btn-sm" onClick={selectAll}>Select All</button>
              <button className="btn btn-outline btn-sm" onClick={clearAll}>Clear</button>
              {selected.size > 0 && (
                <button className="btn btn-red btn-sm" onClick={importSelected}>
                  ⬇ Import {selected.size} to Queue
                </button>
              )}
            </div>
          </div>

          <div style={{display:"grid",gap:10}}>
            {results.map(org => {
              const isSel = selected.has(org.ein);
              return (
                <div key={org.ein} onClick={()=>toggleSelect(org.ein)}
                  style={{background: isSel ? "#e8f4ee" : "white", border: `1px solid ${isSel?"#a0dfc0":"var(--border)"}`,
                    borderRadius:8, padding:"14px 18px", cursor:"pointer", transition:"all 0.15s",
                    display:"flex", alignItems:"center", gap:16}}>
                  <input type="checkbox" checked={isSel} onChange={()=>toggleSelect(org.ein)}
                    style={{flexShrink:0,accentColor:"var(--green)",width:18,height:18}} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
                      <strong style={{fontSize:15}}>{org.name}</strong>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        {org.state && <span className="tag tag-state">{org.state}</span>}
                        {org.ntee_code && <span className="tag" style={{background:"#f0f0f8",color:"#5050a0",border:"1px solid #d0d0f0",fontSize:11}}>NTEE: {org.ntee_code}</span>}
                      </div>
                    </div>
                    <div style={{fontSize:13,color:"var(--muted)",marginTop:4,display:"flex",gap:16,flexWrap:"wrap"}}>
                      {org.city && <span>📍 {org.city}, {org.state}</span>}
                      {org.ein && <span>EIN: {org.ein}</span>}
                      {org.income_amount > 0 && <span>Revenue: ${Number(org.income_amount).toLocaleString()}</span>}
                      {org.ruling_date && <span>Est. {org.ruling_date.toString().slice(0,4)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div style={{marginTop:20,padding:"16px 20px",background:"var(--green-light)",border:"1px solid #b0d8c0",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{fontSize:14,color:"var(--green)",fontWeight:600}}>{selected.size} organization{selected.size!==1?"s":""} ready to import into pending queue</p>
              <button className="btn btn-red" onClick={importSelected}>⬇ Import to Queue →</button>
            </div>
          )}
        </>
      )}

      {searched && results.length === 0 && !error && (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <p>No new organizations found. Try a different keyword.</p>
        </div>
      )}
    </div>
  );
}
