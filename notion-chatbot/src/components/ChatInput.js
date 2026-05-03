'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './ChatInput.module.css';

export default function ChatInput({ onSend, isStreaming, onStop }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 160; // ~6 lines
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
  }, [text]);

  const handleSubmit = useCallback(() => {
    if ((!text.trim() && attachments.length === 0) || isStreaming) return;
    onSend(text, attachments);
    setText('');
    setAttachments([]);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, attachments, isStreaming, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      file,
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => {
      const updated = [...prev];
      if (updated[index].url) URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  };

  const canSend = (text.trim() || attachments.length > 0) && !isStreaming;

  return (
    <div className={styles.inputWrapper}>
      <div className={styles.inputContainer}>
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className={styles.attachmentBar}>
            {attachments.map((att, i) => (
              <div key={i} className={styles.attachmentChip}>
                {att.type?.startsWith('image/') ? (
                  <img src={att.url} alt={att.name} className={styles.attachThumb} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
                <span className={styles.attachName}>{att.name}</span>
                <button
                  className={styles.attachRemove}
                  onClick={() => removeAttachment(i)}
                  aria-label={`Remove ${att.name}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className={styles.inputRow}>
          {/* File upload */}
          <button
            className={styles.toolBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            id="attach-file-button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className={styles.fileInput}
            aria-label="Upload file"
          />

          {/* Image upload */}
          <button
            className={styles.toolBtn}
            onClick={() => imageInputRef.current?.click()}
            title="Attach image"
            id="attach-image-button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className={styles.fileInput}
            aria-label="Upload image"
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your Notion notes..."
            rows={1}
            id="chat-input"
          />

          {/* Send / Stop button */}
          {isStreaming ? (
            <button className={styles.stopBtn} onClick={onStop} title="Stop generating" id="stop-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              className={`${styles.sendBtn} ${canSend ? styles.sendActive : ''}`}
              onClick={handleSubmit}
              disabled={!canSend}
              title="Send message"
              id="send-button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className={styles.disclaimer}>
        Notion Chatbot can make mistakes. Verify important information.
      </p>
    </div>
  );
}
