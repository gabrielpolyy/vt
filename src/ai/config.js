export const aiConfig = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
      models: {
        fast: 'gpt-4o-mini',
        standard: 'gpt-4o',
        advanced: 'gpt-4o',
      },
    },
    xai: {
      apiKey: process.env.XAI_API_KEY,
      baseUrl: 'https://api.x.ai/v1',
      defaultModel: 'grok-2-latest',
      models: {
        fast: 'grok-2-latest',
        standard: 'grok-2-latest',
        advanced: 'grok-2-latest',
      },
    },
  },
  defaults: {
    provider: 'openai',
    temperature: 0.7,
    maxTokens: 2048,
    retries: 3,
    retryDelay: 1000,
  },
  useCases: {
    exerciseGeneration: {
      temperature: 0.8,
      maxTokens: 4096,
    },
    chat: {
      temperature: 0.9,
      maxTokens: 1024,
    },
    feedback: {
      temperature: 0.6,
      maxTokens: 512,
    },
    highwayGeneration: {
      temperature: 0.5,
      maxTokens: 2048,
    },
  },
};
