import { useEffect, useState } from 'react'
import { apiRequest } from './api'
import './App.css'

const emptyForm = { title: '', description: '', category: 'intelligence', is_mandatory: false }

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', display_name: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await apiRequest(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) })
      localStorage.setItem('life-rpg-token', result.access_token); onAuthenticated(result)
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }

  return <main className="auth-shell"><section className="auth-art" aria-hidden="true"><div className="auth-sigil">+</div><p>REALMS OF ROUTINE / SEQUENCE 01</p><h1>Restore your<br /><em>momentum.</em></h1><p className="auth-lore">A shattered realm waits for small acts of courage. Every quest you complete rebuilds a little more of the world.</p><div className="realm-badges"><span>FOCUS TREE</span><span>DAILY TRINITY</span><span>WAYFINDER</span></div><span className="auth-orbit" /></section><section className="auth-panel"><p className="eyebrow">The pathway to mastery</p><h2>{mode === 'login' ? 'Welcome back, adventurer.' : 'Begin your sequence.'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Your next meaningful action is waiting.' : 'Create a character for the life you are building.'}</p><form onSubmit={submit}>{mode === 'register' && <label>Display name<input required minLength="2" maxLength="80" value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} placeholder="What should we call you?" /></label>}<label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label><label>Password<input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Opening the gate...' : mode === 'login' ? 'Enter the realm' : 'Create character'}</button></form><button className="switch-button" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'New here? Create an account' : 'Already have a character? Sign in'}</button></section></main>
}

function LoadingSkeleton() { return <div className="skeleton-list" aria-label="Loading quests"><span /><span /><span /></div> }

