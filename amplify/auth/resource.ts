import { defineAuth } from "@aws-amplify/backend";
import { postConfirmationTrigger } from "../functions/post-confirmation-trigger/resource.js";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  
  // User groups for role-based access
  groups: [
    'Customers',
    'Providers',
    'Admins',
  ],
  
  // Custom attributes
  userAttributes: {
    givenName: {
      mutable: true,
      required: false,
    },
    familyName: {
      mutable: true,
      required: false,
    },
    phoneNumber: {
      mutable: true,
      required: false,
    },
  },
  
  // Triggers
  triggers: {
    postConfirmation: postConfirmationTrigger,
  },
});