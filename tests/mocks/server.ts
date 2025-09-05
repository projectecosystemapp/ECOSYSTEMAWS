import { setupServer } from 'msw/node';
import { stripeHandlers } from './stripe.handlers';

// Create the MSW server with default handlers
export const server = setupServer(...stripeHandlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

// Helper function to use error handlers for specific tests
export function useErrorHandlers() {
  const { stripeErrorHandlers } = require('./stripe.handlers');
  server.use(...stripeErrorHandlers);
}

// Helper function to override specific endpoints
export function mockEndpoint(method: string, path: string, response: any, status = 200) {
  const { http, HttpResponse } = require('msw');
  
  const handler = (http as any)[method.toLowerCase()](path, () => {
    return HttpResponse.json(response, { status });
  });
  
  server.use(handler);
}