function AttributeBar({ label, value, accent }) {
  return <div className="attribute-row"><div><span>{label}</span><strong>{value}</strong></div><span className={`attribute-track ${accent}`}><i style={{ width: `${Math.min(100, value * 2)}%` }} /></span></div>
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('life-rpg-token'))
  const [user, setUser] = useState(null)
  const [progression, setProgression] = useState(null)
  const [tasks, setTasks] = useState([])
  const [shop, setShop] = useState([])
  const [loading, setLoading] = useState(Boolean(token))
  const [sessionError, setSessionError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [purchasingId, setPurchasingId] = useState(null)

  useEffect(() => {
    if (!token) return
    Promise.all([
      apiRequest('/auth/me', {}, token),
      apiRequest('/tasks', {}, token),
      apiRequest('/progression/profile', {}, token),
      apiRequest('/economy/shop', {}, token),
    ]).then(([currentUser, currentTasks, currentProgression, currentShop]) => {
      setUser(currentUser); setTasks(currentTasks); setProgression(currentProgression); setShop(currentShop)
    }).catch((requestError) => { if (requestError.status === 401) { localStorage.removeItem('life-rpg-token'); setToken(null) } else { setSessionError(requestError.message) } }).finally(() => setLoading(false))
  }, [token])

  function authenticated(result) { setSessionError(''); setToken(result.access_token); setUser(result.user); setLoading(true) }
  function logout() { localStorage.removeItem('life-rpg-token'); setToken(null); setUser(null); setTasks([]); setProgression(null) }

  async function refreshProgression() {
    const [currentUser, currentProgression] = await Promise.all([apiRequest('/auth/me', {}, token), apiRequest('/progression/profile', {}, token)])
    setUser(currentUser); setProgression(currentProgression)
    return currentProgression
  }

  async function saveTask(event) {
    event.preventDefault(); if (!form.title.trim()) return
    setSaving(true); setError('')
    try {
      if (editingId) {
        const updated = await apiRequest(`/tasks/${editingId}`, { method: 'PATCH', body: JSON.stringify(form) }, token)
        setTasks((current) => current.map((task) => task.id === editingId ? updated : task))
      } else {
        const created = await apiRequest('/tasks', { method: 'POST', body: JSON.stringify(form) }, token)
        setTasks((current) => [created, ...current])
      }
      setForm(emptyForm); setEditingId(null)
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  async function completeTask(task) {
    const previousTasks = tasks; const previousUser = user; const previousProgression = progression
    if (task.is_completed) return
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, is_completed: true } : item))
    setUser((current) => ({ ...current, xp: current.xp + task.xp_reward, coins: current.coins + 10 }))
    setNotice(`+${task.xp_reward} XP earned`)
    window.setTimeout(() => setNotice(''), 2200)
    try {
      const completed = await apiRequest(`/tasks/${task.id}/complete`, { method: 'POST' }, token)
      setTasks((current) => current.map((item) => item.id === task.id ? completed : item))
      const updatedProgression = await refreshProgression()
      if (updatedProgression.level > (previousProgression?.level || user.level)) {
        setNotice(`Level ${updatedProgression.level} unlocked`)
      }
      const refreshedShop = await apiRequest('/economy/shop', {}, token)
      setShop(refreshedShop)
    } catch (requestError) { setTasks(previousTasks); setUser(previousUser); setProgression(previousProgression); setError(requestError.message) }
  }

  async function deleteTask(taskId) {
    const previousTasks = tasks; setTasks((current) => current.filter((task) => task.id !== taskId))
    try { await apiRequest(`/tasks/${taskId}`, { method: 'DELETE' }, token) } catch (requestError) { setTasks(previousTasks); setError(requestError.message) }
  }

  async function purchase(item) {
    setPurchasingId(item.id); setError('')
    try {
      const result = await apiRequest(`/economy/items/${item.id}/purchase`, { method: 'POST' }, token)
      setShop((current) => current.map((shopItem) => shopItem.id === item.id ? result.item : shopItem))
      setUser((current) => ({ ...current, coins: result.coins_remaining }))
      setNotice(`${item.name} added to inventory`); window.setTimeout(() => setNotice(''), 2200)
    } catch (requestError) { setError(requestError.message) } finally { setPurchasingId(null) }
  }

  if (!token || (!user && !loading && !sessionError)) return <AuthScreen onAuthenticated={authenticated} />
  if (sessionError) return <main className="loading-screen"><div className="loading-mark">!</div><p role="alert">{sessionError}</p><button className="primary-button" type="button" onClick={() => window.location.reload()}>Reconnect to realm</button></main>
  if (loading || !user || !progression) return <main className="loading-screen"><div className="loading-mark">+</div><p>Opening your realm...</p></main>
  const completed = tasks.filter((task) => task.is_completed).length
  const attributes = progression.attributes
  return <main className="app-shell"><header className="topbar"><a className="brand" href="#top"><span className="brand-mark">+</span><span>LIFE RPG</span></a><nav><a className="nav-link active" href="#quests">Quests</a><a className="nav-link" href="#character">Character</a><a className="nav-link" href="#inventory">Rewards</a></nav><div className="header-actions"><span className="coin-pill">◈ {user.coins}</span><button className="profile-button" type="button" onClick={logout}><span className="avatar">{user.display_name[0].toUpperCase()}</span><span className="profile-name">{user.display_name}</span><span className="chevron">Log out</span></button></div></header>{notice && <div className="reward-toast" role="status">✦ {notice}</div>}<section className="hero-panel" id="character"><div className="hero-copy"><p className="eyebrow">Your sequence is active</p><h1>Make today<br /><em>count.</em></h1><p className="hero-note">Small actions compound into a life you are proud of.</p></div><div className="hero-figure" aria-hidden="true"><span className="figure-sun" /><span className="figure-orbit" /><span className="figure-orbit orbit-two" /><span className="figure-star">+</span><div className="figure-core">LVL<br /><strong>{String(progression.level).padStart(2, '0')}</strong></div></div><div className="level-card"><div className="level-heading"><span>Current level</span><strong>{String(progression.level).padStart(2, '0')}</strong></div><div className="xp-bar" aria-label={`${progression.xp} XP toward ${progression.next_level_xp} XP`}><span style={{ width: `${progression.level_progress}%` }} /></div><div className="xp-label"><span>{progression.xp} XP</span><span>{progression.next_level_xp} XP</span></div><p>{Math.max(0, progression.next_level_xp - progression.xp)} XP until next level</p></div></section><section className="content-grid"><div className="quest-section" id="quests"><div className="section-heading"><div><p className="eyebrow">Your daily run</p><h2>Active quests</h2></div><span className="quest-count">{completed} / {tasks.length} cleared</span></div>{error && <p className="form-error" role="alert">{error}</p>}{loading ? <LoadingSkeleton /> : <div className="quest-list">{tasks.map((task, index) => <article className={`quest-card ${task.is_completed ? 'completed' : ''}`} key={task.id}><span className="quest-number">{String(index + 1).padStart(2, '0')}</span><div className="quest-info"><span className="quest-type">{task.category}</span><h3>{task.title}</h3><span className="quest-reward">+{task.xp_reward} XP {task.is_mandatory && ' / mandatory'}</span></div><div className="task-actions">{!task.is_completed && <button className="complete-button" type="button" onClick={() => completeTask(task)}>Clear</button>}<button className="text-button" type="button" onClick={() => { setEditingId(task.id); setForm({ title: task.title, description: task.description || '', category: task.category, is_mandatory: task.is_mandatory }) }}>Edit</button><button className="text-button danger" type="button" onClick={() => deleteTask(task.id)}>Delete</button></div></article>)}</div>}</div><aside className="create-panel" id="inventory"><p className="eyebrow">Add to your path</p><h2>{editingId ? 'Edit quest' : 'New quest'}</h2><form className="task-form" onSubmit={saveTask}><label>Quest title<input value={form.title} maxLength="160" onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What will move you forward?" /></label><label>Attribute<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="intelligence">Intelligence</option><option value="physicality">Physicality</option><option value="social">Social & emotional</option></select></label><label className="checkbox-label"><input type="checkbox" checked={form.is_mandatory} onChange={(event) => setForm({ ...form, is_mandatory: event.target.checked })} /> Daily Trinity quest</label><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create quest'}</button>{editingId && <button className="switch-button" type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }}>Cancel edit</button>}</form><div className="mini-stat"><span>Streak</span><strong>{progression.streak_count} days</strong></div><div className="mini-stat"><span>Coins</span><strong>◈ {user.coins}</strong></div></aside></section><section className="progression-band"><div className="attribute-panel"><div className="section-heading"><div><p className="eyebrow">Focus tree</p><h2>Attributes</h2></div><span className="streak-badge">{progression.streak_count} day streak</span></div><AttributeBar label="Intelligence" value={attributes.intelligence} accent="lime" /><AttributeBar label="Strength" value={attributes.strength} accent="orange" /><AttributeBar label="Social & emotional" value={attributes.emotional_intelligence} accent="cyan" /><AttributeBar label="Discipline" value={attributes.discipline} accent="paper" /></div><div className="shop-panel"><div className="section-heading"><div><p className="eyebrow">Spend your earned currency</p><h2>Reward vault</h2></div><span className="coin-total">◈ {user.coins}</span></div><div className="shop-grid">{shop.map((item) => <article className={`shop-card rarity-${item.rarity}`} key={item.id}><div className="item-glyph">✦</div><div><span className="item-rarity">{item.rarity}</span><h3>{item.name}</h3><p>{item.description}</p></div><button className="buy-button" type="button" disabled={purchasingId === item.id || user.coins < item.cost} onClick={() => purchase(item)}>{item.owned_quantity ? `Own ${item.owned_quantity}` : `◈ ${item.cost}`}</button></article>)}</div></div></section></main>
}

export default App