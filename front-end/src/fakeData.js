export const chats = [
    {
      id: 1,
      name: 'Alice Johnson',
      lastMessage: 'Hey! Are we still meeting for coffee tomorrow?',
      lastMessageTime: '10:23 AM',
      unread: 2,
    },
    {
      id: 2,
      name: 'Bob Smith',
      lastMessage: 'I sent you the project files. Let me know what you think!',
      lastMessageTime: 'Yesterday',
      unread: 0,
    },
    {
      id: 3,
      name: 'Charlie Davis',
      lastMessage: 'Thanks for your help with the presentation. The client loved it!',
      lastMessageTime: 'Monday',
      unread: 0,
    }
  ];
  
  export const messages = [
    {
      id: 1,
      chatId: 1,
      senderId: 'other',
      text: 'Hi there! How are you doing?',
      timestamp: '9:15 AM',
      date: '04/23/2025'
    },
    {
      id: 2,
      chatId: 1,
      senderId: 'me',
      text: 'I\'m good, thanks for asking! How about you?',
      timestamp: '9:20 AM',
      date: '04/23/2025'
    },
    {
      id: 3,
      chatId: 1,
      senderId: 'other',
      text: 'Doing well! Hey! Are we still meeting for coffee tomorrow?',
      timestamp: '10:23 AM',
      date: '04/23/2025'
    },
    {
      id: 4,
      chatId: 2,
      senderId: 'other',
      text: 'Hello! I just finished the project we discussed.',
      timestamp: '11:35 AM',
      date: '04/22/2025'
    },
    {
      id: 5,
      chatId: 2,
      senderId: 'other',
      text: 'I sent you the project files. Let me know what you think!',
      timestamp: '11:36 AM',
      date: '04/22/2025'
    },
    {
      id: 6,
      chatId: 3,
      senderId: 'other',
      text: 'The presentation went great!',
      timestamp: '3:45 PM',
      date: '04/21/2025'
    },
    {
      id: 7,
      chatId: 3,
      senderId: 'other',
      text: 'Thanks for your help with the presentation. The client loved it!',
      timestamp: '3:47 PM',
      date: '04/21/2025'
    }
  ];