import { OpenAIProvider } from './openai.js';

/**
 * xAI uses OpenAI-compatible API format, so we extend OpenAIProvider.
 */
export class XAIProvider extends OpenAIProvider {
  name = 'xai';
}
