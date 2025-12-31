import { aiConfig } from './config.js';
import { OpenAIProvider } from './providers/openai.js';
import { XAIProvider } from './providers/xai.js';
import { AIConfigError } from './errors.js';

const providers = {
  openai: OpenAIProvider,
  xai: XAIProvider,
};

const providerInstances = {};

/**
 * Get or create a provider instance
 * @param {string} providerName - 'openai' or 'xai'
 * @returns {BaseAIProvider}
 */
export function getProvider(providerName = aiConfig.defaults.provider) {
  if (!providers[providerName]) {
    throw new AIConfigError(`Unknown provider: ${providerName}`);
  }

  if (!providerInstances[providerName]) {
    const config = aiConfig.providers[providerName];
    if (!config.apiKey) {
      throw new AIConfigError(`API key not configured for provider: ${providerName}`);
    }
    const ProviderClass = providers[providerName];
    providerInstances[providerName] = new ProviderClass(config);
  }

  return providerInstances[providerName];
}

/**
 * Execute an AI request with retry logic
 * @param {Function} requestFn - Async function that makes the request
 * @param {Object} options
 * @param {number} [options.retries] - Number of retries
 * @param {number} [options.retryDelay] - Delay between retries in ms
 * @returns {Promise<any>}
 */
export async function withRetry(requestFn, options = {}) {
  const { retries = aiConfig.defaults.retries, retryDelay = aiConfig.defaults.retryDelay } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Don't retry auth errors
      if (error.name === 'AIAuthError') {
        throw error;
      }

      // Retry on rate limit with exponential backoff
      if (error.name === 'AIRateLimitError' && attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Retry on server errors (5xx)
      if (error.status >= 500 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Unified AI client interface
 */
export const aiClient = {
  /**
   * Send a chat completion request
   * @param {Object} options
   * @param {string} [options.provider] - 'openai' or 'xai'
   * @param {Array} options.messages - Conversation messages
   * @param {string} [options.model] - Model override
   * @param {string} [options.modelTier] - 'fast', 'standard', 'advanced'
   * @param {number} [options.temperature]
   * @param {number} [options.maxTokens]
   * @returns {Promise<{content: string, usage: Object, model: string, provider: string}>}
   */
  async chat(options) {
    const provider = getProvider(options.provider);
    const model = options.model || provider.getModel(options.modelTier);

    const result = await withRetry(() =>
      provider.chat({
        messages: options.messages,
        model,
        temperature: options.temperature ?? aiConfig.defaults.temperature,
        maxTokens: options.maxTokens ?? aiConfig.defaults.maxTokens,
      })
    );

    return { ...result, provider: provider.name };
  },

  /**
   * Generate structured JSON
   * @param {Object} options - Same as chat()
   * @returns {Promise<{data: Object, usage: Object, model: string, provider: string}>}
   */
  async generateJSON(options) {
    const provider = getProvider(options.provider);
    const model = options.model || provider.getModel(options.modelTier);

    const result = await withRetry(() =>
      provider.generateJSON({
        messages: options.messages,
        model,
        temperature: options.temperature ?? aiConfig.defaults.temperature,
        maxTokens: options.maxTokens ?? aiConfig.defaults.maxTokens,
      })
    );

    return { ...result, provider: provider.name };
  },
};
