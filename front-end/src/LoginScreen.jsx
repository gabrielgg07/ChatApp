import { useState, useRef, useEffect } from 'react';
import './LoginScreen.css';

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage]   = useState('');
  const [messageType, setMessageType] = useState('');
  const [focusedField, setFocusedField] = useState('username');
  const usernameRef = useRef(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(''); // clear old messages
    setMessageType('');
    onLogin(username, password);
  };

  const handleSignupClick = (e) => {
    e.preventDefault();
    // Replace with `create_user` command if you implement signup via WS
    setMessage('Signup sent – wait for server response');
    setMessageType('success');
  };

  return (
    <div className="login-container">
      <div className="combined-card">
        <div className="welcome-section">
          <h1 className="welcome-title">ChatApp</h1>
          <p className="welcome-subtitle">
            Experience seamless conversations with our AI-enhanced chat app, built using a custom NLP model, real-time socket communication, and a threadpool-powered backend for smooth performance.
          </p>
        </div>

        <div className="login-section">
          <form onSubmit={handleSubmit} className="login-form">
            {message && (
              <div className={`message ${messageType}`}>
                {message}
              </div>
            )}

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
              <button type="submit" className="login-button">
                Login
              </button>
              <button
                type="button"
                className="signup-button"
                onClick={handleSignupClick}
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