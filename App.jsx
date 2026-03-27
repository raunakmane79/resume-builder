import { useState } from "react";

// ── API helpers ──────────────────────────────────────────────────
const BASE = "http://localhost:8000";

const api = {
  extractKeywords: (jd) =>
    fetch(`${BASE}/extract-keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_description: jd }),
    }).then((r) => r.json()),

  parseResume: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE}/parse-resume`, { method: "POST", body: fd }).then((r) => r.json());
  },

  suggestRewrites: (bullet, keywords) =>
    fetch(`${BASE}/suggest-rewrites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bullet, keywords }),
    }).then((r) => r.json()),

  exportPDF: (sections) =>
    fetch(`${BASE}/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections }),
    }).then((r) => r.blob()),
};

// ── Keyword Tag ──────────────────────────────────────────────────
function Tag({ label, color = "blue", onRemove }) {
  const colors = {
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    green: "bg-green-100 text-green-800 border-green-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    red: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${colors[color]}`}>
      {label}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-60 ml-0.5">×</button>
      )}
    </span>
  );
}

// ── Bullet Block (Lego piece) ────────────────────────────────────
function BulletBlock({ bullet, allKeywords, sectionKey, index, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(bullet);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const flatKeywords = Object.values(allKeywords).flat();

  // Highlight matched keywords in bullet text
  const highlightBullet = (text) => {
    if (!flatKeywords.length) return text;
    const pattern = new RegExp(`(${flatKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(pattern);
    return parts.map((part, i) =>
      pattern.test(part)
        ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
        : part
    );
  };

  const handleSuggest = async () => {
    setLoading(true);
    setShowSuggestions(true);
    try {
      const result = await api.suggestRewrites(bullet, flatKeywords.slice(0, 20));
      setSuggestions(result.rewrites || []);
    } catch {
      setSuggestions(["Error fetching suggestions. Check backend."]);
    }
    setLoading(false);
  };

  const acceptSuggestion = (s) => {
    onUpdate(sectionKey, index, s);
    setEditText(s);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const saveEdit = () => {
    onUpdate(sectionKey, index, editText);
    setEditing(false);
  };

  return (
    <div className="group border border-gray-200 rounded-lg bg-white hover:border-blue-300 transition-all mb-2 overflow-hidden">
      {/* Main bullet row */}
      <div className="flex items-start gap-2 p-3">
        <span className="text-gray-400 mt-0.5 flex-shrink-0">▸</span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <textarea
              className="w-full text-sm border border-blue-300 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={2}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
            />
          ) : (
            <p className="text-sm text-gray-800 leading-relaxed">{highlightBullet(bullet)}</p>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {editing ? (
            <>
              <button onClick={saveEdit} className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">Save</button>
              <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="Edit manually">✏️</button>
              <button onClick={handleSuggest} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" title="AI Suggest">✨ AI</button>
            </>
          )}
        </div>
      </div>

      {/* Suggestion panel */}
      {showSuggestions && (
        <div className="border-t border-blue-100 bg-blue-50 p-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <span className="animate-spin">⟳</span> Generating suggestions...
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-blue-700 mb-2">✨ AI Suggestions — click to use:</p>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => acceptSuggestion(s)}
                  className="cursor-pointer bg-white border border-blue-200 rounded p-2 text-sm text-gray-800 hover:bg-blue-100 hover:border-blue-400 transition-all flex items-start gap-2"
                >
                  <span className="text-blue-400 flex-shrink-0">{i + 1}.</span>
                  <span>{s}</span>
                </div>
              ))}
              <button onClick={() => setShowSuggestions(false)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Dismiss</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section Panel ────────────────────────────────────────────────
function SectionPanel({ title, bullets, sectionKey, allKeywords, onUpdate, onAddBullet }) {
  const [newBullet, setNewBullet] = useState("");

  const addBullet = () => {
    if (newBullet.trim()) {
      onAddBullet(sectionKey, newBullet.trim());
      setNewBullet("");
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-blue-500 rounded inline-block"></span>
        {title}
        <span className="text-xs font-normal normal-case text-gray-400">({bullets.length} items)</span>
      </h3>
      {bullets.length === 0 && (
        <p className="text-sm text-gray-400 italic mb-2">No content parsed. Add manually below.</p>
      )}
      {bullets.map((b, i) => (
        <BulletBlock
          key={`${sectionKey}-${i}`}
          bullet={b}
          allKeywords={allKeywords}
          sectionKey={sectionKey}
          index={i}
          onUpdate={onUpdate}
        />
      ))}
      {/* Add new bullet */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          className="flex-1 text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Add a bullet point..."
          value={newBullet}
          onChange={(e) => setNewBullet(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addBullet()}
        />
        <button onClick={addBullet} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">+ Add</button>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(1); // 1=JD, 2=Keywords, 3=Resume, 4=Editor

  // JD & Keywords
  const [jd, setJd] = useState("");
  const [keywords, setKeywords] = useState({ skills: [], tools: [], action_verbs: [], domain_terms: [] });
  const [loadingKw, setLoadingKw] = useState(false);

  // Resume
  const [sections, setSections] = useState({ summary: [], skills: [], experience: [], projects: [], education: [] });
  const [loadingResume, setLoadingResume] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  const handleExtractKeywords = async () => {
    if (!jd.trim()) return;
    setLoadingKw(true);
    try {
      const result = await api.extractKeywords(jd);
      setKeywords(result);
      setStep(2);
    } catch {
      alert("Error connecting to backend. Is FastAPI running on port 8000?");
    }
    setLoadingKw(false);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingResume(true);
    try {
      const result = await api.parseResume(file);
      if (result.sections) {
        setSections(prev => ({ ...prev, ...result.sections }));
        setStep(4);
      } else {
        alert(result.error || "Could not parse resume.");
      }
    } catch {
      alert("Error parsing resume. Check backend.");
    }
    setLoadingResume(false);
  };

  const updateBullet = (section, index, newText) => {
    setSections(prev => {
      const updated = [...prev[section]];
      updated[index] = newText;
      return { ...prev, [section]: updated };
    });
  };

  const addBullet = (section, text) => {
    setSections(prev => ({ ...prev, [section]: [...prev[section], text] }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.exportPDF(sections);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tailored_resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Check backend.");
    }
    setExporting(false);
  };

  const flatKeywords = Object.values(keywords).flat();
  const sectionLabels = { summary: "Summary", skills: "Skills", experience: "Experience", projects: "Projects", education: "Education" };

  // Keyword match analysis
  const resumeText = Object.values(sections).flat().join(" ").toLowerCase();
  const matched = flatKeywords.filter(k => resumeText.includes(k.toLowerCase()));
  const missing = flatKeywords.filter(k => !resumeText.includes(k.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">🧱</div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-none">Resume Lego Builder</h1>
            <p className="text-xs text-gray-400">Personal resume tailoring tool</p>
          </div>
        </div>
        {/* Step indicators */}
        <div className="flex items-center gap-1 text-xs">
          {["JD Input", "Keywords", "Resume", "Editor"].map((s, i) => (
            <div key={i} className="flex items-center">
              <button
                onClick={() => step > i + 1 && setStep(i + 1)}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${step === i + 1 ? "bg-blue-600 text-white" : step > i + 1 ? "bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200" : "bg-gray-100 text-gray-400 cursor-default"}`}
              >
                {i + 1}. {s}
              </button>
              {i < 3 && <span className="text-gray-300 mx-1">→</span>}
            </div>
          ))}
        </div>
        {step === 4 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {exporting ? "⟳ Exporting..." : "⬇️ Export PDF"}
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Step 1: Job Description */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Paste the Job Description</h2>
              <p className="text-gray-500">We'll extract the key skills, tools, and terms the employer wants.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <textarea
                className="w-full h-64 text-sm text-gray-800 border border-gray-200 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Paste the full job description here..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-400">{jd.length} characters</p>
                <button
                  onClick={handleExtractKeywords}
                  disabled={!jd.trim() || loadingKw}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {loadingKw ? <span className="animate-spin">⟳</span> : "🔍"}
                  {loadingKw ? "Extracting..." : "Extract Keywords"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Keywords */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Keywords Extracted</h2>
              <p className="text-gray-500">These are the terms from the job description. Upload your resume next.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { key: "skills", label: "Skills", color: "blue", icon: "⚡" },
                { key: "tools", label: "Tools & Software", color: "purple", icon: "🔧" },
                { key: "action_verbs", label: "Action Verbs", color: "green", icon: "🎯" },
                { key: "domain_terms", label: "Domain Terms", color: "orange", icon: "🏭" },
              ].map(({ key, label, color, icon }) => (
                <div key={key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">{icon} {label}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(keywords[key] || []).map((k, i) => (
                      <Tag key={i} label={k} color={color}
                        onRemove={() => setKeywords(prev => ({ ...prev, [key]: prev[key].filter((_, j) => j !== i) }))}
                      />
                    ))}
                    {(keywords[key] || []).length === 0 && <span className="text-xs text-gray-400">None found</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-700">
              <strong>💡 Tip:</strong> Click × on any tag to remove it. These keywords will be used to match and improve your resume.
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setStep(1)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">← Back</button>
              <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Upload Resume →</button>
            </div>
          </div>
        )}

        {/* Step 3: Resume Upload */}
        {step === 3 && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Resume</h2>
              <p className="text-gray-500">PDF or DOCX. We'll parse it into editable blocks.</p>
            </div>
            <label className={`block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${loadingResume ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}`}>
              <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
              {loadingResume ? (
                <div className="space-y-2">
                  <div className="text-4xl animate-bounce">⟳</div>
                  <p className="text-blue-600 font-medium">Parsing your resume...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-5xl">📄</div>
                  <p className="font-medium text-gray-700">Click to upload or drag & drop</p>
                  <p className="text-sm text-gray-400">PDF or DOCX — max 5MB</p>
                </div>
              )}
            </label>
            <div className="mt-4 text-center">
              <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600">← Back to JD</button>
            </div>
          </div>
        )}

        {/* Step 4: Lego Editor */}
        {step === 4 && (
          <div className="grid grid-cols-3 gap-6">
            {/* Left: keyword sidebar */}
            <div className="col-span-1 space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm sticky top-24">
                <h3 className="font-bold text-gray-800 mb-4">📊 Keyword Match</h3>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-green-700">✓ Matched ({matched.length})</span>
                    <span className="text-xs text-gray-400">{flatKeywords.length > 0 ? Math.round(matched.length / flatKeywords.length * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${flatKeywords.length > 0 ? (matched.length / flatKeywords.length * 100) : 0}%` }}></div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {matched.slice(0, 10).map((k, i) => <Tag key={i} label={k} color="green" />)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-2">✗ Missing ({missing.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {missing.slice(0, 15).map((k, i) => <Tag key={i} label={k} color="red" />)}
                    {missing.length === 0 && <span className="text-xs text-green-600">🎉 All keywords present!</span>}
                  </div>
                </div>
                <hr className="my-4" />
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">All Keywords</p>
                  {[
                    { key: "skills", label: "Skills", color: "blue" },
                    { key: "tools", label: "Tools", color: "purple" },
                    { key: "action_verbs", label: "Verbs", color: "green" },
                    { key: "domain_terms", label: "Domain", color: "orange" },
                  ].map(({ key, label, color }) => (
                    keywords[key]?.length > 0 && (
                      <div key={key} className="mb-2">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <div className="flex flex-wrap gap-1">
                          {keywords[key].map((k, i) => <Tag key={i} label={k} color={color} />)}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Lego Editor */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">🧱 Resume Editor</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full inline-block"></span>
                  Yellow = keyword match &nbsp;|&nbsp;
                  <span>✨ AI = get rewrite suggestions</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                {Object.entries(sectionLabels).map(([key, label]) => (
                  <SectionPanel
                    key={key}
                    title={label}
                    bullets={sections[key] || []}
                    sectionKey={key}
                    allKeywords={keywords}
                    onUpdate={updateBullet}
                    onAddBullet={addBullet}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setStep(3)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">← Re-upload</button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {exporting ? "Exporting..." : "⬇️ Export PDF"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
