'use client';

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

const ChatContext = createContext(null);

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateTitle(content) {
  const cleaned = content.replace(/\n/g, ' ').trim();
  if (cleaned.length <= 40) return cleaned;
  return cleaned.substring(0, 40).trim() + '…';
}

function getDateGroup(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'Previous 7 Days';
  return 'Older';
}

const initialState = {
  conversations: [],
  activeConversationId: null,
  thinkingMode: false,
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...action.payload };

    case 'TOGGLE_THINKING_MODE':
      return { ...state, thinkingMode: !state.thinkingMode };

    case 'CREATE_CONVERSATION': {
      const newConversation = {
        id: generateId(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        conversations: [newConversation, ...state.conversations],
        activeConversationId: newConversation.id,
      };
    }

    case 'DELETE_CONVERSATION': {
      const filtered = state.conversations.filter(c => c.id !== action.payload);
      return {
        ...state,
        conversations: filtered,
        activeConversationId:
          state.activeConversationId === action.payload
            ? (filtered[0]?.id || null)
            : state.activeConversationId,
      };
    }

    case 'SET_ACTIVE':
      return { ...state, activeConversationId: action.payload };

    case 'ADD_MESSAGE': {
      const { conversationId, message } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map(c => {
          if (c.id !== conversationId) return c;
          const updatedMessages = [...c.messages, message];
          const title = c.messages.length === 0 && message.role === 'user'
            ? generateTitle(message.content)
            : c.title;
          return {
            ...c,
            messages: updatedMessages,
            title,
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'UPDATE_LAST_ASSISTANT_MESSAGE': {
      const { conversationId, content } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map(c => {
          if (c.id !== conversationId) return c;
          const messages = [...c.messages];
          const lastIdx = messages.length - 1;
          if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
            messages[lastIdx] = { ...messages[lastIdx], content };
          }
          return { ...c, messages, updatedAt: new Date().toISOString() };
        }),
      };
    }

    case 'CLEAR_ALL':
      return { ...initialState };

    default:
      return state;
  }
}

const STORAGE_KEY = 'notion-chatbot-state';

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      }
    } catch (err) {
      console.error('Failed to load chat state:', err);
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Failed to save chat state:', err);
    }
  }, [state]);

  const createConversation = useCallback(() => {
    dispatch({ type: 'CREATE_CONVERSATION' });
  }, []);

  const deleteConversation = useCallback((id) => {
    dispatch({ type: 'DELETE_CONVERSATION', payload: id });
  }, []);

  const setActive = useCallback((id) => {
    dispatch({ type: 'SET_ACTIVE', payload: id });
  }, []);

  const addMessage = useCallback((conversationId, message) => {
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        conversationId,
        message: {
          id: generateId(),
          timestamp: new Date().toISOString(),
          ...message,
        },
      },
    });
  }, []);

  const updateLastAssistantMessage = useCallback((conversationId, content) => {
    dispatch({
      type: 'UPDATE_LAST_ASSISTANT_MESSAGE',
      payload: { conversationId, content },
    });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const toggleThinkingMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_THINKING_MODE' });
  }, []);

  const activeConversation = state.conversations.find(
    c => c.id === state.activeConversationId
  ) || null;

  const groupedConversations = state.conversations.reduce((groups, conv) => {
    const group = getDateGroup(conv.updatedAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(conv);
    return groups;
  }, {});

  const value = {
    ...state,
    activeConversation,
    groupedConversations,
    createConversation,
    deleteConversation,
    setActive,
    addMessage,
    updateLastAssistantMessage,
    clearAll,
    toggleThinkingMode,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  return context;
}
