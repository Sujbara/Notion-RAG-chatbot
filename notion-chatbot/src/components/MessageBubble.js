'use client';

import { useMemo } from 'react';
import styles from './MessageBubble.module.css';

function parseMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="${styles.codeBlock}"><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, `<code class="${styles.inlineCode}">$1</code>`);

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Headings
  html = html.replace(/^### (.+)$/gm, `<h3 class="${styles.heading}">$1</h3>`);
  html = html.replace(/^## (.+)$/gm, `<h2 class="${styles.heading}">$1</h2>`);
  html = html.replace(/^# (.+)$/gm, `<h1 class="${styles.heading}">$1</h1>`);

  // Horizontal rule
  html = html.replace(/^---$/gm, `<hr class="${styles.hr}" />`);

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, `<blockquote class="${styles.blockquote}">$1</blockquote>`);

  // Tables
  html = html.replace(/(?:^\|.+\|$\n?)+/gm, (match) => {
    const rows = match.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return match;

    const headerCells = rows[0].split('|').filter(c => c.trim());
    // Check if second row is separator
    const isSeparator = /^\|[\s-:|]+\|$/.test(rows[1]);
    const dataStartIdx = isSeparator ? 2 : 1;

    let table = `<div class="${styles.tableWrapper}"><table class="${styles.table}"><thead><tr>`;
    headerCells.forEach(cell => {
      table += `<th>${cell.trim()}</th>`;
    });
    table += '</tr></thead><tbody>';

    for (let i = dataStartIdx; i < rows.length; i++) {
      const cells = rows[i].split('|').filter(c => c.trim());
      table += '<tr>';
      cells.forEach(cell => {
        table += `<td>${cell.trim()}</td>`;
      });
      table += '</tr>';
    }

    table += '</tbody></table></div>';
    return table;
  });

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, `<li class="${styles.listItem}">$1</li>`);
  html = html.replace(/((?:<li class="[^"]*">[^<]*<\/li>\n?)+)/g, `<ul class="${styles.list}">$1</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, `<li class="${styles.listItem}">$1</li>`);

  // Paragraphs - wrap remaining text
  html = html.replace(/^(?!<[a-z]|<\/[a-z])(.+)$/gm, (match) => {
    if (match.trim() === '') return '';
    return `<p>${match}</p>`;
  });

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function MessageBubble({ message, isLast }) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming && message.content === '';

  const renderedContent = useMemo(() => {
    if (isUser) return message.content;
    return parseMarkdown(message.content);
  }, [message.content, isUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div
      className={`${styles.bubble} ${isUser ? styles.user : styles.assistant} ${isLast ? styles.latest : ''}`}
      id={`message-${message.id}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className={styles.avatar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="url(#msgLogoGrad)" />
            <path d="M7 8.5C7 7.67 7.67 7 8.5 7H15.5C16.33 7 17 7.67 17 8.5V15.5C17 16.33 16.33 17 15.5 17H8.5C7.67 17 7 16.33 7 15.5V8.5Z" fill="rgba(255,255,255,0.9)" />
            <path d="M10 10V14L12 12.5L14 14V10H10Z" fill="url(#msgLogoGrad2)" />
            <defs>
              <linearGradient id="msgLogoGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C5CFC" />
                <stop offset="1" stopColor="#5CE0D8" />
              </linearGradient>
              <linearGradient id="msgLogoGrad2" x1="10" y1="10" x2="14" y2="14" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C5CFC" />
                <stop offset="1" stopColor="#5CE0D8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      <div className={styles.content}>
        {/* Attachments */}
        {message.attachments?.length > 0 && (
          <div className={styles.attachments}>
            {message.attachments.map((att, i) => (
              <div key={i} className={styles.attachment}>
                {att.type?.startsWith('image/') ? (
                  <div className={styles.imagePreview}>
                    <img src={att.url} alt={att.name} />
                  </div>
                ) : (
                  <div className={styles.fileChip}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span>{att.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message text */}
        {isStreaming ? (
          <div className={styles.typingIndicator}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        ) : isUser ? (
          <p className={styles.userText}>{message.content}</p>
        ) : (
          <div
            className={styles.markdown}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        )}

        {/* Actions (copy) */}
        {!isUser && !isStreaming && message.content && (
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={handleCopy} title="Copy to clipboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
