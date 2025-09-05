import type { Schema } from '../../data/resource';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

type CreateServiceRequestHandler = Schema['createServiceRequest']['functionHandler'];
type FindMatchingRequestsHandler = Schema['findMatchingRequests']['functionHandler'];

type Handler = CreateServiceRequestHandler | FindMatchingRequestsHandler;

const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Generate embedding for text using Bedrock
async function generateEmbedding(text: string): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v1',
    body: JSON.stringify({
      inputText: text,
    }),
    contentType: 'application/json',
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.embedding;
}

// Calculate cosine similarity between two embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export const handler: Handler = async (event: any) => {
  const { fieldName, arguments: args } = event;

  try {
    if (fieldName === 'createServiceRequest') {
      const { title, description, category, budget, desiredDate, location } = args;
      
      // Generate embedding for the request
      const requestText = `${title} ${description} ${category}`;
      const embedding = await generateEmbedding(requestText);
      
      // Create the service request
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const serviceRequest = {
        id: requestId,
        customerId: event.identity?.sub || 'anonymous',
        customerEmail: event.identity?.claims?.email || '',
        title,
        description,
        category,
        budget,
        desiredDate: desiredDate ? new Date(desiredDate).toISOString() : null,
        location,
        status: 'ACTIVE',
        embedding,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dynamodb.send(new PutCommand({
        TableName: nullableToString(process.env.SERVICEREQUEST_TABLE_NAME),
        Item: serviceRequest,
      }));

      return {
        success: true,
        requestId,
        message: 'Service request created successfully',
      };
    }

    if (fieldName === 'findMatchingRequests') {
      const { providerId, category, maxResults = 10 } = args;
      
      // Get provider's services to understand their capabilities
      const providerServices = await dynamodb.send(new QueryCommand({
        TableName: nullableToString(process.env.SERVICE_TABLE_NAME),
        IndexName: 'byProviderId',
        KeyConditionExpression: 'providerId = :providerId',
        ExpressionAttributeValues: {
          ':providerId': providerId,
        },
      }));

      if (!providerServices.Items?.length) {
        return { matches: [], message: 'No provider services found' };
      }

      // Generate embedding for provider capabilities
      const providerText = providerServices.Items
        .map(service => `${service.title} ${service.description} ${service.category}`)
        .join(' ');
      const providerEmbedding = await generateEmbedding(providerText);

      // Get active service requests
      const scanParams: any = {
        TableName: nullableToString(process.env.SERVICEREQUEST_TABLE_NAME),
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'ACTIVE',
        },
      };

      if (category) {
        scanParams.FilterExpression += ' AND category = :category';
        scanParams.ExpressionAttributeValues[':category'] = category;
      }

      const requests = await dynamodb.send(new ScanCommand(scanParams));

      // Calculate similarity scores and rank matches
      const matches = requests.Items
        ?.filter(request => request.embedding && request.customerId !== providerId)
        .map(request => ({
          ...request,
          similarity: cosineSimilarity(providerEmbedding, request.embedding),
        }))
        .filter(request => request.similarity > 0.3) // Minimum similarity threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults) || [];

      return {
        matches,
        total: nullableToString(matches.length),
        message: `Found ${matches.length} matching requests`,
      };
    }

    throw new Error(`Unknown field: ${fieldName}`);
  } catch (error) {
    console.error('ISO Matcher error:', error);
    throw new Error('Failed to process request');
  }
};