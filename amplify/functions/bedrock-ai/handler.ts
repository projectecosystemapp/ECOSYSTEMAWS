import { APIGatewayProxyHandler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { nullableToString, nullableToNumber } from '../../../lib/type-utils';

// Initialize AWS clients
const bedrockClient = new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || 'us-east-1'
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const PROVIDER_PROFILE_TABLE = process.env.PROVIDER_PROFILE_TABLE_NAME || 'ProviderProfile';

// Claude 3.5 Sonnet model ID
const CLAUDE_MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Bedrock AI request received:', {
    httpMethod: nullableToString(event.httpMethod),
    path: nullableToString(event.path),
    hasBody: !!event.body,
  });

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, ...params } = body;

    switch (action) {
      case 'GENERATE_BIO':
        return await generateProviderBio(params, headers);
      
      case 'GENERATE_SERVICE_DESCRIPTION':
        return await generateServiceDescription(params, headers);
      
      case 'GENERATE_MARKETING_COPY':
        return await generateMarketingCopy(params, headers);
      
      case 'IMPROVE_TEXT':
        return await improveText(params, headers);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error) {
    console.error('Bedrock AI error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

async function generateProviderBio(params: any, headers: any) {
  const {
    businessName,
    specializations = [],
    yearsExperience,
    keywords = [],
    tone = 'professional',
    providerId
  } = params;

  // Construct the prompt
  const prompt = `You are a professional copywriter specializing in creating compelling business bios. 
  
Create a one-paragraph bio (150-200 words) for a service provider with the following details:
- Business Name: ${businessName}
- Specializations: ${specializations.join(', ')}
- Years of Experience: ${yearsExperience || 'Not specified'}
- Keywords to include: ${keywords.join(', ')}
- Tone: ${tone}

The bio should:
1. Highlight their expertise and unique value proposition
2. Build trust and credibility
3. Be engaging and easy to read
4. Include a subtle call-to-action at the end
5. Be written in third person

Bio:`;

  try {
    const response = await invokeClaudeModel(prompt);
    
    // Optionally save to database if providerId is provided
    if (providerId) {
      await updateProviderBio(providerId, response.text);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        bio: nullableToString(response.text),
        usage: nullableToString(response.usage),
        modelId: CLAUDE_MODEL_ID,
      }),
    };
  } catch (error) {
    console.error('Error generating bio:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate bio',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
}

async function generateServiceDescription(params: any, headers: any) {
  const {
    serviceName,
    category,
    duration,
    price,
    features = [],
    targetAudience
  } = params;

  const prompt = `Create a compelling service description (100-150 words) for:
- Service: ${serviceName}
- Category: ${category}
- Duration: ${duration}
- Price: $${price}
- Key Features: ${features.join(', ')}
- Target Audience: ${targetAudience}

The description should:
1. Clearly explain what the service includes
2. Highlight the benefits and value
3. Address the target audience's needs
4. Create urgency or desire to book
5. Be scannable with clear, concise language

Description:`;

  try {
    const response = await invokeClaudeModel(prompt);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        description: nullableToString(response.text),
        usage: nullableToString(response.usage),
      }),
    };
  } catch (error) {
    console.error('Error generating service description:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate service description',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
}

async function generateMarketingCopy(params: any, headers: any) {
  const {
    businessName,
    service,
    targetAudience,
    copyType = 'social', // social, email, landing
    callToAction
  } = params;

  const promptMap: Record<string, string> = {
    social: `Create a engaging social media post (50-100 words) for ${businessName} promoting ${service} to ${targetAudience}. Include emojis and end with: ${callToAction}`,
    email: `Write a professional email subject line and body (150-200 words) for ${businessName} promoting ${service} to ${targetAudience}. End with a clear call-to-action: ${callToAction}`,
    landing: `Create compelling landing page copy with a headline, subheadline, and 3 benefit bullet points for ${businessName}'s ${service} targeting ${targetAudience}. Include: ${callToAction}`,
  };

  const prompt = promptMap[copyType] || promptMap.social;

  try {
    const response = await invokeClaudeModel(prompt);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        copy: nullableToString(response.text),
        type: copyType,
        usage: nullableToString(response.usage),
      }),
    };
  } catch (error) {
    console.error('Error generating marketing copy:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate marketing copy',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
}

async function improveText(params: any, headers: any) {
  const {
    text,
    improvements = ['clarity', 'engagement', 'professionalism'],
    maxLength
  } = params;

  const prompt = `Improve the following text for ${improvements.join(', ')}:

Original text: "${text}"

Requirements:
- Maintain the original meaning and key information
- ${maxLength ? `Keep it under ${maxLength} characters` : 'Keep a similar length'}
- Make it more ${improvements.join(', more ')}

Improved text:`;

  try {
    const response = await invokeClaudeModel(prompt);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        original: text,
        improved: nullableToString(response.text),
        improvements: improvements,
        usage: nullableToString(response.usage),
      }),
    };
  } catch (error) {
    console.error('Error improving text:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to improve text',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
}

async function invokeClaudeModel(prompt: string): Promise<{ text: string; usage: any }> {
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    top_p: 0.9,
  };

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return {
    text: responseBody.content[0].text,
    usage: {
      inputTokens: nullableToString(responseBody.usage?.input_tokens),
      outputTokens: nullableToString(responseBody.usage?.output_tokens),
      totalTokens: nullableToString(responseBody.usage?.total_tokens),
    },
  };
}

async function updateProviderBio(providerId: string, bio: string) {
  try {
    const command = new UpdateItemCommand({
      TableName: PROVIDER_PROFILE_TABLE,
      Key: {
        id: { S: providerId },
      },
      UpdateExpression: 'SET bio = :bio, lastUpdated = :timestamp',
      ExpressionAttributeValues: {
        ':bio': { S: bio },
        ':timestamp': { S: new Date().toISOString() },
      },
    });

    await dynamoClient.send(command);
    console.log(`Updated bio for provider ${providerId}`);
  } catch (error) {
    console.error('Error updating provider bio:', error);
    // Don't throw - just log the error
  }
}