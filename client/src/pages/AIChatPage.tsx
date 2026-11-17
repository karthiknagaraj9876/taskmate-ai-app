
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Send,
  Plus,
  User,
  Sparkles,
  LoaderCircle,
} from "lucide-react";

import { sendAIMessage } from "../services/ai.service";
import type { AIChatResponse } from "../services/ai.service";

import "../styles/ai-chat.scss";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "What does overdue status mean?",
  "How can I prioritize my tasks?",
  "How does TaskMate AI work?",
];

const AIChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [contextId, setContextId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleNewConversation = () => {
    if (loading) return;

    setMessages([]);
    setContextId(null);
    setInput("");
    setError("");

    inputRef.current?.focus();
  };

  const handleSendMessage = async (messageText?: string) => {
    const message = (messageText ?? input).trim();

    if (!message || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response: AIChatResponse = await sendAIMessage({
        message,
        contextId,
      });

      if (!response.success) {
        throw new Error("Unable to generate AI response.");
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.data.answer,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

      setContextId(response.data.contextId);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(errorMessage);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="ai-chat-page">
      <div className="ai-chat-container">

        {/* Header */}
        <div className="ai-chat-header">
          <div className="ai-chat-title">
            <div className="ai-chat-icon">
              <Sparkles size={22} />
            </div>

            <div>
              <h2>TaskMate AI Assistant</h2>
              <p>Your intelligent task management assistant</p>
            </div>
          </div>

          <button
            type="button"
            className="new-chat-button"
            onClick={handleNewConversation}
            disabled={loading}
          >
            <Plus size={17} />
            New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="ai-chat-messages">

          {messages.length === 0 && (
            <div className="ai-chat-welcome">
              <div className="welcome-icon">
                <Bot size={36} />
              </div>

              <h2>How can I help you today?</h2>

              <p>
                Ask me about your tasks, priorities, deadlines,
                overdue work and task management.
              </p>

              <div className="suggestion-list">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="suggestion-button"
                    onClick={() => handleSendMessage(suggestion)}
                    disabled={loading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.role}`}
            >
              <div className="message-avatar">
                {message.role === "assistant" ? (
                  <Bot size={19} />
                ) : (
                  <User size={19} />
                )}
              </div>

              <div className="message-content">
                <span className="message-sender">
                  {message.role === "assistant"
                    ? "TaskMate AI"
                    : "You"}
                </span>

                <div className="message-bubble">
                  {message.role === "assistant" ? (
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message assistant">
              <div className="message-avatar">
                <Bot size={19} />
              </div>

              <div className="message-content">
                <span className="message-sender">
                  TaskMate AI
                </span>

                <div className="typing-indicator">
                  <LoaderCircle
                    size={17}
                    className="loading-spinner"
                  />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="ai-chat-error">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="ai-chat-input-area">
          <div className="ai-chat-input-box">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask TaskMate AI anything..."
              rows={1}
              disabled={loading}
            />

            <button
              type="button"
              className="send-button"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              {loading ? (
                <LoaderCircle
                  size={19}
                  className="loading-spinner"
                />
              ) : (
                <Send size={19} />
              )}
            </button>
          </div>

          <p className="input-disclaimer">
            TaskMate AI can make mistakes. Verify important task
            information.
          </p>
        </div>

      </div>
    </div>
  );
};

export default AIChatPage;
