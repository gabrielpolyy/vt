export class AIError extends Error {
  constructor(message, provider) {
    super(message);
    this.name = 'AIError';
    this.provider = provider;
  }
}

export class AIConfigError extends AIError {
  constructor(message) {
    super(message);
    this.name = 'AIConfigError';
  }
}

export class AIRequestError extends AIError {
  constructor(message, status, provider) {
    super(message, provider);
    this.name = 'AIRequestError';
    this.status = status;
  }
}

export class AIRateLimitError extends AIError {
  constructor(message, provider) {
    super(message, provider);
    this.name = 'AIRateLimitError';
  }
}

export class AIAuthError extends AIError {
  constructor(message, provider) {
    super(message, provider);
    this.name = 'AIAuthError';
  }
}

export class AIResponseError extends AIError {
  constructor(message, provider) {
    super(message, provider);
    this.name = 'AIResponseError';
  }
}
