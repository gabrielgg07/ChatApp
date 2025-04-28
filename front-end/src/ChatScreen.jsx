import { useState } from 'react';
import { chats, messages } from './fakeData';
import './ChatScreen.css';

function ChatScreen({ onLogout }) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState(messages);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showEditChatModal, setShowEditChatModal] = useState(false);
  const [chatList, setChatList] = useState(chats);
  const [newChatForm, setNewChatForm] = useState({
    username: '',
    firstName: '',
    lastName: ''
  });
  const [editChatForm, setEditChatForm] = useState({
    firstName: '',
    lastName: ''
  });

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

  const selectedChatMessages = chatMessages.filter(
    msg => msg.chatId === selectedChat
  );

  const selectedChatData = chatList.find(chat => chat.id === selectedChat);

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
              <button className="edit-chat-button" onClick={handleEditChat}>
                <span>Edit</span> <span className="three-dots">⋮</span>
              </button>
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

export default ChatScreen;