import { useState } from 'react';
import { chats, messages } from './fakeData';
import './ChatScreen.css';

function ChatScreen({ onLogout }) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState(messages);

  const handleChatSelect = (chatId) => {
    setSelectedChat(chatId);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const newMsg = {
      id: chatMessages.length + 1,
      chatId: selectedChat,
      senderId: 'me',
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString()
    };

    setChatMessages([...chatMessages, newMsg]);
    setNewMessage('');
  };

  const handleAddChat = () => {
  };

  const selectedChatMessages = chatMessages.filter(
    msg => msg.chatId === selectedChat
  );

  const selectedChatData = chats.find(chat => chat.id === selectedChat);

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
          {chats.map((chat) => (
            <div 
              key={chat.id} 
              className={`chat-item ${selectedChat === chat.id ? 'active' : ''}`}
              onClick={() => handleChatSelect(chat.id)}
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
            </div>

            <div className="message-container">
              {selectedChatMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.senderId === 'me' ? 'sent' : 'received'}`}
                >
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
    </div>
  );
}

export default ChatScreen;