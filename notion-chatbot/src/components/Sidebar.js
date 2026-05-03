'use client';

import { useState } from 'react';
import { useChatStore } from '@/lib/chatStore';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, onClose }) {
  const {
    groupedConversations,
    activeConversationId,
    createConversation,
    deleteConversation,
    setActive,
  } = useChatStore();

  const [hoveredId, setHoveredId] = useState(null);

  const handleNewChat = () => {
    createConversation();
    onClose?.();
  };

  const handleSelect = (id) => {
    setActive(id);
    onClose?.();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  const dateGroupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" fill="url(#logoGrad)" />
              <path d="M7 8.5C7 7.67 7.67 7 8.5 7H15.5C16.33 7 17 7.67 17 8.5V15.5C17 16.33 16.33 17 15.5 17H8.5C7.67 17 7 16.33 7 15.5V8.5Z" fill="rgba(255,255,255,0.9)" />
              <path d="M10 10V14L12 12.5L14 14V10H10Z" fill="url(#logoGrad2)" />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7C5CFC" />
                  <stop offset="1" stopColor="#5CE0D8" />
                </linearGradient>
                <linearGradient id="logoGrad2" x1="10" y1="10" x2="14" y2="14" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7C5CFC" />
                  <stop offset="1" stopColor="#5CE0D8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className={styles.brandText}>Notion Chat</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* New Chat Button */}
      <div className={styles.newChatWrapper}>
        <button className={styles.newChatBtn} onClick={handleNewChat} id="new-chat-button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation History */}
      <nav className={styles.history} id="chat-history">
        {dateGroupOrder.map(group => {
          const convs = groupedConversations[group];
          if (!convs || convs.length === 0) return null;
          return (
            <div key={group} className={styles.dateGroup}>
              <h3 className={styles.dateLabel}>{group}</h3>
              <ul className={styles.chatList}>
                {convs.map(conv => (
                  <li key={conv.id} className={styles.chatListItem}>
                    <button
                      className={`${styles.chatItem} ${conv.id === activeConversationId ? styles.active : ''}`}
                      onClick={() => handleSelect(conv.id)}
                      id={`chat-item-${conv.id}`}
                    >
                      <svg className={styles.chatIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      <span className={styles.chatTitle}>{conv.title}</span>
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => handleDelete(e, conv.id)}
                      aria-label="Delete conversation"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerDivider} />
        <p className={styles.footerText}>Powered by your Notion workspace</p>
      </div>
    </aside>
  );
}
