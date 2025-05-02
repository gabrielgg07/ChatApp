import React, { useState, useRef, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import ChatScreen from './ChatScreen';  // your post-login UI

function App() {
  const socketRef = useRef(null);
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  // Open WebSocket once on mount
  useEffect(() => {
    socketRef.current = new WebSocket('ws://localhost:5000');

    socketRef.current.onopen = () => console.log('[WS] connected');

    socketRef.current.onmessage = (evt) => {
      const msg = evt.data.trim();
      if (msg.startsWith('LOGIN_SUCCESS')) {
        console.log('[WS] login success');
        console.log(username)
        setLoggedIn(true);
      }
      // handle other incoming messages here...
    };

    socketRef.current.onerror = (err) => {
      console.error('[WS] error', err);
    };

    socketRef.current.onclose = () => {
      console.log('[WS] disconnected');
    };

    return () => {
      socketRef.current.close();
    };
  }, []);

  // Called by LoginScreen
  const handleLogin = (user, pass) => {
     // 1️⃣ tell the server who I am
    socketRef.current.send(`JOIN ${user}`);
    setUsername(user);
    socketRef.current.send(`login_user ${user} ${pass}`);
  };

  return (
    loggedIn
      ? <ChatScreen socket={socketRef.current} username={username} />
      : <LoginScreen onLogin={handleLogin} username={username} socket={socketRef} sendCommand={(cmd) => socketRef.current.send(cmd)}/>
  );
}

export default App;
