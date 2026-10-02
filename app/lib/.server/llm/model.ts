import { createAnthropic } from '@ai-sdk/anthropic';

// confirmed through the authenticated Models API; keep DTE separate from the classic Bolt default
export const DTE_MODEL_ID = 'claude-sonnet-4-6';

export function getAnthropicModel(apiKey: string, modelId: string = 'claude-3-5-sonnet-20240620') {
  const anthropic = createAnthropic({
    apiKey,
  });

  return anthropic(modelId);
}
