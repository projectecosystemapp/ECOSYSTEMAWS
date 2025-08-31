import { DynamoDBStreamHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({});

export const handler: DynamoDBStreamHandler = async (event) => {
  console.log('Profile Events Handler triggered');
  console.log('Event records:', JSON.stringify(event.Records, null, 2));

  for (const record of event.Records) {
    try {
      const eventName = record.eventName;
      
      if (!eventName) continue;

      // Extract the new and old images
      const newImage = record.dynamodb?.NewImage ? unmarshall(record.dynamodb.NewImage as any) : null;
      const oldImage = record.dynamodb?.OldImage ? unmarshall(record.dynamodb.OldImage as any) : null;

      console.log(`Processing ${eventName} event for ProviderProfile`);

      switch (eventName) {
        case 'INSERT':
          await handleProfileCreated(newImage);
          break;
        
        case 'MODIFY':
          await handleProfileUpdated(newImage, oldImage);
          break;
        
        case 'REMOVE':
          await handleProfileDeleted(oldImage);
          break;
      }
    } catch (error) {
      console.error('Error processing record:', error);
      // Continue processing other records even if one fails
    }
  }

  return;
};

async function handleProfileCreated(profile: any) {
  console.log('New provider profile created:', profile);
  
  // Future implementations:
  // - Index profile for search
  // - Send welcome email
  // - Create default settings
  // - Initialize analytics
  
  // For now, just log the event
  console.log(`Provider profile ${profile.id} created for user ${profile.userId}`);
}

async function handleProfileUpdated(newProfile: any, oldProfile: any) {
  console.log('Provider profile updated');
  
  // Check what changed
  const changedFields: string[] = [];
  
  if (oldProfile && newProfile) {
    for (const key of Object.keys(newProfile)) {
      if (JSON.stringify(oldProfile[key]) !== JSON.stringify(newProfile[key])) {
        changedFields.push(key);
      }
    }
  }
  
  console.log('Changed fields:', changedFields);
  
  // Future implementations:
  // - Update search index
  // - Check profile completion status
  // - Send notifications for important changes
  // - Update cache
  
  // Check if profile is now complete
  if (newProfile.profileComplete && !oldProfile?.profileComplete) {
    console.log('Profile is now complete! Triggering completion workflow...');
    // Future: Send congratulations email, update search rankings, etc.
  }
}

async function handleProfileDeleted(profile: any) {
  console.log('Provider profile deleted:', profile);
  
  // Future implementations:
  // - Remove from search index
  // - Clean up associated storage
  // - Archive data for compliance
  // - Cancel active subscriptions
  
  console.log(`Provider profile ${profile.id} deleted for user ${profile.userId}`);
}