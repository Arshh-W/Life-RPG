import { useState } from "react";
import "./App.css";

import darkBg from "./assets/dark-bg.jpeg"; // Image 2
import lightBg from "./assets/light-bg.jpeg"; // Image 1

function App() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div
      className="app"
      style={{
        backgroundImage: `url(${darkMode ? darkBg : lightBg})`,
      }}
    >
      <div className="overlay"></div>

      <header className="navbar">
        <div className="logo">
          <div className="logo-circle">✦</div>

          <div>
            <h2>Life-RPG</h2>
            <p>Plan • Level Up • Achieve</p>
          </div>
        </div>

        <button
          className="theme-btn"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? "☀" : "🌙"}
        </button>
      </header>

      <main className="content">
        <section className="hero">
          <h1>
            Your Life.
            <br />
            <span>Your Quest.</span>
          </h1>

          <p>
            Build better habits, complete your goals,
            and level up your future.
          </p>

          <div className="xp-card">
            <div className="avatar">🧑</div>

            <div className="xp-info">
              <h3>Lv. 1</h3>

              <div className="xp-bar">
                <div className="xp-fill"></div>
              </div>

              <p>0 / 100 XP</p>
            </div>
          </div>
        </section>

        <section className="login-section">
          <div className="login-card">
            <h2>Welcome Back</h2>
            <p>Log in to continue your journey</p>

            <input
              type="text"
              placeholder="Email or Username"
            />

            <input
              type="password"
              placeholder="Password"
            />

            <div className="options">
              <label>
                <input type="checkbox" />
                Remember me
              </label>

              <a href="/">Forgot password?</a>
            </div>

            <button className="login-btn">
              Login
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <button className="google-btn">
              Continue with Google
            </button>

            <p className="signup">
              Don't have an account?
              <a href="/"> Sign Up</a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;