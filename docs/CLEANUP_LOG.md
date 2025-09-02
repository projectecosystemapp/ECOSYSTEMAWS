# Cleanup Log - September 2, 2025

## Overview
Systematic removal of dead code after migrating from dual-backend architecture (Supabase + Lambda functions) to clean AWS-native architecture (Amplify + Next.js API routes).

## Removed: Lambda Function Definitions

### Dead Lambda Functions (functionality moved to Next.js API routes)
- `/amplify/functions/stripe-connect/` → `/app/api/stripe/connect/`
- `/amplify/functions/payout-manager/` → `/app/api/stripe/payouts/`
- `/amplify/functions/refund-processor/` → `/app/api/stripe/refunds/`
- `/amplify/functions/messaging-handler/` → `/app/api/messaging/`
- `/amplify/functions/notification-handler/` → `/app/api/notifications/`
- `/amplify/functions/profile-events/` → `/app/api/profiles/`
- `/amplify/functions/bedrock-ai/` → `/app/api/ai/`
- `/amplify/functions/webhook-authorizer/` → Handled by Next.js middleware
- `/amplify/functions/webhook-reconciliation/` → `/app/api/webhooks/reconcile/`

### Kept Lambda Functions (event-driven only)
- `/amplify/functions/post-confirmation-trigger/` → Cognito trigger (legitimate use)
- `/amplify/functions/stripe-webhook/` → Webhook processing (legitimate use)
- `/amplify/functions/booking-processor/` → DynamoDB stream processing (legitimate use)

## Removed: Configuration Files
- `scripts/setup-lambda-urls.sh` → No longer needed with API routes
- `create-lambda-urls.sh` → Duplicate functionality
- `fix-this-shit.sh` → Temporary debugging script
- `scripts/fix-types.sh` → Temporary debugging script
- `commit-auth-fix.sh` → Temporary debugging script
- `commit-auth-fix-typed.sh` → Temporary debugging script

## Removed: Duplicate Agent Charters
- `/AGENT_CHARTERS/` → Consolidated into `/.claude/agents/`
- Removed duplicate AWS_ARCHITECT.md, MARKETPLACE_BUILDER.md, etc.

## Removed: Dead Documentation
- `AMPLIFY_SETUP_INSTRUCTIONS.md` → Superseded by INTEGRATION_GUIDE.md
- `AMPLIFY_PRODUCTION_CONFIG.md` → Superseded by DEPLOYMENT_NOTES.md
- `DEPLOYMENT_STATUS.md` → Temporary file, no longer relevant

## Removed: Unused Utilities
- `/lib/amplify-client-wrapper.ts` → Superseded by `/lib/amplify-client.ts`
- `/lib/amplify-server-utils.ts` → Functionality moved to API routes
- `/utils/amplifyServerUtils.ts` → Duplicate of above

## Consolidated: Type Definitions
- Merged multiple Stripe type files into `/lib/types/stripe.ts`
- Removed duplicate database model types
- Consolidated API types into `/lib/api-types.ts`

## Architectural Changes Preserved
- ✅ 10% platform commission model
- ✅ 10% guest surcharge for non-authenticated users
- ✅ Stripe Connect payouts to providers
- ✅ DynamoDB single-table design
- ✅ Cognito authentication with user groups

## Files Archived (not deleted)
- Original Lambda logic archived in branch `pre-cleanup-archive`
- Complex business logic preserved in `/app/api/` routes
- Database migration history preserved in `/amplify/data/`

## Next Steps
1. Update import statements to use new file locations
2. Remove unused npm dependencies
3. Update CI/CD pipeline to reflect new architecture
4. Test all critical user journeys
5. Update documentation references