import type { Schema } from '../../data/resource';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

type Handler = Schema['generateBio']['functionHandler'];

const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || 'us-east-1' });

export const handler: Handler = async (event) => {
  const { businessName, specializations = [], keywords = [], yearsExperience, providerId } = event.arguments;

  try {
    const prompt = `Generate a professional bio for a service provider with the following details:
Business Name: ${businessName}
Years of Experience: ${yearsExperience || 'Not specified'}
Specializations: ${specializations.join(', ') || 'None specified'}
Keywords to include: ${keywords.join(', ') || 'None specified'}

Create a compelling, professional bio that is 2-3 sentences long and highlights their expertise and value proposition.`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
      contentType: 'application/json',
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const bio = responseBody.content[0].text;

    return {
      bio,
      providerId,
      businessName,
      specializations,
      keywords,
      yearsExperience,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Bio generation error:', error);
    throw new Error('Failed to generate bio');
  }
};