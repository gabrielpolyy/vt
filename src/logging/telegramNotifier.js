const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Telegram limits
const MAX_MESSAGE_LENGTH = 3900; // Leave buffer under 4096 limit

// Simple debounce: track last sent messages to avoid spam
const recentMessages = new Map();
const DEBOUNCE_MS = 5000; // Don't send same message within 5 seconds

function truncateMessage(message) {
  if (message.length <= MAX_MESSAGE_LENGTH) {
    return message;
  }
  return message.slice(0, MAX_MESSAGE_LENGTH - 3) + '...';
}

function isConfigured() {
  return TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID;
}

function getMessageKey(message) {
  // Create a simple hash for deduplication
  return message.slice(0, 100);
}

function shouldSend(message) {
  const key = getMessageKey(message);
  const lastSent = recentMessages.get(key);
  const now = Date.now();

  if (lastSent && now - lastSent < DEBOUNCE_MS) {
    return false;
  }

  recentMessages.set(key, now);

  // Clean old entries periodically
  if (recentMessages.size > 100) {
    for (const [k, v] of recentMessages) {
      if (now - v > DEBOUNCE_MS * 2) {
        recentMessages.delete(k);
      }
    }
  }

  return true;
}

export async function sendTelegramAlert(message) {
  if (!isConfigured()) {
    return false;
  }

  if (!shouldSend(message)) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: truncateMessage(message),
      }),
    });

    if (!response.ok) {
      console.error('Telegram API error:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to send Telegram alert:', err.message);
    return false;
  }
}

export function formatServerError({ method, url, status, ip, error }) {
  const errorMsg = error?.message || error || 'Unknown error';
  return `🚨 Server Error
━━━━━━━━━━━━━━━
• ${status} ${method} ${url}
• IP: ${ip || 'unknown'}
• Error: ${errorMsg}`;
}

export function formatMobileError({ screen, device, osVersion, appVersion, message, stackTrace }) {
  let msg = `📱 Mobile Error
━━━━━━━━━━━━━━━
• Screen: ${screen || 'unknown'}
• Device: ${device || 'unknown'} (${osVersion || 'unknown'})
• App: v${appVersion || 'unknown'}
• Error: ${message || 'Unknown error'}`;

  if (stackTrace) {
    msg += `\n• Stack: ${stackTrace}`;
  }

  return msg;
}

export function formatAccountDeletion({ userId, hadAppleAccount, appleRevoked }) {
  let msg = `🗑️ Account Deleted
━━━━━━━━━━━━━━━
• User ID: ${userId || 'unknown'}
• Apple Sign-in: ${hadAppleAccount ? 'Yes' : 'No'}`;

  if (hadAppleAccount) {
    msg += `\n• Apple token revoked: ${appleRevoked ? 'Yes' : 'No'}`;
  }

  return msg;
}
