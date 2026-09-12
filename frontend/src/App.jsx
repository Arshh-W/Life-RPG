import { useState } from 'react'
import './App.css'

const initialQuests = [
  { id: 1, title: 'Ship one meaningful thing', type: 'Craft', reward: 120, icon: '01', completed: false },
  { id: 2, title: 'Move your body for 20 minutes', type: 'Vitality', reward: 80, icon: '02', completed: false },
  { id: 3, title: 'Read 10 pages', type: 'Focus', reward: 60, icon: '03', completed: false },
]

function App() {
  const [quests, setQuests] = useState(initialQuests)
  const completedQuests = quests.filter((quest) => quest.completed).length
  const xp = 840 + quests.reduce((total, quest) => total + (quest.completed ? quest.reward : 0), 0)

  function completeQuest(id) {
    setQuests((currentQuests) => currentQuests.map((quest) => (
      quest.id === id ? { ...quest, completed: !quest.completed } : quest
    )))
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Life RPG home"><span className="brand-mark">+</span><span>LIFE RPG</span></a>
        <nav aria-label="Primary navigation"><a className="nav-link active" href="#quests">Quests</a><a className="nav-link" href="#character">Character</a><a className="nav-link" href="#inventory">Inventory</a></nav>
        <button className="profile-button" type="button" aria-label="Open profile menu"><span className="avatar">A</span><span className="profile-name">Alex</span><span className="chevron">v</span></button>
      </header>

      <section className="hero-panel" id="character">
        <div className="hero-copy"><p className="eyebrow">Tuesday, September 12</p><h1>Make today<br /><em>count.</em></h1><p className="hero-note">Small actions compound into a life you are proud of.</p></div>
        <div className="hero-figure" aria-hidden="true"><span className="figure-sun" /><span className="figure-orbit orbit-one" /><span className="figure-orbit orbit-two" /><span className="figure-star">+</span><span className="figure-star star-two">+</span><div className="figure-core">LVL<br /><strong>08</strong></div></div>
        <div className="level-card"><div className="level-heading"><span>Current level</span><strong>08</strong></div><div className="xp-bar" aria-label={`${xp} of 1200 XP`}><span style={{ width: `${(xp / 1200) * 100}%` }} /></div><div className="xp-label"><span>{xp} XP</span><span>1200 XP</span></div><p>360 XP until next level</p></div>
      </section>

      <section className="content-grid">
        <div className="quest-section" id="quests"><div className="section-heading"><div><p className="eyebrow">Your daily run</p><h2>Active quests</h2></div><span className="quest-count">{completedQuests} / {quests.length} cleared</span></div><div className="quest-list">{quests.map((quest) => <article className={`quest-card ${quest.completed ? 'completed' : ''}`} key={quest.id}><span className="quest-number">{quest.icon}</span><div className="quest-info"><span className="quest-type">{quest.type}</span><h3>{quest.title}</h3><span className="quest-reward">+{quest.reward} XP</span></div><button className="complete-button" type="button" onClick={() => completeQuest(quest.id)} aria-label={`${quest.completed ? 'Uncomplete' : 'Complete'} ${quest.title}`}>{quest.completed ? 'Done' : 'Clear'}</button></article>)}</div></div>
        <aside className="stats-panel" id="inventory"><div className="section-heading"><div><p className="eyebrow">The long game</p><h2>Momentum</h2></div><span className="streak-flame">*</span></div><div className="streak-score"><strong>07</strong><span>day streak</span></div><div className="week-grid" aria-label="Weekly activity"><span className="day active">M<i /></span><span className="day active">T<i /></span><span className="day active">W<i /></span><span className="day active">T<i /></span><span className="day today">F<i /></span><span className="day">S<i /></span><span className="day">S<i /></span></div><div className="stat-row"><span>Strength</span><strong>42</strong><span className="stat-track"><i style={{ width: '72%' }} /></span></div><div className="stat-row"><span>Focus</span><strong>31</strong><span className="stat-track"><i style={{ width: '54%' }} /></span></div><div className="stat-row"><span>Vitality</span><strong>26</strong><span className="stat-track"><i style={{ width: '45%' }} /></span></div></aside>
      </section>
    </main>
  )
}

export default App