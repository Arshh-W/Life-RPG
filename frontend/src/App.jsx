import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { apiRequest } from "./api";
import { BookOpen, Brain, Camera, Check, Coins, Dumbbell, Gem, HeartHandshake, Moon, Plus, ScrollText, Sparkles, Sun, WandSparkles, X, Heart, Zap, Target, Calendar } from "lucide-react";

import darkBg from "./assets/dark-bg.jpeg";
import lightBg from "./assets/light-bg.jpeg";

const categories = {
  intelligence: { label: "Intelligence", short: "INT", attribute: "intelligence", color: "gold", description: "Study, code, write, and solve." },
  physicality: { label: "Physicality", short: "PHY", attribute: "strength", color: "coral", description: "Train, move, fuel, and recover." },
  social: { label: "Social & emotional", short: "EQ", attribute: "emotional_intelligence", color: "mint", description: "Connect, contribute, and listen." },
};

const emptyGameState = { loading: true, error: "", profile: null, tasks: [], boss: null, shop: [], inventory: [] };

function Icon({ children }) {
  const iconMap = { "+": Plus, "$": Coins, OK: Check, Q: ScrollText, V: Gem, O: WandSparkles, C: BookOpen, INT: Brain, PHY: Dumbbell, EQ: HeartHandshake, DAY: Sun, NIGHT: Moon };
  const Glyph = iconMap[children] || Sparkles;
  return <Glyph className="ui-icon" aria-hidden="true" strokeWidth={1.8} />;
}

