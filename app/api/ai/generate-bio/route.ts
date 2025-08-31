import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify-server-utils';

// Get the Lambda function URL from environment
const BEDROCK_LAMBDA_URL = process.env.BEDROCK_AI_LAMBDA_URL || process.env.NEXT_PUBLIC_BEDROCK_AI_LAMBDA_URL;

export async function POST(request: NextRequest) {
  try {
    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        // Verify user is authenticated
        const user = await getCurrentUser(contextSpec);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { 
          businessName,
          specializations = [],
          yearsExperience,
          keywords = [],
          tone = 'professional',
          providerId
        } = body;

        // Validate required fields
        if (!businessName) {
          return NextResponse.json(
            { error: 'Business name is required' },
            { status: 400 }
          );
        }

        // If Lambda URL is not configured, use a fallback response
        if (!BEDROCK_LAMBDA_URL) {
          console.warn('Bedrock Lambda URL not configured, using fallback bio generation');
          return generateFallbackBio(body);
        }

        // Call the Bedrock Lambda function
        const lambdaResponse = await fetch(BEDROCK_LAMBDA_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.AWS_API_KEY || '',
          },
          body: JSON.stringify({
            action: 'GENERATE_BIO',
            businessName,
            specializations,
            yearsExperience,
            keywords,
            tone,
            providerId: providerId || user.userId,
          }),
        });

        if (!lambdaResponse.ok) {
          const errorText = await lambdaResponse.text();
          console.error('Lambda error:', errorText);
          
          // Fallback to template-based generation if Lambda fails
          return generateFallbackBio(body);
        }

        const result = await lambdaResponse.json();
        return NextResponse.json(result);
      },
    });
  } catch (error) {
    console.error('Generate bio error:', error);
    
    // Return a fallback bio on any error
    const body = await request.json();
    return generateFallbackBio(body);
  }
}

// Fallback bio generation using templates
function generateFallbackBio(params: any) {
  const {
    businessName,
    specializations = [],
    yearsExperience,
    keywords = [],
  } = params;

  const experienceText = yearsExperience 
    ? `With ${yearsExperience} years of experience, ` 
    : '';
  
  const specializationText = specializations.length > 0
    ? `specializing in ${specializations.slice(0, 3).join(', ')}`
    : 'offering professional services';

  const keywordText = keywords.length > 0
    ? ` Our expertise includes ${keywords.slice(0, 3).join(', ')}.`
    : '';

  const bio = `${businessName} is a distinguished service provider ${specializationText}. ${experienceText}we are committed to delivering exceptional value and outstanding results to every client. Our approach combines industry best practices with innovative solutions tailored to meet your specific needs.${keywordText} We pride ourselves on our attention to detail, reliability, and dedication to customer satisfaction. Whether you're looking for quality, expertise, or dependable service, ${businessName} is your trusted partner for success. Contact us today to discover how we can help you achieve your goals.`;

  return NextResponse.json({
    bio,
    generated: true,
    fallback: true,
    message: 'Bio generated using template (AI service temporarily unavailable)',
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}