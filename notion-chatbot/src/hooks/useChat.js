'use client';

import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '@/lib/chatStore';

export function useChat() {
  const {
    activeConversation,
    activeConversationId,
    addMessage,
    updateLastAssistantMessage,
    createConversation,
    thinkingMode,
  } = useChatStore();

  const [isStreaming, setIsStreaming] = useState(false);
  const socketRef = useRef(null);

  const getSocket = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        resolve(socketRef.current);
        return;
      }

      // Close old socket if it's in a weird state
      if (socketRef.current) socketRef.current.close();

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/chat';
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        socketRef.current = socket;
        resolve(socket);
      };
      
      socket.onerror = (err) => {
        console.error("WebSocket connection error:", err);
        reject(new Error("Could not connect to backend server."));
      };

      // Set a connection timeout
      setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
          reject(new Error("Connection timed out."));
        }
      }, 5000);
    });
  }, []);

  const messages = activeConversation?.messages || [];

  const sendMessage = useCallback(async (content, attachments = []) => {
    if (!content.trim() && attachments.length === 0) return;
    if (isStreaming) return;

    let convId = activeConversationId;
    if (!convId) return;

    // Add user message
    const userMessage = {
      role: 'user',
      content: content.trim(),
      attachments: attachments.map(a => ({
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url,
      })),
    };
    addMessage(convId, userMessage);

    // Add placeholder assistant message
    const assistantPlaceholder = {
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    addMessage(convId, assistantPlaceholder);

    setIsStreaming(true);

    try {
      const socket = await getSocket();
      
      let accumulated = '';
      
      // Update message handler for this specific request
      socket.onmessage = (event) => {
        const chunk = event.data;
        
        if (chunk === "[DONE]") {
          setIsStreaming(false);
          return;
        }

        if (chunk.startsWith("Error:")) {
          setIsStreaming(false);
          updateLastAssistantMessage(convId, chunk);
          return;
        }

        accumulated += chunk;
        updateLastAssistantMessage(convId, accumulated);
      };

      socket.onclose = () => {
        setIsStreaming(false);
      };

      socket.send(JSON.stringify({
        message: content.trim(),
        thinking_mode: thinkingMode
      }));

    } catch (error) {
      console.error('Chat error:', error);
      updateLastAssistantMessage(
        convId,
        `Error: ${error.message || 'Connection failed. Is the backend running?'}`
      );
      setIsStreaming(false);
    }
  }, [activeConversationId, isStreaming, messages, addMessage, updateLastAssistantMessage, thinkingMode, getSocket]);

  const stopStreaming = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
  };
}
