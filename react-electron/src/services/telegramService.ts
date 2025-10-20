/**
 * Telegram Bot Service
 * Handles Telegram Bot API communication for sending messages and managing bot connections
 */

import {
  TelegramGetUpdatesResponse,
  TelegramSendMessageResponse,
} from "../types";

/**
 * Base URL for Telegram Bot API
 */
const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Validates the format of a Telegram Bot HTTP API token
 * Expected format: bot{numbers}:{alphanumeric}
 *
 * @param httpApi - The HTTP API token to validate
 * @returns True if the token format is valid
 */
export function validateBotToken(httpApi: string): boolean {
  if (!httpApi || typeof httpApi !== "string") {
    return false;
  }

  // Telegram bot tokens have format: bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
  const tokenPattern = /^bot\d+:[A-Za-z0-9_-]+$/;
  return tokenPattern.test(httpApi.trim());
}

/**
 * Tests connection to Telegram bot by calling getUpdates
 * This verifies the bot token is valid and can communicate with Telegram API
 *
 * @param httpApi - The bot HTTP API token
 * @returns Promise resolving to connection test result
 */
export async function testConnection(
  httpApi: string
): Promise<{ success: boolean; error?: string; data?: TelegramGetUpdatesResponse }> {
  try {
    // Validate token format first
    if (!validateBotToken(httpApi)) {
      return {
        success: false,
        error: "Invalid bot token format. Expected format: bot123456:ABC-DEF...",
      };
    }

    const url = `${TELEGRAM_API_BASE}/${httpApi}/getUpdates`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const data: TelegramGetUpdatesResponse = await response.json();

    if (!data.ok) {
      return {
        success: false,
        error: "Telegram API returned ok: false",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Extracts chat ID from Telegram getUpdates response
 * Returns the first available chat ID from recent messages
 *
 * @param httpApi - The bot HTTP API token
 * @returns Promise resolving to chat ID or error
 */
export async function getChatId(
  httpApi: string
): Promise<{ success: boolean; chatId?: string; error?: string }> {
  try {
    const testResult = await testConnection(httpApi);

    if (!testResult.success || !testResult.data) {
      return {
        success: false,
        error: testResult.error || "Failed to connect to bot",
      };
    }

    const { result } = testResult.data;

    // Check if there are any messages
    if (!result || result.length === 0) {
      return {
        success: false,
        error:
          "No messages found. Please send a message to your bot first (e.g., /start)",
      };
    }

    // Get the first message's chat ID
    const firstMessage = result[0];
    if (!firstMessage.message || !firstMessage.message.chat) {
      return {
        success: false,
        error: "Invalid message format in response",
      };
    }

    const chatId = firstMessage.message.chat.id.toString();

    return {
      success: true,
      chatId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Sends a message to a Telegram chat
 *
 * @param httpApi - The bot HTTP API token
 * @param chatId - The chat ID to send the message to
 * @param text - The message text to send
 * @returns Promise resolving to send result
 */
export async function sendMessage(
  httpApi: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; error?: string; data?: TelegramSendMessageResponse }> {
  try {
    // Validate inputs
    if (!validateBotToken(httpApi)) {
      return {
        success: false,
        error: "Invalid bot token format",
      };
    }

    if (!chatId || chatId.trim() === "") {
      return {
        success: false,
        error: "Chat ID is required",
      };
    }

    if (!text || text.trim() === "") {
      return {
        success: false,
        error: "Message text is required",
      };
    }

    const url = `${TELEGRAM_API_BASE}/${httpApi}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.trim(),
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const data: TelegramSendMessageResponse = await response.json();

    if (!data.ok) {
      return {
        success: false,
        error: data.description || "Failed to send message",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
