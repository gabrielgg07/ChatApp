// LoginScreen.jsx  –  revised signup flow
// Needs a `sendCommand` prop that writes raw strings to the WebSocket.

import { useState, useRef, useEffect } from 'react';
import './LoginScreen.css';

function LoginScreen({ onLogin, sendCommand }) {
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [message, setMessage]         = useState('');
  const [messageType, setMessageType] = useState('');
  const [focusedField, setFocusedField] = useState('username');
  const usernameRef = useRef(null);

  // focus username on mount
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // reusable helper
  const resetMsg = () => { setMessage(''); setMessageType(''); };

  const fieldsFilled = username.trim() && password.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    resetMsg();
    onLogin(username, password);                   // normal login
  };

  const handleSignupClick = async (e) => {
    e.preventDefault();
    resetMsg();

    if (!fieldsFilled) {
      setMessage('Username and password required');
      setMessageType('error');
      return;
    }

    try {
      // 1) join <username>
      await sendCommand(`join ${username}`);

      // 2) create_user <username> <password>
      await sendCommand(`create_user ${username} ${password}`);

      // 3) reuse existing login flow
      setMessage('Account created – logging in…');
      setMessageType('success');
      onLogin(username, password);
    } catch (err) {
      setMessage(`Signup failed: ${err.message}`);
      setMessageType('error');
    }
  };

  return (
    <div className="login-container">
      <div className="combined-card">
        <div className="welcome-section">
          <h1 className="welcome-title">ChatApp</h1>
          <p className="welcome-subtitle">
            Experience seamless conversations with our AI-enhanced chat app, powered by sockets and a thread-pooled backend.
          </p>
        </div>

        <div className="login-section">
          <form onSubmit={handleSubmit} className="login-form">
            {message && <div className={`message ${messageType}`}>{message}</div>}

            <div className={`form-group ${focusedField === 'username' ? 'focused' : ''}`}>
              <label htmlFor="username">Username</label>
              <input
                ref={usernameRef}
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className={`form-group ${focusedField === 'password' ? 'focused' : ''}`}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="button-group">
              <button type="submit" className="login-button" disabled={!fieldsFilled}>
                Login
              </button>
              <button
                type="button"
                className="signup-button"
                onClick={handleSignupClick}
                disabled={!fieldsFilled}
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
