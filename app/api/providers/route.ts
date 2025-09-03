import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { client } from '@/lib/amplify-client';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

const CreateProviderSchema = z.object({
  name: z.string(),
  slug: z.string(),
  email: z.string().email(),
  description: z.string().optional(),
  category: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateProviderSchema.parse(body);
    
    const providerId = crypto.randomUUID();

    // Create provider record in DynamoDB
    await client.models.EcosystemMarketplace.create({
      pk: `PROVIDER#${providerId}`,
      sk: 'METADATA',
      entityType: 'Provider',
      gsi1pk: nullableToString(data.slug),
      gsi1sk: 'PROVIDER',
      gsi2pk: 'PROVIDER',
      gsi2sk: 'draft',
      name: nullableToString(data.name),
      slug: nullableToString(data.slug),
      email: nullableToString(data.email),
      description: nullableToString(data.description),
      category: nullableToString(data.category),
      status: 'draft',
      role: 'provider',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ providerId, status: 'created' });
  } catch (error) {
    console.error('Provider creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    // Query providers from DynamoDB
    const response = await client.models.EcosystemMarketplace.list({
      filter: {
        and: [
          { entityType: { eq: 'Provider' } },
          ...(status ? [{ status: { eq: status } }] : []),
          ...(category ? [{ category: { eq: category } }] : []),
        ],
      },
    });

    return NextResponse.json({ providers: response.data });
  } catch (error) {
    console.error('Provider list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}