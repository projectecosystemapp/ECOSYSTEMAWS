import type { PreSignUpTriggerHandler } from 'aws-lambda';

export const handler: PreSignUpTriggerHandler = async (event) => {
  console.log('Pre-signup trigger:', JSON.stringify(event));
  
  // Auto-confirm email if it matches a certain pattern (for testing)
  if (process.env.AUTO_CONFIRM_USERS === 'true') {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }
  
  // Validate custom attributes
  const userAttributes = event.request.userAttributes;
  const role = userAttributes['custom:role'];
  
  if (role && !['CUSTOMER', 'PROVIDER'].includes(role)) {
    throw new Error('Invalid role specified. Must be CUSTOMER or PROVIDER.');
  }
  
  // Set default role if not provided
  if (!role) {
    event.request.userAttributes['custom:role'] = 'CUSTOMER';
  }
  
  return event;
};