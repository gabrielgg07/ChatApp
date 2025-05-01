import { useState, useEffect, useRef, useCallback  } from 'react';
import { chats, messages } from './fakeData';
import './ChatScreen.css';


/* ───── tag constants ───── */
const TAG_CHATS    = 'CHATS ';          // note the SPACE – that’s what the server sends
const TAG_HISTORY  = 'MESSAGES_JSON';   // bulk load
const TAG_LIVE     = 'MESSAGE_JSON';    // single push
const TAG_INSIGHTS = "INSIGHTS";

/* helper */
const hasTag = (s, tag) => s.startsWith(tag);

function ChatScreen({  socket, onLogout, username }) {
  const [chatList, setChatList]       = useState([]);  // start empty
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]); // start empty
  const [newMessage, setNewMessage]     = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showEditChatModal, setShowEditChatModal] = useState(false);

  const [showAIInsightsModal, setShowAIInsightsModal] = useState(false);
  const [aiInsights, setAIInsights] = useState(null);


  const openAIInsightsModal = () => {
    setShowAIInsightsModal(true);
  };

  const closeAIInsightsModal = () => {
    setShowAIInsightsModal(false);
  };
  


  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);
  
  const [newChatForm, setNewChatForm] = useState({
    username: '',
    firstName: '',
    lastName: ''
  });
  const [editChatForm, setEditChatForm] = useState({
    firstName: '',
    lastName: ''
  });

    /* one, stable listener (no re-creation every render) */
    const handleIncoming = useCallback((evt) => {
      const msg = evt.data.trim();
      console.log("[INCOMING SOCKET MESSAGE]", msg);
      
  
      /* ─── 1. CHATS LIST ───────────────────────────── */
      if (hasTag(msg, TAG_CHATS)) {
        let raw;
        try { raw = JSON.parse(msg.slice(TAG_CHATS.length)); }
        catch { console.error('Invalid CHATS JSON'); return; }
  
        const uiChats = raw.map((c, idx) => {
          const peer = c.users.find(u => u !== username) || c.chat_id;
          let lm = c.last_message;
          if (Array.isArray(lm)) lm = lm.join(' ');
          const time = new Date(c.timestamp)
                         .toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
          return {
            id: idx + 1,
            chatId: c.chat_id,
            name: peer,
            lastMessage: lm,
            lastMessageTime: time,
            unread: 0,
          };
        });
  
        setChatList(uiChats);
        return;
      }

      /* ─── AI INSIGHTS ───────────────────────────── */
      if (hasTag(msg, TAG_INSIGHTS)) {
        try {
          const insights = JSON.parse(msg.slice(TAG_INSIGHTS.length).trim());
          console.log("🧠 AI Insights:", insights);
          setAIInsights(insights);
        } catch (e) {
          console.error("Invalid INSIGHTS JSON:", e);
        }
        return;
      }
  
      /* ─── 2. HISTORY (bulk) ──────────────────────── */
      if (hasTag(msg, TAG_HISTORY)) {
        const arr = JSON.parse(msg.slice(TAG_HISTORY.length).trim());
  
        const structured = arr.map((m, idx) => ({
          id: idx + 1,
          chatId: selectedChatRef.current,
          senderId: m.username === username ? 'me' : 'them',
          username: m.username,
          text: Array.isArray(m.content) ? m.content.join(' ') : m.content,
          timestamp: new Date(m.timestamp)
                       .toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
          date: new Date(m.timestamp).toLocaleDateString(),
        }));
  
        setChatMessages(structured);
        return;
      }
  
      /* ─── 3. LIVE PUSH ───────────────────────────── */
      if (hasTag(msg, TAG_LIVE)) {
        const m    = JSON.parse(msg.slice(TAG_LIVE.length).trim());
        const text = Array.isArray(m.content) ? m.content.join(' ') : m.content;
  
        const bubble = {
          id: Date.now(),
          chatId:   m.chat_id,
          senderId: m.username === username ? 'me' : 'them',
          username: m.username,
          text,
          timestamp: new Date(m.timestamp)
                       .toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
          date: new Date(m.timestamp).toLocaleDateString(),
        };
  
        setChatMessages(prev => [...prev, bubble]);
        setChatList(prev =>
          prev.map(c => {
            if (c.chatId !== m.chat_id) return c;
            const inc = selectedChatRef.current === m.chat_id ? 0 : 1;
            return {
              ...c,
              lastMessage:     text,
              lastMessageTime: bubble.timestamp,
              unread:          (c.unread || 0) + inc,
            };
          })
        );
        return;
      }

       /* ─── 4. PLAIN "user: message" frame ───────────────── */
   const plain = msg.match(/^([^:]+):\s*(.+)$/);   // username : text
   if (plain) {
     const [, user, txt] = plain;

     const bubble = {
       id: Date.now(),
       chatId:   selectedChatRef.current,          // we’re already in this chat
       senderId: user === username ? 'me' : 'them',
       username: user,
       text:     txt,
       timestamp: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
       date:      new Date().toLocaleDateString(),
     };

     setChatMessages(prev => [...prev, bubble]);
     setChatList(prev =>
       prev.map(c => {
         if (c.chatId !== bubble.chatId) return c;
         const inc = selectedChatRef.current === bubble.chatId ? 0 : 1;
         return {
           ...c,
           lastMessage:     txt,
           lastMessageTime: bubble.timestamp,
           unread:          (c.unread || 0) + inc,
         };
       })
     );
     return;                                     // we handled it
   }
  
      /* ─── 4. Anything else – just log it ─────────── */
      console.warn('Unhandled frame:', msg.slice(0, 60));
    }, [username, selectedChatRef, setChatList, setChatMessages]);
  
    /* attach ONCE, detach on unmount */
    useEffect(() => {
      if (!socket) return;
  
      socket.onmessage = handleIncoming;      // ✔ one stable listener
      socket.send('get_chats');               // first fetch on mount
  
      return () => { socket.onmessage = null; };
    }, [socket, handleIncoming]);
  
    /* if you join a room when the user selects it */
    useEffect(() => {
      if (!socket || !selectedChat) return;
      socket.send(`join ${selectedChat}`);
    }, [socket, selectedChat]);


    useEffect(() => {
      if (!socket || !selectedChat) return;

      // Send the command to request insights
      socket.send(`get_ai_insights ${selectedChat}`);
    }, [socket, selectedChat]);
  

  const handleChatSelect = (chatId) => {
    setSelectedChat(chatId);
    // request all messages for this chat
    socket.send(`get_all_messages ${chatId}`);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;


    socket.send(`send_message ${selectedChat} ${username} ${newMessage}`);
    const newMsg = {
      id: chatMessages.length + 1,
      chatId: selectedChat,
      senderId: 'me',
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString()
    };
  // ------------ Render Logic ------------//
  setChatMessages([...chatMessages, newMsg]);
    setNewMessage('');
  };

  const handleAddChat = () => {
    setShowNewChatModal(true);
  };

  const handleEditChat = () => {
    if (!selectedChatData) return;
    
    // Parse the first and last name from the selected chat's name
    const nameParts = selectedChatData.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    setEditChatForm({
      firstName,
      lastName
    });
    
    setShowEditChatModal(true);
  };

  const handleCloseModal = () => {
    setShowNewChatModal(false);
    setShowEditChatModal(false);
    // Reset forms
    setNewChatForm({
      username: '',
      firstName: '',
      lastName: ''
    });
    setEditChatForm({
      firstName: '',
      lastName: ''
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewChatForm({
      ...newChatForm,
      [name]: value
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditChatForm({
      ...editChatForm,
      [name]: value
    });
  };

  const handleStartNewChat = () => {
    // Validate form fields
    if (!newChatForm.username.trim() || !newChatForm.firstName.trim() || !newChatForm.lastName.trim()) {
      return; // Don't submit if any field is empty
    }

    // Create new chat
    const newChat = {
      id: chatList.length + 1,
      name: `${newChatForm.firstName} ${newChatForm.lastName}`,
      username: newChatForm.username,
      lastMessage: '', 
      lastMessageTime: '', 
    };

    // Add to chat list
    setChatList([...chatList, newChat]);
    
    // Close modal
    handleCloseModal();
    
    // Select the new chat
    setSelectedChat(newChat.id);
  };

  const handleSaveChat = () => {
    // Validate form fields
    if (!editChatForm.firstName.trim() || !editChatForm.lastName.trim()) {
      return; // Don't submit if any field is empty
    }

    // Update chat list
    const updatedChatList = chatList.map(chat => {
      if (chat.id === selectedChat) {
        return {
          ...chat,
          name: `${editChatForm.firstName} ${editChatForm.lastName}`
        };
      }
      return chat;
    });

    setChatList(updatedChatList);
    
    // Close modal
    handleCloseModal();
  };

  const handleDeleteChat = () => {
    // Filter out the selected chat
    const updatedChatList = chatList.filter(chat => chat.id !== selectedChat);
    
    // Update chat list
    setChatList(updatedChatList);
    
    // Clear selected chat
    setSelectedChat(null);
    
    // Close modal
    handleCloseModal();
  };

  const handleAIInsights = () => {
    console.log("AI Insights button clicked!");
    // TODO: logic to fetch/display insights
  };

  const selectedChatMessages = chatMessages.filter(
    msg => msg.chatId === selectedChat
  );

  const selectedChatData = chatList.find(chat => chat.chatId === selectedChat);

  // Helper function to get initials from a name
  const getInitials = (name) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`;
    }
    return name.charAt(0);
  };

  return (
    <div className="chat-screen">
      {/* Left Panel - Chat List */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Chats</h2>
          <div className="header-buttons">
            <button className="add-chat-button" onClick={handleAddChat}>
              <span className="add-icon">+</span> Add Chat
            </button>
            <button className="logout-button" onClick={onLogout}>
              <span className="logout-icon">↪</span> Logout
            </button>
          </div>
        </div>
        <div className="chat-list">
        {chatList.map((chat) => (
   <div 
     key={chat.chatId} 
     className={`chat-item ${selectedChat === chat.chatId ? 'active' : ''}`}
     onClick={() => handleChatSelect(chat.chatId)}
   >
              <div className="chat-avatar">
                {getInitials(chat.name)}
              </div>
              <div className="chat-preview">
                <div className="chat-preview-header">
                  <h3>{chat.name}</h3>
                  <span className="chat-date">{chat.lastMessageTime}</span>
                </div>
                <p className="chat-last-message">{chat.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat View */}
      <div className="chat-view">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div className="chat-contact-info">
                <div className="chat-avatar">
                  {selectedChatData ? getInitials(selectedChatData.name) : ''}
                </div>
                <h2>{selectedChatData?.name}</h2>
              </div>
              <button className="ai-insights-button" onClick={openAIInsightsModal}>
                <span className="rainbow-text">AI Insights</span>
              </button>

              {showAIInsightsModal && (
                <div className="modal-overlay" onClick={closeAIInsightsModal}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>AI Insights</h2>
                      <button className="close-button" onClick={closeAIInsightsModal}>×</button>
                    </div>
                    <div className="modal-body">
                        {showAIInsightsModal && (
                        <AIInsightsModal
                          onClose={closeAIInsightsModal}
                          insights={aiInsights}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button className="edit-chat-button" onClick={handleEditChat}>
                <span>Edit</span> <span className="three-dots">⋮</span>
              </button>
            </div>

            <div className="message-container">
              {selectedChatMessages.map((message) => (
                <div 
                key={message.id} 
                className={`message ${message.senderId==='me'?'sent':'received'}`}
              >
                {message.senderId === 'them' && (
                  <div className="sender-name">{message.username}</div>
                )}
                <div className="message-bubble">
                  {message.text}
                </div>
                <div className="message-time">{message.timestamp}</div>
              </div>
              ))}
            </div>

            <form className="message-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="send-button">
                <i className="icon-send">➤</i>
              </button>
            </form>
          </>
        ) : (
          <div className="empty-chat-placeholder">
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>➤ Start a New Chat</h2>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input 
                  type="text" 
                  id="username" 
                  name="username"
                  value={newChatForm.username}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="firstName">First Name:</label>
                <input 
                  type="text" 
                  id="firstName" 
                  name="firstName"
                  value={newChatForm.firstName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name:</label>
                <input 
                  type="text" 
                  id="lastName" 
                  name="lastName"
                  value={newChatForm.lastName}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="start-chat-button" onClick={handleStartNewChat}>
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Chat Modal */}
      {showEditChatModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>➤ Edit Existing Chat</h2>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="editFirstName">First Name:</label>
                <input 
                  type="text" 
                  id="editFirstName" 
                  name="firstName"
                  value={editChatForm.firstName}
                  onChange={handleEditFormChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="editLastName">Last Name:</label>
                <input 
                  type="text" 
                  id="editLastName" 
                  name="lastName"
                  value={editChatForm.lastName}
                  onChange={handleEditFormChange}
                />
              </div>
            </div>
            <div className="modal-footer edit-modal-footer">
              <button className="cancel-button" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="save-button" onClick={handleSaveChat}>
                Save
              </button>
              <button className="delete-button" onClick={handleDeleteChat}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const AIInsightsModal = ({ insights, onClose }) => {
  if (!insights) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Insights</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <h4>Additional Notes</h4>
          <p>{insights.additional_notes}</p>

          <h4>Pending Tasks</h4>
          <ul>
            {insights.pending_tasks.map((task, idx) => (
              <li key={idx}>
                <strong>{task.description}</strong><br />
                <small>Assigned to: {task.assigned_to}</small>
              </li>
            ))}
          </ul>

          <h4>Completed Tasks</h4>
          <ul>
            {insights.completed_tasks.map((task, idx) => (
              <li key={idx}>
                ✅ {task.description} <small>(by {task.completed_by})</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;