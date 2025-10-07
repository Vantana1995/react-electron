/**
 * AddTelegramBotModal Component
 * Modal for configuring Telegram bot integration for a profile
 */

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { AddTelegramBotModalProps, TelegramBotConfig } from "../../types";
import "./TelegramModal.css";

export const AddTelegramBotModal: React.FC<AddTelegramBotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  profile,
  existingConfig,
}) => {
  const [httpApi, setHttpApi] = useState("");
  const [chatId, setChatId] = useState("");
  const [botName, setBotName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"instructions" | "connect" | "test">(
    "instructions"
  );
  const [connectionTested, setConnectionTested] = useState(false);

  // Load existing config if editing
  useEffect(() => {
    if (existingConfig) {
      setHttpApi(existingConfig.httpApi);
      setChatId(existingConfig.chatId);
      setBotName(existingConfig.botName || "");
      setConnectionTested(true);
      setStep("test");
    }
  }, [existingConfig]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setHttpApi("");
        setChatId("");
        setBotName("");
        setError("");
        setStep("instructions");
        setConnectionTested(false);
      }, 300);
    }
  }, [isOpen]);

  /**
   * Test the bot connection
   */
  const handleTestConnection = async () => {
    setError("");
    setLoading(true);

    try {
      if (!window.electronAPI?.testTelegramConnection) {
        throw new Error("Telegram API not available");
      }

      const result = await window.electronAPI.testTelegramConnection(httpApi);

      if (!result.success) {
        setError(result.error || "Connection test failed");
        setLoading(false);
        return;
      }

      // Update state with bot info
      if (result.botName) {
        setBotName(result.botName);
      }

      // If chat ID was found, use it
      if (result.chatId) {
        setChatId(result.chatId);
        setConnectionTested(true);
        setStep("test");
      } else {
        // Ask user to send a message first
        setError(
          "Bot connected! Please send a message to your bot (e.g., /start), then click 'Get Chat ID' below."
        );
        setStep("connect");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get chat ID from bot
   */
  const handleGetChatId = async () => {
    setError("");
    setLoading(true);

    try {
      if (!window.electronAPI?.getTelegramChatId) {
        throw new Error("Telegram API not available");
      }

      const result = await window.electronAPI.getTelegramChatId(httpApi);

      if (!result.success) {
        setError(result.error || "Failed to get chat ID");
        setLoading(false);
        return;
      }

      if (result.chatId) {
        setChatId(result.chatId);
        setConnectionTested(true);
        setStep("test");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send a test message
   */
  const handleSendTestMessage = async () => {
    setError("");
    setLoading(true);

    try {
      if (!window.electronAPI?.sendTelegramMessage) {
        throw new Error("Telegram API not available");
      }

      const testMessage = `🤖 Test message from Twitter Automation Platform\nProfile: ${
        profile.name
      }\nTime: ${new Date().toLocaleString()}`;

      const result = await window.electronAPI.sendTelegramMessage(
        httpApi,
        chatId,
        testMessage
      );

      if (!result.success) {
        setError(result.error || "Failed to send test message");
      } else {
        alert("✅ Test message sent successfully! Check your Telegram.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save the configuration
   */
  const handleSave = () => {
    if (!httpApi || !chatId) {
      setError("Please complete the connection test first");
      return;
    }

    const config: TelegramBotConfig = {
      httpApi,
      chatId,
      botName,
      connected: true,
      connectedAt: Date.now(),
    };

    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="telegram-modal-overlay">
      <div className="telegram-modal">
        <div className="telegram-modal-header">
          <h3>🤖 Add Telegram Bot</h3>
          <button className="telegram-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="telegram-modal-content">
          {/* Step 1: Instructions */}
          {step === "instructions" && (
            <div className="telegram-step">
              <h4>How to Create a Telegram Bot</h4>
              <div className="telegram-instructions">
                <ol>
                  <li>
                    <strong>Open Telegram</strong> and search for{" "}
                    <code>@BotFather</code>
                  </li>
                  <li>
                    Send the command <code>/newbot</code> to BotFather
                  </li>
                  <li>Follow the instructions to choose a name for your bot</li>
                  <li>
                    Choose a username for your bot (must end with 'bot', e.g.,
                    'mybot' or 'my_bot')
                  </li>
                  <li>
                    <strong>BotFather will send you an HTTP API token</strong>
                    <br />
                    It looks like: <code>bot123456:ABC-DEF1234ghIkl...</code>
                  </li>
                  <li>Copy this token and paste it below</li>
                </ol>

                <div className="telegram-note">
                  <strong>Tip:</strong> You can also use an existing bot. Just
                  send <code>/mybots</code> to @BotFather and select your bot to
                  get the token.
                </div>
              </div>

              <div className="telegram-input-group">
                <label htmlFor="httpApi">Bot HTTP API Token</label>
                <input
                  id="httpApi"
                  type="text"
                  placeholder="bot123456:ABC-DEF1234ghIkl..."
                  value={httpApi}
                  onChange={(e) => setHttpApi(e.target.value)}
                  className="telegram-input"
                />
                <small>Format: bot[numbers]:[alphanumeric characters]</small>
              </div>

              {error && <div className="telegram-error">{error}</div>}

              <div className="telegram-modal-actions">
                <button
                  className="telegram-btn telegram-btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="telegram-btn telegram-btn-primary"
                  onClick={handleTestConnection}
                  disabled={!httpApi || loading}
                >
                  {loading ? "Testing..." : "Test Connection →"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Connect & Get Chat ID */}
          {step === "connect" && (
            <div className="telegram-step">
              <h4>Bot Connected!</h4>
              <p>
                Bot name: <strong>{botName}</strong>
              </p>

              <div className="telegram-instructions">
                <p>
                  <strong>Next step:</strong> Send a message to your bot to get
                  your Chat ID
                </p>
                <ol>
                  <li>
                    Open Telegram and find your bot (search for @
                    {botName || "your_bot"})
                  </li>
                  <li>
                    Send any message to the bot (e.g., <code>/start</code> or{" "}
                    <code>Hello</code>)
                  </li>
                  <li>Click the button below to fetch your Chat ID</li>
                </ol>
              </div>

              {error && <div className="telegram-error">{error}</div>}

              <div className="telegram-modal-actions">
                <button
                  className="telegram-btn telegram-btn-secondary"
                  onClick={() => setStep("instructions")}
                >
                  ← Back
                </button>
                <button
                  className="telegram-btn telegram-btn-primary"
                  onClick={handleGetChatId}
                  disabled={loading}
                >
                  {loading ? "Fetching..." : "Get Chat ID"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Test & Save */}
          {step === "test" && (
            <div className="telegram-step">
              <h4>🎉 Configuration Complete!</h4>

              <div className="telegram-config-summary">
                <div className="telegram-config-item">
                  <span className="telegram-config-label">Bot Name:</span>
                  <span className="telegram-config-value">
                    {botName || "Unknown"}
                  </span>
                </div>
                <div className="telegram-config-item">
                  <span className="telegram-config-label">Chat ID:</span>
                  <span className="telegram-config-value">{chatId}</span>
                </div>
                <div className="telegram-config-item">
                  <span className="telegram-config-label">Profile:</span>
                  <span className="telegram-config-value">{profile.name}</span>
                </div>
              </div>

              <div className="telegram-test-section">
                <p>
                  <strong>Send a test message</strong> to verify everything is
                  working:
                </p>
                <button
                  className="telegram-btn telegram-btn-test"
                  onClick={handleSendTestMessage}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Test Message"}
                </button>
              </div>

              {error && <div className="telegram-error">{error}</div>}

              <div className="telegram-modal-actions">
                <button
                  className="telegram-btn telegram-btn-secondary"
                  onClick={() => setStep("instructions")}
                >
                  ← Start Over
                </button>
                <button
                  className="telegram-btn telegram-btn-primary"
                  onClick={handleSave}
                  disabled={loading}
                >
                  Save Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
