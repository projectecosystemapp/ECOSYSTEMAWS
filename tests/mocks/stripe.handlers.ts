import { http, HttpResponse } from 'msw';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

export const stripeHandlers = [
  // Stripe Connect account creation
  http.post('/api/stripe/connect', async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.action === 'CREATE_ACCOUNT') {
      return HttpResponse.json({
        accountId: 'acct_test_' + Date.now(),
        url: 'https://connect.stripe.com/oauth/authorize?test=true',
        success: true
      });
    }
    
    if (body.action === 'CHECK_ACCOUNT_STATUS') {
      return HttpResponse.json({
        status: {
          accountId: 'acct_test_123',
          chargesEnabled: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
          requirements: {
            currentlyDue: [],
            eventuallyDue: [],
            pastDue: [],
            pendingVerification: []
          },
          capabilities: {
            card_payments: 'active',
            transfers: 'active'
          }
        }
      });
    }
    
    if (body.action === 'GET_PAYOUTS') {
      return HttpResponse.json({
        payouts: [
          {
            id: 'po_test_1',
            amount: 45000,
            status: 'paid',
            arrivalDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            bankAccount: '1234',
            transactionCount: 15,
            created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            currency: 'cad'
          },
          {
            id: 'po_test_2',
            amount: 38000,
            status: 'paid',
            arrivalDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
            bankAccount: '1234',
            transactionCount: 12,
            created: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            currency: 'cad'
          },
          {
            id: 'po_test_3',
            amount: 52000,
            status: 'in_transit',
            arrivalDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            bankAccount: '1234',
            transactionCount: 18,
            created: new Date().toISOString(),
            currency: 'cad'
          }
        ]
      });
    }
    
    return HttpResponse.json({ error: 'Unknown action' }, { status: 400 });
  }),
  
  // Stripe Connect OAuth return
  http.get('/provider/onboarding/payments', ({ request }) => {
    const url = new URL(request.url);
    const success = url.searchParams.get('success');
    const account = url.searchParams.get('account');
    
    if (success === 'true' && account) {
      return HttpResponse.json({
        success: true,
        accountId: account,
        message: 'Account connected successfully'
      });
    }
    
    return HttpResponse.json({
      success: false,
      message: 'Onboarding cancelled or failed'
    });
  }),
  
  // Payment Intent creation
  http.post('/api/stripe/payment-intent', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      clientSecret: 'pi_test_' + Date.now() + '_secret_' + Math.random().toString(36),
      paymentIntentId: 'pi_test_' + Date.now(),
      amount: nullableToString(body.amount),
      currency: body.currency || 'cad',
      status: 'requires_payment_method'
    });
  }),
  
  // Payment Intent confirmation
  http.post('/api/stripe/payment-intent/confirm', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      paymentIntentId: nullableToString(body.paymentIntentId),
      status: 'succeeded',
      amount: nullableToString(body.amount),
      chargeId: 'ch_test_' + Date.now(),
      capturedAt: new Date().toISOString()
    });
  }),
  
  // Refund creation
  http.post('/api/stripe/refund', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      refundId: 're_test_' + Date.now(),
      amount: nullableToString(body.amount),
      status: 'succeeded',
      paymentIntentId: nullableToString(body.paymentIntentId),
      reason: body.reason || 'requested_by_customer',
      createdAt: new Date().toISOString()
    });
  }),
  
  // Account balance
  http.get('/api/stripe/balance/:accountId', ({ params }) => {
    return HttpResponse.json({
      accountId: nullableToString(params.accountId),
      available: [
        {
          amount: 125000,
          currency: 'cad'
        }
      ],
      pending: [
        {
          amount: 45000,
          currency: 'cad'
        }
      ],
      connectReserved: [
        {
          amount: 0,
          currency: 'cad'
        }
      ]
    });
  }),
  
  // Transfer to connected account
  http.post('/api/stripe/transfer', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      transferId: 'tr_test_' + Date.now(),
      amount: nullableToString(body.amount),
      currency: body.currency || 'cad',
      destination: nullableToString(body.destination),
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }),
  
  // Webhook simulation
  http.post('/api/stripe/webhook', async ({ request }) => {
    const body = await request.json() as any;
    
    // Simulate different webhook events
    switch (body.type) {
      case 'payment_intent.succeeded':
        return HttpResponse.json({
          received: true,
          processed: true,
          bookingUpdated: true
        });
        
      case 'account.updated':
        return HttpResponse.json({
          received: true,
          processed: true,
          accountUpdated: true
        });
        
      case 'payout.paid':
        return HttpResponse.json({
          received: true,
          processed: true,
          payoutRecorded: true
        });
        
      default:
        return HttpResponse.json({
          received: true,
          processed: false,
          reason: 'Unhandled event type'
        });
    }
  }),
  
  // Earnings export
  http.post('/api/stripe/earnings/export', async ({ request }) => {
    const body = await request.json() as any;
    const format = body.format || 'csv';
    
    if (format === 'csv') {
      const csvContent = `Date,Customer,Service,Amount,Platform Fee,Net Amount,Status
2024-01-15,John Doe,Standard Cleaning,$80.00,$6.40,$73.60,Completed
2024-01-14,Jane Smith,Deep Cleaning,$120.00,$9.60,$110.40,Completed
2024-01-13,Bob Johnson,Standard Cleaning,$80.00,$6.40,$73.60,Completed
2024-01-12,Alice Brown,Window Cleaning,$60.00,$4.80,$55.20,Completed
2024-01-11,Charlie Davis,Deep Cleaning,$120.00,$9.60,$110.40,Pending`;
      
      return new HttpResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transactions-${Date.now()}.csv"`
        }
      });
    }
    
    return HttpResponse.json({ error: 'Unsupported format' }, { status: 400 });
  })
];

// Error simulation handlers for testing error scenarios
export const stripeErrorHandlers = [
  // Simulate payment failure
  http.post('/api/stripe/payment-intent', () => {
    return HttpResponse.json(
      {
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.'
        }
      },
      { status: 400 }
    );
  }),
  
  // Simulate Connect account creation failure
  http.post('/api/stripe/connect', () => {
    return HttpResponse.json(
      {
        error: 'Unable to create Connected account. Please try again.'
      },
      { status: 500 }
    );
  }),
  
  // Simulate payout failure
  http.post('/api/stripe/payout', () => {
    return HttpResponse.json(
      {
        error: {
          type: 'invalid_request_error',
          message: 'Insufficient funds in Stripe account.'
        }
      },
      { status: 400 }
    );
  }),
  
  // Simulate network timeout
  http.get('/api/stripe/**', () => {
    return new Promise(() => {
      // Never resolve to simulate timeout
    });
  })
];

// Helper to get rate limit headers
function getRateLimitHeaders(remaining: number = 100, reset: number = Date.now() + 60000) {
  return {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString()
  };
}