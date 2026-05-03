'use client';

import styles from './WelcomeScreen.module.css';

const suggestions = [
  { icon: '📝', text: 'Summarize my latest meeting notes' },
  { icon: '✅', text: 'What are my pending tasks?' },
  { icon: '🔍', text: 'Find notes about project planning' },
  { icon: '📅', text: 'What did I write last week?' },
];

export default function WelcomeScreen({ onSuggestionClick }) {
  return (
    <div className={styles.welcome}>
      <div className={styles.hero}>
        {/* Animated gradient orb */}
        <div className={styles.orbContainer}>
          <div className={styles.orb} />
          <div className={styles.orbInner} />
        </div>

        <h1 className={styles.title}>
          Ask your <span className={styles.gradient}>Notion notes</span> anything
        </h1>
        <p className={styles.subtitle}>
          I can search, summarize, and answer questions from your Notion workspace.
        </p>
      </div>

      <div className={styles.suggestions}>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            className={styles.suggestionCard}
            onClick={() => onSuggestionClick(suggestion.text)}
            style={{ animationDelay: `${index * 80}ms` }}
            id={`suggestion-${index}`}
          >
            <span className={styles.suggestionIcon}>{suggestion.icon}</span>
            <span className={styles.suggestionText}>{suggestion.text}</span>
            <svg className={styles.arrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
