import { Inter } from 'next/font/google';
import './globals.css';
import { ChatProvider } from '@/lib/chatStore';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'Notion Chatbot — Ask your notes anything',
  description: 'An AI chatbot that answers questions from your Notion workspace. Search, summarize, and explore your notes with natural language.',
  keywords: ['notion', 'chatbot', 'AI', 'notes', 'knowledge base'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ChatProvider>
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
