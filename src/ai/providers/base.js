/**
 * Base provider class that defines the interface for all AI providers.
 */
export class BaseAIProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.defaultModel = config.defaultModel;
    this.models = config.models;
  }

  /**
   * Send a chat completion request
   * @param {Object} options
   * @param {Array} options.messages - Array of {role, content} objects
   * @param {string} [options.model] - Model to use
   * @param {number} [options.temperature] - Sampling temperature
   * @param {number} [options.maxTokens] - Maximum tokens in response
   * @param {Object} [options.responseFormat] - JSON mode configuration
   * @returns {Promise<{content: string, usage: Object, model: string}>}
   */
  async chat(options) {
    throw new Error('chat() must be implemented by subclass');
  }

  /**
   * Generate structured JSON response
   * @param {Object} options - Same as chat()
   * @returns {Promise<{data: Object, usage: Object, model: string}>}
   */
  async generateJSON(options) {
    throw new Error('generateJSON() must be implemented by subclass');
  }

  /**
   * Get the model name based on tier
   * @param {string} tier - 'fast', 'standard', or 'advanced'
   * @returns {string}
   */
  getModel(tier = 'standard') {
    return this.models[tier] || this.defaultModel;
  }
}
