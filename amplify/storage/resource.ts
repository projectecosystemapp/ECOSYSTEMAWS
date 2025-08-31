import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'ecosystemStorage',
  access: (allow) => ({
    // Private Provider Assets - for future use (e.g., private documents)
    'private/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
    // Public Profile Assets - for profile pictures and portfolio
    'public/pictures/{entity_id}/*': [
      allow.entity('identity').to(['write', 'delete']),
      allow.guest.to(['read']),
      allow.authenticated.to(['read'])
    ],
    // Public portfolio images accessible to everyone
    'public/pictures/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read'])
    ],
    // Service images - public read, owner write
    'services/{entity_id}/*': [
      allow.entity('identity').to(['write', 'delete']),
      allow.guest.to(['read']),
      allow.authenticated.to(['read'])
    ],
    // Chat attachments - accessible to authenticated users
    'messages/{entity_id}/*': [
      allow.entity('identity').to(['write', 'delete']),
      allow.authenticated.to(['read'])
    ]
  })
});