import React, { useState } from "react";
import "./LoginPage.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // TODO: replace with real API
    if (!email || !password) {
      setError("Invalid credentials. Please try again or sign up.");
      return;
    }

    setError("");
    console.log("Login with:", { email, password });
    // After success: navigate to /dashboard, etc.
  };

  return (
    <div className="login-root">
      {/* Top navbar (blue-ish, like screenshot) */}
      <header className="login-navbar">
        <div className="login-navbar-left">
          <div className="login-logo-circle">
            <span className="login-logo-icon">⏱</span>
          </div>
          <span className="login-brand-name">Timetabulator</span>
        </div>
      </header>

      {/* Center card */}
      <main className="login-main">
        <div className="login-card">
          <div className="login-card-heading">
            <h1>Welcome to Timetabulator</h1>
            <p>Good to have you back!</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">@</span>
                <input
                  id="email"
                  type="email"
                  placeholder="john.doe@timetabulator.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">🔒</span>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error message */}
            {error && <p className="login-error-text">{error}</p>}

            {/* Forgot password */}
            <div className="login-forgot-row">
              <button
                type="button"
                className="login-link-button"
                onClick={() => console.log("Forgot password clicked")}
              >
                Forgot Password?
              </button>
            </div>

            {/* Login button */}
            <button type="submit" className="login-submit-btn">
              Login
            </button>

            {/* Sign up */}
            <div className="login-signup-row">
              <span>Don&apos;t have an account?</span>
              <button
                type="button"
                className="login-link-button"
                onClick={() => console.log("Sign up clicked")}
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer className="login-footer">
          © 2024 Timetabulator. All rights reserved.
        </footer>
      </main>
    </div>
  );
};

export default LoginPage;