// --- PROFILE MODAL (THE SOUL SHEET) CLEANED OF BROKEN TAILWIND ---
function ProfileModal({ user, profile, onClose, onLogout }) {
  const stats = profile?.attributes || { intelligence: user.intelligence, discipline: user.discipline, strength: user.strength, health: user.health, emotional_intelligence: user.emotional_intelligence };
  
  return (
    <div className="modal-backdrop" style={{ zIndex: 100 }}>
      <div className="modal-card profile-modal">
        <button className="modal-close" type="button" onClick={onClose}><X size={18} /></button>
        
        <div className="profile-header">
          <div className="profile-avatar">
            {user.display_name.slice(0, 2).toUpperCase()}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>{user.display_name}</h2>
          <p style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {user.profession || "Unbound Hunter"} • Level {profile?.level ?? user.level}
          </p>
        </div>

        <div className="profile-stats-grid">
          <div className="stat-panel">
            <span className="stat-label"><Heart size={14} color="#fb7185" /> HP Buffer</span>
            <div style={{ fontSize: '1.25rem', color: '#fb7185', fontWeight: 'bold' }}>{stats.health} / 100</div>
          </div>
          <div className="stat-panel">
            <span className="stat-label"><Zap size={14} color="#a78bfa" /> DIS Multiplier</span>
            <div style={{ fontSize: '1.25rem', color: '#a78bfa', fontWeight: 'bold' }}>x{(1.0 + (Math.log10((profile?.streak_count || 0) + 1) * (stats.discipline * 0.05))).toFixed(2)}</div>
          </div>
          <div className="stat-panel">
            <span className="stat-label"><Target size={14} color="#94a3b8" /> Primary Ambition</span>
            <div style={{ fontSize: '0.875rem', color: '#cbd5e1', fontStyle: 'italic' }}>"{user.grand_goal || "Restore the realm"}"</div>
          </div>
          <div className="stat-panel">
            <span className="stat-label"><Calendar size={14} color="#94a3b8" /> Joined System</span>
            <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>{new Date(user.created_at || Date.now()).toLocaleDateString()}</div>
          </div>
        </div>

        <button className="outline-btn" style={{ width: '100%', borderColor: '#7f1d1d', color: '#f87171', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} type="button" onClick={onLogout}>
          <Moon size={16} /> Enter the Fog (Log out)
        </button>
      </div>
    </div>
  );
}

function GamePage({ user, darkMode, setDarkMode, onLogout }) {
  const [activeView, setActiveView] = useState("realm");
  const [gameState, setGameState] = useState(emptyGameState);
  const [actionState, setActionState] = useState("");
  const [questFilter, setQuestFilter] = useState("all");
  const [bonusQuest, setBonusQuest] = useState(null);
  const [bonusInterests, setBonusInterests] = useState(user.interests || "");
  const [showQuestForm, setShowQuestForm] = useState(false);
  const [showCharacterEditor, setShowCharacterEditor] = useState(false);
  const [verificationTask, setVerificationTask] = useState(null);
  const [capturedProof, setCapturedProof] = useState(null);
  const [character, setCharacter] = useState({ gender: user.character_gender || "male", hair: user.character_hair || "short", mouth: user.character_mouth || "smile", hairColor: user.character_hair_color || "brown", skinColor: user.character_skin_color || "warm", outfitColor: user.character_outfit_color || "blue" });
  const [newQuest, setNewQuest] = useState({ title: "", category: "intelligence", is_mandatory: false });
  const [toast, setToast] = useState(null);
  const uploadRef = useRef(null);
  const [bossSecondsRemaining, setBossSecondsRemaining] = useState(0);

  const [showProfile, setShowProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const notify = (message, tone = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3600);
  };

  const loadGame = async (showLoading = true) => {
    if (showLoading) setGameState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [profile, tasks, boss, shop, inventory] = await Promise.all([
        apiRequest("/progression/profile"),
        apiRequest("/tasks"),
        apiRequest("/boss-challenges/active"),
        apiRequest("/economy/shop"),
        apiRequest("/economy/inventory"),
      ]);
      setGameState({ loading: false, error: "", profile, tasks, boss, shop, inventory });
    } catch (error) {
      setGameState((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  useEffect(() => {
    loadGame(false);
  }, []);

  useEffect(() => {
    if (!gameState.boss?.expires_at) return undefined;
    const updateTimer = () => setBossSecondsRemaining(Math.max(0, Math.floor((new Date(gameState.boss.expires_at).getTime() - Date.now()) / 1000)));
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [gameState.boss]);

  const profile = gameState.profile;
  const tasks = gameState.tasks;
  const mandatoryTasks = tasks.filter((task) => task.is_mandatory);
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (questFilter === "active") return !task.is_completed;
    if (questFilter === "completed") return task.is_completed;
    return questFilter === "all" || task.category === questFilter;
  }), [tasks, questFilter]);

  const submitQuest = async (event) => {
    event.preventDefault();
    if (!newQuest.title.trim()) return;
    setActionState("create-quest");
    try {
      await apiRequest("/tasks", { method: "POST", body: JSON.stringify({ ...newQuest, title: newQuest.title.trim() }) });
      setNewQuest({ title: "", category: "intelligence", is_mandatory: false });
      setShowQuestForm(false);
      await loadGame();
      notify("Quest added to your path.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setActionState("");
    }
  };

  const completeTask = async (task) => {
    if (task.verification_required && task.verification_status !== "verified") {
      setCapturedProof(null);
      setVerificationTask(task);
      return;
    }
    setActionState(task.id);
    try {
      await apiRequest(`/tasks/${task.id}/complete`, { method: "POST" });
      await loadGame();
      notify(`Quest cleared. +${task.xp_reward} XP earned.`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setActionState("");
    }
  };

  const verifyTask = async (event) => {
    event.preventDefault();
    const image = capturedProof || uploadRef.current?.files?.[0];
    if (!image || !verificationTask) return;
    setActionState(`verify-${verificationTask.id}`);
    try {
      const body = new FormData();
      body.append("image", image);
      await apiRequest(`/tasks/${verificationTask.id}/verify`, { method: "POST", body });
      await apiRequest(`/tasks/${verificationTask.id}/complete`, { method: "POST" });
      setVerificationTask(null);
      await loadGame();
      notify("Verification accepted. Quest cleared.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setActionState("");
    }
  };

  const saveCharacter = async (nextCharacter) => {
    setActionState("save-character");
    try {
      const saved = await apiRequest("/auth/me", { method: "PATCH", body: JSON.stringify({ character_gender: nextCharacter.gender, character_hair: nextCharacter.hair, character_mouth: nextCharacter.mouth, character_hair_color: nextCharacter.hairColor, character_skin_color: nextCharacter.skinColor, character_outfit_color: nextCharacter.outfitColor }) });
      setCharacter(nextCharacter);
      setShowCharacterEditor(false);
      notify(`${saved.display_name}'s chibi form has been saved.`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setActionState("");
    }
  };

  const completeBoss = async () => {
    if (!gameState.boss) return;
    setActionState("boss");
    try {
      await apiRequest(`/boss-challenges/${gameState.boss.id}/complete`, { method: "POST" });
      await loadGame();
      notify(`Boss defeated. +${gameState.boss.xp_reward} XP and +${gameState.boss.coin_reward} coins.`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setActionState("");
    }
  };

  const purchaseItem = async (item) => {
    setActionState(`buy-${item.id}`);
    try {
      const purchase = await apiRequest(`/economy/items/${item.id}/purchase`, { method: "POST" });
      await loadGame();
      notify(`${purchase.item.name} added to your inventory.`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setActionState("");
    }
  };

  const generateBonusQuest = async (event) => {
    event?.preventDefault();
    setActionState("generate-bonus");
    try {
      const generated = await apiRequest("/bonus-quests/generate", { method: "POST", body: JSON.stringify({ interests: bonusInterests }) });
      setBonusQuest(generated);
      notify(generated.generated_by === "realm fallback" ? "The local Oracle found a quest." : "The Oracle has spoken.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setActionState("");
    }
  };

  const acceptBonusQuest = async () => {
    if (!bonusQuest) return;
    setActionState("accept-bonus");
    try {
      await apiRequest("/tasks", { method: "POST", body: JSON.stringify({ title: bonusQuest.title, description: bonusQuest.description, category: bonusQuest.category, is_mandatory: false }) });
      setBonusQuest(null);
      await loadGame();
      setActiveView("quests");
      notify("Bonus quest added to your board.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setActionState("");
    }
  };

  const logout = () => {
    setIsLoggingOut(true);
    setShowProfile(false);
    setTimeout(() => {
      localStorage.removeItem("life-rpg-token");
      localStorage.removeItem("life-rpg-refresh-token");
      onLogout();
    }, 1200);
  };

  const renderQuestRow = (task) => {
    const category = categories[task.category] || categories.intelligence;
    return (
      <article className={`quest-card ${task.is_completed ? "is-complete" : ""}`} key={task.id}>
        <div className={`quest-mark ${category.color}`}><Icon>{task.is_completed ? "OK" : category.short}</Icon></div>
        <div className="quest-copy">
          <div className="quest-meta"><span>{category.label}</span>{task.is_mandatory && <strong>DAILY TRINITY</strong>}</div>
          <h3>{task.title}</h3>
          <p>{task.description || category.description}</p>
        </div>
        <div className="quest-reward"><strong>+{task.xp_reward}</strong><small>XP</small></div>
        <button className="quest-action" type="button" disabled={task.is_completed || actionState === task.id} onClick={() => completeTask(task)}>
          {task.is_completed ? "Cleared" : actionState === task.id ? "Saving" : task.verification_required ? "Verify" : "Clear"}
        </button>
      </article>
    );
  };

  const activeTabLabel = { realm: "The Realm", quests: "Quest Board", oracle: "The Oracle", vault: "Reward Vault", codex: "The Codex" }[activeView];

  return (
    <div className={`game-shell ${darkMode ? "night" : "day"}`} style={{ backgroundImage: `url(${darkMode ? darkBg : lightBg})` }}>
      
      {isLoggingOut && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#3b82f6', fontFamily: 'monospace', letterSpacing: '0.3em' }}>THE SYSTEM SLUMBERS...</p>
        </div>
      )}

      <div className="game-wash" />
      
      <header className="game-header" style={{ borderBottom: '1px solid rgba(30, 58, 138, 0.5)', background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 40, padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="brand-lockup" type="button" onClick={() => setActiveView("realm")} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
          <span className="brand-glyph" style={{ color: '#3b82f6', fontSize: '1.25rem', fontWeight: 'bold' }}>✦</span>
          <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <strong style={{ color: '#fff', letterSpacing: '0.1em', fontSize: '0.875rem' }}>REALMS</strong>
            <small style={{ color: '#60a5fa', fontSize: '0.5rem', letterSpacing: '0.1em' }}>OF ROUTINE</small>
          </span>
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(30, 41, 59, 0.8)', padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(202, 138, 4, 0.3)' }}>
            <Icon>$</Icon>
            <span style={{ color: '#facc15', fontFamily: 'monospace', fontWeight: 'bold' }}>{profile?.coins ?? user.coins}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid #334155', paddingLeft: '1.5rem' }}>
            <button className="round-control" type="button" aria-label="Toggle theme" onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <button 
              style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1e3a8a', border: '2px solid #2563eb', color: '#bfdbfe', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              type="button" 
              onClick={() => setShowProfile(true)} 
              aria-label="View Profile"
            >
              {user.display_name.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <div className="game-layout">
        <aside className="game-sidebar">
          <div className="player-card">
            <div className="player-orb"><span>{profile?.level ?? user.level}</span></div>
            <div><small>THE NOVICE</small><h2>{user.display_name}</h2><p>Level {profile?.level ?? user.level} explorer</p></div>
            <div className="sidebar-character"><ChibiCharacter character={character} /><HealthHearts value={profile?.attributes?.health ?? user.health} /></div>
          </div>
          <nav className="game-nav" aria-label="Game sections">
            <button className={activeView === "realm" ? "active" : ""} type="button" onClick={() => setActiveView("realm")}><Icon>+</Icon>The Realm</button>
            <button className={activeView === "quests" ? "active" : ""} type="button" onClick={() => setActiveView("quests")}><Icon>Q</Icon>Quest Board<span>{tasks.filter((task) => !task.is_completed).length}</span></button>
            <button className={activeView === "oracle" ? "active" : ""} type="button" onClick={() => setActiveView("oracle")}><Icon>O</Icon>The Oracle</button>
            <button className={activeView === "vault" ? "active" : ""} type="button" onClick={() => setActiveView("vault")}><Icon>V</Icon>Reward Vault</button>
            <button className={activeView === "codex" ? "active" : ""} type="button" onClick={() => setActiveView("codex")}><Icon>C</Icon>The Codex</button>
          </nav>
          <div className="sidebar-lore"><span className="lore-mark">//</span><p>Every ordinary action is a spell. Keep the chain alive.</p></div>
          <button className="logout-link" type="button" onClick={logout}>Exit the realm</button>
        </aside>

        <main className="game-main">
          <div className="mobile-breadcrumb"><span>REALMS OF ROUTINE</span><strong>/ {activeTabLabel}</strong></div>
          {gameState.error && <div className="inline-alert error" role="alert"><strong>The realm is unstable.</strong> {gameState.error}</div>}
          {gameState.loading && <div className="loading-state">Rebuilding the realm...</div>}

          {activeView === "realm" && <RealmView profile={profile} user={user} character={character} tasks={tasks} mandatoryTasks={mandatoryTasks} boss={gameState.boss} bossSecondsRemaining={bossSecondsRemaining} actionState={actionState} onCompleteBoss={completeBoss} onNavigate={setActiveView} onCustomize={() => setShowCharacterEditor(true)} />}
          {activeView === "quests" && (
            <section className="view-section">
              <div className="view-intro"><div><p className="kicker">THE DAILY TRINITY</p><h1>Quest Board</h1><p>Small actions restore the shattered realm. Choose one worthy of your next hour.</p></div><button className="primary-btn" type="button" onClick={() => setShowQuestForm(true)}><Icon>+</Icon> New quest</button></div>
              <div className="filter-row"><div className="segmented"><button className={questFilter === "all" ? "active" : ""} type="button" onClick={() => setQuestFilter("all")}>All quests</button><button className={questFilter === "active" ? "active" : ""} type="button" onClick={() => setQuestFilter("active")}>Active</button><button className={questFilter === "completed" ? "active" : ""} type="button" onClick={() => setQuestFilter("completed")}>Cleared</button></div>{Object.entries(categories).map(([key, value]) => <button className={`filter-chip ${questFilter === key ? "active" : ""}`} type="button" key={key} onClick={() => setQuestFilter(key)}>{value.short}</button>)}</div>
              <div className="quest-board">{filteredTasks.length ? filteredTasks.map(renderQuestRow) : <EmptyState title="The board is quiet" text="Add a quest and give the realm a direction." action="Create quest" onAction={() => setShowQuestForm(true)} />}</div>
            </section>
          )}
          {activeView === "oracle" && <OracleView interests={bonusInterests} setInterests={setBonusInterests} bonusQuest={bonusQuest} loading={actionState === "generate-bonus"} accepting={actionState === "accept-bonus"} onGenerate={generateBonusQuest} onAccept={acceptBonusQuest} onDiscard={() => setBonusQuest(null)} profile={profile} />}
          {activeView === "vault" && <VaultView shop={gameState.shop} inventory={gameState.inventory} coins={profile?.coins ?? user.coins} actionState={actionState} onPurchase={purchaseItem} />}
          {activeView === "codex" && <CodexView profile={profile} user={user} tasks={tasks} />}
        </main>
      </div>

      {showProfile && (
        <ProfileModal 
          user={user} 
          profile={profile} 
          onClose={() => setShowProfile(false)} 
          onLogout={logout} 
        />
      )}

      {showQuestForm && <QuestForm value={newQuest} loading={actionState === "create-quest"} onChange={newQuestState => setNewQuest(newQuestState)} onSubmit={submitQuest} onClose={() => setShowQuestForm(false)} />}
      {verificationTask && <VerificationModal task={verificationTask} loading={actionState === `verify-${verificationTask.id}`} uploadRef={uploadRef} capturedProof={capturedProof} onCapture={setCapturedProof} onSubmit={verifyTask} onClose={() => { setCapturedProof(null); setVerificationTask(null); }} />}
      {showCharacterEditor && <CharacterForge character={character} saving={actionState === "save-character"} onSave={saveCharacter} onClose={() => setShowCharacterEditor(false)} />}
      {toast && <div className={`toast ${toast.tone}`} role="status">{toast.message}</div>}
    </div>
  );
}

function RealmView({ profile, user, character, tasks, mandatoryTasks, boss, bossSecondsRemaining, actionState, onCompleteBoss, onNavigate, onCustomize }) {
  const stats = profile?.attributes || { intelligence: user.intelligence, discipline: user.discipline, strength: user.strength, health: user.health, emotional_intelligence: user.emotional_intelligence };
  const clearedMandatory = mandatoryTasks.filter((task) => task.is_completed).length;
  
  const dominantStat = Math.max(stats.intelligence, stats.strength, stats.emotional_intelligence);
  const zoneName = dominantStat === stats.intelligence ? "Silicon Citadel (INT)" : dominantStat === stats.strength ? "Iron Bastion (PHY)" : "Weirwood Archives (EQ)";

  const levelProgress = profile?.level_progress ?? 0;
  const activeTasks = tasks.filter((task) => !task.is_completed).slice(0, 3);
  const attributeRows = [
    { key: "intelligence", label: "Intelligence", short: "INT", value: stats.intelligence, color: "gold", note: "Clarity & craft" },
    { key: "discipline", label: "Discipline", short: "DIS", value: stats.discipline, color: "violet", note: "Streak power" },
    { key: "strength", label: "Physicality", short: "PHY", value: stats.strength, color: "coral", note: "Energy & HP" },
    { key: "emotional_intelligence", label: "Social & emotional", short: "EQ", value: stats.emotional_intelligence, color: "blue", note: "Human connection" },
  ];

  return <section className="view-section realm-view">
    <div className="realm-hero"><div><p className="kicker">TERRITORY CONTROL / ACTIVE CLUSTER</p><h1>{zoneName}</h1><p className="hero-copy">Your attribute focus dictates your dominion. Raise your metrics to heal the surrounding lands.</p><button className="primary-btn" type="button" onClick={() => onNavigate("quests")}>Enter the quest board <span>-&gt;</span></button></div><div className="realm-hero-character"><ChibiCharacter character={character} /><button className="customize-link" type="button" onClick={onCustomize}>Customize hero</button><HealthHearts value={stats.health} /></div></div>
    
    <div className="world-map dynamic-overworld" aria-label="Dynamic shattered realm map" style={{ border: '1px solid var(--system-border)', padding: '2rem', borderRadius: '12px', background: 'rgba(11, 15, 25, 0.8)' }}>
      <div className="faction-header">
        <div>
          <span className="kicker">FACTION SECTOR</span>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>Zone 01: The Shattered Meadows</h3>
        </div>
        <div className="badge rank-badge">
          {stats.intelligence > 15 ? "MINISTER STATUS" : "NOVICE CITIZEN"}
        </div>
      </div>

      <div className="faction-grid">
        <div className={`faction-panel ${stats.intelligence >= 10 ? 'restored int' : ''}`}>
          <span className="stat-label" style={{ color: '#60a5fa' }}><Brain size={14} /> [ INT CLUSTER ]</span>
          <h4 style={{ margin: 0, color: 'white' }}>Silicon Citadel</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>{stats.intelligence >= 10 ? "Fully Restored" : "Locked (Req: 10 INT)"}</p>
        </div>
        <div className={`faction-panel ${stats.strength >= 10 ? 'restored phy' : ''}`}>
          <span className="stat-label" style={{ color: '#fb7185' }}><Dumbbell size={14} /> [ PHY CLUSTER ]</span>
          <h4 style={{ margin: 0, color: 'white' }}>Iron Bastion</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>{stats.strength >= 10 ? "Fully Restored" : "Locked (Req: 10 PHY)"}</p>
        </div>
        <div className={`faction-panel ${stats.emotional_intelligence >= 10 ? 'restored eq' : ''}`}>
          <span className="stat-label" style={{ color: '#34d399' }}><HeartHandshake size={14} /> [ EQ CLUSTER ]</span>
          <h4 style={{ margin: 0, color: 'white' }}>Weirwood Archives</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>{stats.emotional_intelligence >= 10 ? "Fully Restored" : "Locked (Req: 10 EQ)"}</p>
        </div>
      </div>

      <div className="faction-header" style={{ marginBottom: 0, marginTop: '2rem' }}>
        <div>
          <span className="kicker">MAP PROGRESSION</span>
          <strong style={{ color: 'white' }}>World Healing Index: {Math.min(100, (profile?.level ?? user.level) * 10)}%</strong>
        </div>
        <button className="outline-btn small" type="button" onClick={() => onNavigate("vault")}>Visit Loot Grove</button>
      </div>
    </div>

    <div className="progress-strip"><div className="progress-copy"><span className="kicker">LEVEL {profile?.level ?? user.level}</span><strong>{profile?.xp ?? user.xp} <small>/ {profile?.next_level_xp ?? 100} XP</small></strong></div><div className="progress-track"><span style={{ width: `${Math.min(100, levelProgress)}%` }} /></div><span className="progress-next">{Math.max(0, (profile?.next_level_xp ?? 100) - (profile?.xp ?? user.xp))} XP to level up</span></div>
    <div className="realm-grid">
      <div className="realm-column"><div className="section-heading"><div><p className="kicker">YOUR ATTRIBUTES</p><h2>Build your focus tree</h2></div><span>LV. {profile?.level ?? user.level}</span></div><div className="attribute-list">{attributeRows.map((stat) => <div className="attribute-row" key={stat.key}><div className={`attribute-orb ${stat.color}`}>{stat.short}</div><div className="attribute-info"><div><strong>{stat.label}</strong><span>{stat.value}</span></div><small>{stat.note}</small><div className="attribute-track"><span className={stat.color} style={{ width: `${Math.min(100, stat.value * 5)}%` }} /></div></div></div>)}</div></div>
      <div className="realm-column"><div className="section-heading"><div><p className="kicker">DAILY TRINITY</p><h2>Keep the chain alive</h2></div><span className="streak-label">🔥 {profile?.streak_count ?? user.streak_count} day streak</span></div><div className="trinity-card"><div className="trinity-orbit"><span>{clearedMandatory}<small>/ {mandatoryTasks.length || 3}</small></span></div><div><h3>Three anchors, one stronger you.</h3><p>Complete mandatory quests to protect your streak and strengthen Discipline.</p><button className="text-link" type="button" onClick={() => onNavigate("quests")}>View today's anchors -&gt;</button></div></div><div className="mini-quest-list">{activeTasks.length ? activeTasks.map((task) => <div key={task.id}><span className={`mini-dot ${categories[task.category]?.color || "gold"}`} /><span>{task.title}</span><b>+{task.xp_reward}</b></div>) : <p className="muted">The path is clear. Add your next quest.</p>}</div></div>
    </div>
    <div className="boss-banner"><div className="boss-emblem">!</div><div className="boss-content"><p className="kicker">HIGH-STAKES EVENT / ACTIVE</p><h2>{boss?.title || "The realm is resting"}</h2><p>{boss?.description || "Complete a quest to summon your next challenge."}</p><div className="boss-health"><span style={{ width: boss ? `${(boss.hp_remaining / boss.hp_total) * 100}%` : "0%" }} /></div><small>{boss ? `${boss.hp_remaining} HP remains` : "No active boss"}</small></div><div className="boss-reward"><span>⏱ {boss ? `${String(Math.floor(bossSecondsRemaining / 60)).padStart(2, "0")}:${String(bossSecondsRemaining % 60).padStart(2, "0")}` : "05:00"}</span><strong>+{boss?.xp_reward ?? 0} XP</strong><small>+{boss?.coin_reward ?? 0} coins</small>{boss && <button className="outline-btn" type="button" disabled={actionState === "boss" || bossSecondsRemaining === 0} onClick={onCompleteBoss}>{actionState === "boss" ? "Fighting..." : bossSecondsRemaining === 0 ? "Expired" : "Defeat boss"}</button>}</div></div>
  </section>;
}

function OracleView({ interests, setInterests, bonusQuest, loading, accepting, onGenerate, onAccept, onDiscard, profile }) {
  const category = bonusQuest ? categories[bonusQuest.category] : categories.intelligence;
  return <section className="view-section oracle-view"><div className="oracle-hero"><div><p className="kicker">THE PERSONAL QUEST ENGINE</p><h1>Ask the Oracle.</h1><p>Tell the realm what pulls at your curiosity. The Oracle will shape it into one focused bonus quest that strengthens the stat you need most.</p></div><div className="oracle-eye"><span>✦</span><small>AI<br />ACTIVE</small></div></div><div className="oracle-grid"><form className="oracle-form" onSubmit={onGenerate}><label><span className="kicker">YOUR INTERESTS</span><textarea value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="e.g. music production, climbing, astronomy, cooking" maxLength={500} /></label><div className="oracle-profile"><span>READING YOUR PROFILE</span><div><b>LV. {profile?.level ?? 1}</b><b>INT {profile?.attributes?.intelligence ?? 1}</b><b>PHY {profile?.attributes?.strength ?? 1}</b><b>EQ {profile?.attributes?.emotional_intelligence ?? 1}</b></div></div><button className="primary-btn" type="submit" disabled={loading}><Icon>O</Icon>{loading ? "Consulting the stars..." : "Generate bonus quest"}</button></form><div className="oracle-result">{bonusQuest ? <article className="bonus-scroll"><div className="scroll-stamp"><Icon>O</Icon></div><div className="quest-meta"><span>{category.label}</span><strong>ORACLE BONUS</strong></div><h2>{bonusQuest.title}</h2><p>{bonusQuest.description}</p><div className="bonus-reward"><span>REWARD</span><strong>+{bonusQuest.xp_reward} XP</strong><small>+{bonusQuest.coin_reward} coins</small></div><div className="oracle-rationale"><span>WHY THIS QUEST</span><p>{bonusQuest.rationale}</p><small>Generated by {bonusQuest.generated_by}</small></div><div className="bonus-actions"><button className="primary-btn" type="button" disabled={accepting} onClick={onAccept}>{accepting ? "Inscribing..." : "Accept quest"}</button><button className="text-link" type="button" onClick={onDiscard}>Ask again</button></div></article> : <div className="oracle-empty"><div className="constellation">* . + . *<br />. + . + .<br />+ . * . +</div><h2>A quest is waiting in the dark.</h2><p>Share an interest and let your real life become the material for your next adventure.</p></div>}</div></div></section>;
}

function CodexView({ profile, user, tasks }) {
  const completed = tasks.filter((task) => task.is_completed).length;
  return <section className="view-section codex-view"><div className="view-intro"><div><p className="kicker">FIELD GUIDE / PLAYER ONE</p><h1>The Codex</h1><p>Your living record of the realm, its rules, and the character you are building.</p></div><div className="codex-seal">✦</div></div><div className="codex-grid"><article className="codex-page character-page"><p className="kicker">CHARACTER SHEET</p><h2>{user.display_name}</h2><p className="codex-class">The recovering novice</p><div className="codex-divider" /><div className="codex-facts"><div><span>LEVEL</span><strong>{profile?.level ?? user.level}</strong></div><div><span>XP</span><strong>{profile?.xp ?? user.xp}</strong></div><div><span>STREAK</span><strong>{profile?.streak_count ?? user.streak_count}</strong></div><div><span>QUESTS CLEARED</span><strong>{completed}</strong></div></div><p className="codex-quote">“A grand life is assembled from small promises kept.”</p></article><article className="codex-page rules-page"><p className="kicker">THE THREE LAWS</p><div className="law"><span>01</span><div><h3>Intent becomes XP</h3><p>Choose a real action. The realm only rewards what you actually do.</p></div></div><div className="law"><span>02</span><div><h3>Balance builds power</h3><p>Intelligence, Physicality, and Social quests grow a complete character.</p></div></div><div className="law"><span>03</span><div><h3>Consistency defeats bosses</h3><p>The Daily Trinity turns a single good day into a streak.</p></div></div></article><article className="codex-page map-page"><p className="kicker">KNOWN LANDS</p><div className="codex-map"><span>🏰</span><span>🌲</span><span>💎</span><span>🧙</span><span>🐉</span></div><h2>The Shattered Meadows</h2><p>Zone 01 is only the beginning. Every cleared quest reveals more of the path.</p></article></div></section>;
}

function VaultView({ shop, inventory, coins, actionState, onPurchase }) {
  return <section className="view-section"><div className="view-intro"><div><p className="kicker">THE ECONOMY</p><h1>Reward Vault</h1><p>Spend your hard-won coins on artifacts for the road ahead.</p></div><div className="vault-balance"><span>YOUR BALANCE</span><strong><Icon>$</Icon>{coins}</strong></div></div><div className="vault-grid"><div className="shop-catalog">{shop.map((item) => <article className={`item-card ${item.rarity}`} key={item.id}><div className="item-art"><span>{item.rarity === "epic" ? "*" : item.rarity === "rare" ? "<>" : "o"}</span></div><div className="item-body"><span className="rarity-label">{item.rarity}</span><h2>{item.name}</h2><p>{item.description}</p><div className="item-footer"><strong><Icon>$</Icon>{item.cost}</strong><button className="primary-btn small" type="button" disabled={actionState === `buy-${item.id}` || coins < item.cost} onClick={() => onPurchase(item)}>{actionState === `buy-${item.id}` ? "Buying" : coins < item.cost ? "Need coins" : "Claim item"}</button></div></div></article>)}</div><div className="inventory-panel"><div className="section-heading"><div><p className="kicker">YOUR COLLECTION</p><h2>Inventory</h2></div><span>{inventory.length} items</span></div>{inventory.length ? inventory.map((item) => <div className="inventory-row" key={item.id}><span className="inventory-icon">+</span><div><strong>{item.name}</strong><small>{item.rarity}</small></div><b>x{item.owned_quantity}</b></div>) : <EmptyState title="Nothing claimed yet" text="Complete quests to earn coins and unlock artifacts." />}</div></div></section>;
}

function QuestForm({ value, loading, onChange, onSubmit, onClose }) {
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={onSubmit}><button className="modal-close" type="button" onClick={onClose}>X</button><p className="kicker">ADD TO THE PATH</p><h2>Forge a new quest</h2><p>Give one meaningful action a place in your realm.</p><label>Quest title<input autoFocus value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} placeholder="e.g. Morning training" maxLength={160} required /></label><fieldset><legend>Which attribute will grow?</legend>{Object.entries(categories).map(([key, category]) => <button className={`category-select ${value.category === key ? "selected" : ""}`} type="button" key={key} onClick={() => onChange({ ...value, category: key })}><span>{category.short}</span>{category.label}</button>)}</fieldset><label className="toggle-label"><input type="checkbox" checked={value.is_mandatory} onChange={(event) => onChange({ ...value, is_mandatory: event.target.checked })} /><span>Make this part of my Daily Trinity</span></label><button className="primary-btn" type="submit" disabled={loading}>{loading ? "Forging..." : "Forge quest"}</button></form></div>;
}

function ChibiCharacter({ character, large = false }) {
  return <div className={`chibi ${large ? "large" : ""} ${character.gender} hair-${character.hair} mouth-${character.mouth} hair-color-${character.hairColor} skin-${character.skinColor} outfit-${character.outfitColor}`} aria-label="Custom chibi character"><div className="chibi-shadow" /><div className="chibi-body"><span className="chibi-arm left" /><span className="chibi-arm right" /></div><div className="chibi-head"><span className="chibi-hair" /><span className="chibi-eye left" /><span className="chibi-eye right" /><span className="chibi-mouth" /></div></div>;
}

function HealthHearts({ value }) {
  const filledHearts = Math.round(Math.max(0, Math.min(100, value)) / 20);
  return <div className="health-hearts" aria-label={`${value} health`} role="img">{Array.from({ length: 5 }, (_, index) => <span className={index < filledHearts ? "filled" : ""} key={index}>♥</span>)}</div>;
}

function VerificationModal({ task, loading, uploadRef, capturedProof, onCapture, onSubmit, onClose }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (capturedProof) {
      const url = URL.createObjectURL(capturedProof);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [capturedProof]);

  return (
    <div className="modal-backdrop">
      <div className="modal-card camera-modal">
        <button className="modal-close" type="button" onClick={onClose}><X size={15} /></button>
        <p className="kicker">ANTI-CHEAT VERIFICATION</p>
        <h2>Prove the deed.</h2>
        <p><strong>{task.title}</strong> is a high-tier Daily Trinity quest. Capture your environment or upload proof.</p>
        
        {!capturedProof ? (
          <CameraCapture onCapture={onCapture} />
        ) : (
          <div className="proof-preview">
            <img src={previewUrl} alt="Captured proof" className="preview-image" style={{ maxHeight: '200px', width: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--system-border)', marginBottom: '1rem' }} />
            <button className="text-link" type="button" onClick={() => onCapture(null)}>
              Retake or replace photo
            </button>
          </div>
        )}

        <form onSubmit={onSubmit}>
          {!capturedProof && (
            <label className="upload-box">
              <span><Camera size={21} /></span>
              <strong>Or choose a saved image</strong>
              <small>JPEG, PNG, or WebP up to 5 MB</small>
              <input 
                ref={uploadRef} 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={(event) => onCapture(event.target.files?.[0] || null)} 
              />
            </label>
          )}
          
          <button className="primary-btn" type="submit" disabled={loading || !capturedProof} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? "Verifying..." : "Submit proof and claim XP"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraState, setCameraState] = useState("idle");
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
      streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
        setCameraState("ready");
      }
    } catch {
      setCameraState("blocked");
    }
  };

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraState("idle");
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video?.videoWidth) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      onCapture(new File([blob], "quest-proof.jpg", { type: "image/jpeg" }));
      stopTracks();
    }, "image/jpeg", 0.88);
  };

  useEffect(() => {
    return () => stopTracks();
  }, []);

  return (
    <div className="camera-utility">
      <video 
        ref={videoRef} 
        className={cameraState === "ready" ? "visible" : ""} 
        style={{ width: '100%', borderRadius: '8px', display: cameraState === 'ready' ? 'block' : 'none' }}
        muted 
        playsInline 
      />
      <canvas ref={canvasRef} hidden />
      
      <div className="camera-controls">
        {cameraState === "idle" && (
          <button className="outline-btn" type="button" onClick={startCamera}>
            <Camera size={16} /> Open Device Camera
          </button>
        )}
        {cameraState === "ready" && (
          <button className="primary-btn small" type="button" onClick={capture}>
            <Camera size={16} /> Capture Proof
          </button>
        )}
        {cameraState === "blocked" && (
          <small className="camera-note" style={{ color: 'var(--danger-red)' }}>Camera unavailable. Please upload a file below.</small>
        )}
      </div>
    </div>
  );
}

function CharacterForge({ character, saving, onSave, onClose, title = "Shape your chibi hero." }) {
  const [draft, setDraft] = useState(character);
  const options = { gender: ["male", "female"], hair: ["short", "long", "spiky", "crown", "bob", "braids"], mouth: ["smile", "grin", "calm", "brave", "surprise"], hairColor: ["brown", "black", "blonde", "pink", "blue"], skinColor: ["warm", "deep", "golden", "rose"], outfitColor: ["blue", "red", "green", "purple", "gold"] };
  return <div className="modal-backdrop"><form className="modal-card character-modal" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><button className="modal-close" type="button" onClick={onClose}><X size={15} /></button><p className="kicker">CHARACTER FORGE</p><h2>{title}</h2><div className="chibi-preview"><ChibiCharacter character={draft} large /></div><div className="forge-options">{Object.entries(options).map(([key, values]) => <fieldset key={key}><legend>{key.replace("Color", " color")}</legend>{values.map((value) => <button className={draft[key] === value ? "selected" : ""} type="button" key={value} onClick={() => setDraft({ ...draft, [key]: value })}>{value}</button>)}</fieldset>)}</div><button className="primary-btn" type="submit" disabled={saving}>{saving ? "Saving hero..." : "Save character"}</button></form></div>;
}

function EmptyState({ title, text, action, onAction }) {
  return <div className="empty-state"><span className="empty-glyph">+</span><h3>{title}</h3><p>{text}</p>{action && <button className="text-link" type="button" onClick={onAction}>{action} -&gt;</button>}</div>;
}

function ArcaneOnboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [userData, setUserData] = useState({ profession: '', goal: '' });

  const dialogue = [
    "The realm is shattered. Yet... a new soul approaches the abyss.",
    "I am the watcher of the remnants. Tell me, wanderer... to what craft do you bind your fate?",
    "An intriguing path. And what grand conquest do you seek to achieve before your time runs out?",
    "Your truth is accepted. The Focus Tree awakens. Enter the system..."
  ];

  useEffect(() => {
    let i = 0;
    setDisplayText('');
    const typing = setInterval(() => {
      setDisplayText((prev) => prev + dialogue[step].charAt(i));
      i++;
      if (i === dialogue[step].length) clearInterval(typing);
    }, 40);

    return () => clearInterval(typing);
  }, [step]);

  const handleInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
      if (step === 1) {
        setUserData({ ...userData, profession: e.target.value });
        setStep(2);
      } else if (step === 2) {
        setUserData({ ...userData, goal: e.target.value });
        setStep(3);
        setTimeout(() => onComplete(userData), 3000); 
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-blue-400 font-mono p-4">
      <div className="max-w-2xl text-center space-y-8 z-10">
        <p className="text-xl md:text-2xl min-h-[4rem] text-shadow-glow">
          {displayText}
        </p>
        
        {step === 0 && (
          <button 
            onClick={() => setStep(1)}
            className="mt-8 px-6 py-2 border border-blue-500 hover:bg-blue-900 transition-colors animate-pulse"
          >
            [ Step Forward ]
          </button>
        )}

        {(step === 1 || step === 2) && (
          <input
            type="text"
            autoFocus
            placeholder={step === 1 ? "e.g., C++ Developer..." : "e.g., Master the backend..."}
            onKeyDown={handleInput}
            className="mt-8 w-full bg-transparent border-b-2 border-blue-500 text-center text-white focus:outline-none focus:border-blue-300 pb-2 text-lg"
          />
        )}
      </div>
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [screen, setScreen] = useState(localStorage.getItem("life-rpg-token") ? "game" : "landing");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", display_name: "", interests: "" });
  const [authState, setAuthState] = useState({ loading: false, error: "" });
  const [registrationCharacter, setRegistrationCharacter] = useState({ gender: "female", hair: "bob", mouth: "smile", hairColor: "brown", skinColor: "warm", outfitColor: "purple" });
  const [showRegistrationForge, setShowRegistrationForge] = useState(false);
  const [showArcaneOnboarding, setShowArcaneOnboarding] = useState(false);
  const [pendingArcaneData, setPendingArcaneData] = useState(null);
  const authSectionRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem("life-rpg-token")) return;
    apiRequest("/auth/me").then((currentUser) => setUser(currentUser)).catch(() => {
      localStorage.removeItem("life-rpg-token");
      localStorage.removeItem("life-rpg-refresh-token");
      setScreen("landing");
    });
  }, []);

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setAuthState({ loading: false, error: "" });
    authSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthState({ loading: true, error: "" });
    try {
      const isRegistering = authMode === "register";
      if (isRegistering && !pendingArcaneData) {
        setShowArcaneOnboarding(true);
        setAuthState({ loading: false, error: "" });
        return;
      }
      const payload = isRegistering ? { email: form.email, password: form.password, display_name: form.display_name, interests: form.interests, profession: pendingArcaneData?.profession, grand_goal: pendingArcaneData?.goal, character_gender: registrationCharacter.gender, character_hair: registrationCharacter.hair, character_mouth: registrationCharacter.mouth, character_hair_color: registrationCharacter.hairColor, character_skin_color: registrationCharacter.skinColor, character_outfit_color: registrationCharacter.outfitColor } : { email: form.email, password: form.password };
      const response = await apiRequest(`/auth/${isRegistering ? "register" : "login"}`, { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("life-rpg-token", response.access_token);
      localStorage.setItem("life-rpg-refresh-token", response.refresh_token);
      setUser(response.user);
      setScreen("game");
    } catch (error) {
      setAuthState({ loading: false, error: error.message });
    }
  };

  const handleArcaneComplete = async (arcaneData) => {
    setPendingArcaneData(arcaneData);
    setShowArcaneOnboarding(false);
    setAuthState({ loading: true, error: "" });
    try {
      const payload = { email: form.email, password: form.password, display_name: form.display_name, interests: form.interests, profession: arcaneData.profession, grand_goal: arcaneData.goal, character_gender: registrationCharacter.gender, character_hair: registrationCharacter.hair, character_mouth: registrationCharacter.mouth, character_hair_color: registrationCharacter.hairColor, character_skin_color: registrationCharacter.skinColor, character_outfit_color: registrationCharacter.outfitColor };
      const response = await apiRequest("/auth/register", { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("life-rpg-token", response.access_token);
      localStorage.setItem("life-rpg-refresh-token", response.refresh_token);
      setUser(response.user);
      setScreen("game");
    } catch (error) {
      setAuthState({ loading: false, error: error.message });
    }
  };

  const [systemAlert, setSystemAlert] = useState(null);

  const triggerSystemAlert = (message) => {
    setSystemAlert(message);
    setTimeout(() => setSystemAlert(null), 4000);
  };

  if (systemAlert) {
    console.log(triggerSystemAlert);
  }

  if (screen === "game" && user) return <GamePage user={user} darkMode={darkMode} setDarkMode={setDarkMode} onLogout={() => { setUser(null); setScreen("landing"); }} />;

  if (showArcaneOnboarding) {
    return <ArcaneOnboarding onComplete={handleArcaneComplete} />;
  }

  return <div className="landing-shell" style={{ backgroundImage: `url(${darkMode ? darkBg : lightBg})` }}><div className="landing-wash" /><header className="landing-header"><button className="brand-lockup" type="button"><span className="brand-glyph">+</span><span><strong>REALMS</strong><small>OF ROUTINE</small></span></button><button className="round-control" type="button" onClick={() => setDarkMode(!darkMode)}>{darkMode ? "DAY" : "NIGHT"}</button></header><main className="landing-content"><section className="landing-copy"><p className="kicker">A LIFE RPG FOR THE REAL WORLD</p><h1>Restore the realm.<br /><em>Restore yourself.</em></h1><p>Turn the habits you keep postponing into a playable path of mastery. Every quest builds the character you are becoming.</p><div className="landing-ritual"><span className="ritual-line" /><div><strong>SEQUENCE 01 / THE AWAKENING</strong><small>Three attributes. Infinite progress.</small></div></div></section><section className="auth-panel" ref={authSectionRef}><div className="auth-panel-head"><p className="kicker">ENTER THE REALM</p><div className="mode-switch"><button className={authMode === "login" ? "active" : ""} type="button" onClick={() => switchAuthMode("login")}>Login</button><button className={authMode === "register" ? "active" : ""} type="button" onClick={() => switchAuthMode("register")}>New character</button></div></div><h2>{authMode === "login" ? "Welcome back, novice." : "Choose your first name."}</h2><p className="auth-subtitle">{authMode === "login" ? "Your next sequence is waiting." : "The broken realm needs a new kind of hero."}</p><form onSubmit={handleSubmit}>{authMode === "register" && <><input name="display_name" type="text" placeholder="Character name" value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} minLength={2} required /><input name="interests" type="text" placeholder="Interests for bonus quests" value={form.interests} onChange={(event) => setForm({ ...form, interests: event.target.value })} maxLength={500} /><div className="registration-character"><ChibiCharacter character={registrationCharacter} /><div><span>YOUR CHIBI</span><strong>{registrationCharacter.gender} / {registrationCharacter.hair}</strong></div><button type="button" className="text-link" onClick={() => setShowRegistrationForge(true)}>Design character -&gt;</button></div></>}<input name="email" type="email" placeholder="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /><input name="password" type="password" placeholder={authMode === "register" ? "Create a password (8+ characters)" : "Password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={authMode === "register" ? 8 : 1} required />{authState.error && <p className="form-error" role="alert">{authState.error}</p>}<button className="primary-btn wide" type="submit" disabled={authState.loading}>{authState.loading ? "Opening the gate..." : authMode === "login" ? "Enter the realm" : "Begin the journey"}<span>-&gt;</span></button></form><div className="auth-footer"><span>SECURE SESSION</span><small>Progress is saved to your realm.</small></div></section></main>{showRegistrationForge && <CharacterForge character={registrationCharacter} title="Design your first hero." saving={false} onSave={(next) => { setRegistrationCharacter(next); setShowRegistrationForge(false); }} onClose={() => setShowRegistrationForge(false)} />}</div>;
}

export default App;