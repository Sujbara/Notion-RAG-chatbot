'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '@/lib/chatStore';
import { useChat } from '@/hooks/useChat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';
import styles from './ChatArea.module.css';

export default function ChatArea({ onMenuClick }) {
  const { 
    activeConversation, 
    activeConversationId, 
    createConversation, 
    addMessage, 
    updateLastAssistantMessage,
    thinkingMode,
    toggleThinkingMode
  } = useChatStore();
  const { messages, isStreaming, sendMessage, stopStreaming } = useChat();
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messages.length > 0 ? messages[messages.length - 1]?.content : null]);

  const handleSend = useCallback(async (text, attachments) => {
    if (!activeConversationId) {
      // Create a new conversation first, then send will happen on next render
      createConversation();
      // We need to defer the send to after state updates
      setTimeout(() => {
        sendMessage(text, attachments);
      }, 50);
      return;
    }
    sendMessage(text, attachments);
  }, [activeConversationId, createConversation, sendMessage]);

  const handleSuggestionClick = useCallback((text) => {
    if (!activeConversationId) {
      createConversation();
      setTimeout(() => {
        sendMessage(text, []);
      }, 50);
      return;
    }
    sendMessage(text, []);
  }, [activeConversationId, createConversation, sendMessage]);

  const showWelcome = !activeConversation || messages.length === 0;

  return (
    <main className={styles.chatArea}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Toggle sidebar" id="menu-toggle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h2 className={styles.topTitle}>
          {activeConversation?.title || 'New Chat'}
        </h2>
        <div className={styles.topSpacer} />

        <div className={styles.toggleContainer}>
          <span className={styles.toggleLabel}>Thinking Mode</span>
          <button
            className={`${styles.toggleSwitch} ${thinkingMode ? styles.active : ''}`}
            onClick={toggleThinkingMode}
            title={thinkingMode ? "Agent Mode (Slower, but more detailed)" : "Fast Mode (Direct RAG)"}
            id="thinking-mode-toggle"
          >
            <div className={styles.toggleKnob} />
          </button>
        </div>
      </header>

      {/* Messages or Welcome */}
      <div className={styles.messagesContainer} ref={scrollContainerRef}>
        {showWelcome ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className={styles.messagesList}>
            {messages.map((msg, index) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={index === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isStreaming={isStreaming}
        onStop={stopStreaming}
      />
    </main>
  );
}
