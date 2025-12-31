import { BaseAIProvider } from './base.js';
import { AIRequestError, AIRateLimitError, AIAuthError } from '../errors.js';

export class OpenAIProvider extends BaseAIProvider {
  name = 'openai';

  async chat({ messages, model, temperature = 0.7, maxTokens = 2048, responseFormat }) {
    const response = await this._request('/chat/completions', {
      model: model || this.defaultModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(responseFormat && { response_format: responseFormat }),
    });

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model,
    };
  }

  async generateJSON({ messages, model, temperature, maxTokens }) {
    const response = await this.chat({
      messages,
      model,
      temperature,
      maxTokens,
      responseFormat: { type: 'json_object' },
    });

    const data = JSON.parse(response.content);
    return {
      data,
      usage: response.usage,
      model: response.model,
    };
  }

  async _request(endpoint, body) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await this._handleError(response);
    }

    return response.json();
  }

  async _handleError(response) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error?.message || response.statusText;

    if (response.status === 401) {
      throw new AIAuthError('Invalid API key', this.name);
    }
    if (response.status === 429) {
      throw new AIRateLimitError(message, this.name);
    }
    throw new AIRequestError(message, response.status, this.name);
  }
}
