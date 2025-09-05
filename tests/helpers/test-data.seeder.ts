import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import { Schema } from '@/amplify/data/resource';
import { v4 as uuidv4 } from 'uuid';
import amplifyConfig from '@/amplify_outputs.json';
import type { TestUser } from './auth.helper';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

export class TestDataSeeder {
  private client: ReturnType<typeof generateClient<Schema>>;
  private testUser: TestUser | null = null;
  
  constructor(testUser?: TestUser) {
    // Configure Amplify if not already configured
    if (!Amplify.getConfig().Auth) {
      Amplify.configure(amplifyConfig);
    }
    
    this.testUser = testUser || null;
    
    // If we have auth tokens, configure the client with them
    if (testUser) {
      // Configure auth for this specific client instance
      this.client = generateClient<Schema>({
        authMode: 'userPool',
        authToken: async () => this.testUser?.idToken || ''
      });
    } else {
      // Use default client (will fail if auth is required)
      this.client = generateClient<Schema>();
    }
  }
  
  /**
   * Update the authentication tokens
   */
  updateAuth(testUser: TestUser): void {
    this.testUser = testUser;
    // Recreate client with new auth tokens
    this.client = generateClient<Schema>({
      authMode: 'userPool',
      authToken: async () => this.testUser?.idToken || ''
    });
  }
  /**
   * Create provider earnings data including services and bookings
   */
  async createProviderEarningsData(providerId: string, config: {
    services: Array<{
      title: string;
      price: number;
      bookingsCount: number;
      completedCount: number;
    }>;
  }): Promise<{ services: string[]; bookings: string[]; customers: string[] }> {
    const createdData = {
      services: [] as string[],
      bookings: [] as string[],
      customers: [] as string[]
    };
    
    for (const serviceConfig of config.services) {
      // Create service
      const service = await this.client.models.Service.create({
        id: uuidv4(),
        providerId,
        title: nullableToString(serviceConfig.title),
        description: `Test service: ${serviceConfig.title}`,
        priceType: 'FIXED',
        price: nullableToString(serviceConfig.price),
        currency: 'CAD',
        duration: 60,
        location: 'PROVIDER',
        maxDistance: 50,
        isActive: true,
        instantBooking: true,
        cancellationPolicy: 'FLEXIBLE',
        category: 'CLEANING'
      });
      
      if (service.data) {
        createdData.services.push(service.data.id);
        
        // Create bookings for this service
        for (let i = 0; i < serviceConfig.bookingsCount; i++) {
          const customerId = `customer_${uuidv4()}`;
          createdData.customers.push(customerId);
          
          const bookingDate = new Date();
          bookingDate.setDate(bookingDate.getDate() - (serviceConfig.bookingsCount - i));
          
          const isCompleted = i < serviceConfig.completedCount;
          
          const booking = await this.client.models.Booking.create({
            id: uuidv4(),
            serviceId: nullableToString(service.data.id),
            providerId,
            customerId,
            customerEmail: `customer${i}@test.com`,
            date: bookingDate.toISOString().split('T')[0],
            time: '10:00',
            duration: 60,
            status: isCompleted ? 'COMPLETED' : 'CONFIRMED',
            paymentStatus: isCompleted ? 'CAPTURED' : 'ESCROW_HELD',
            paymentIntentId: `pi_test_${uuidv4()}`,
            amountCents: nullableToString(serviceConfig.price),
            platformFeeCents: Math.floor(serviceConfig.price * 0.08),
            providerEarningsCents: Math.floor(serviceConfig.price * 0.92),
            notes: `Test booking ${i + 1}`,
            createdAt: bookingDate.toISOString(),
            updatedAt: bookingDate.toISOString()
          });
          
          if (booking.data) {
            createdData.bookings.push(booking.data.id);
          }
        }
      }
    }
    
    return createdData;
  }
  
  /**
   * Create a completed booking
   */
  async createCompletedBooking(config: {
    providerId: string;
    customerId: string;
    serviceTitle: string;
    amount: number;
  }): Promise<{ serviceId: string; bookingId?: string }> {
    // Create service first
    const service = await this.client.models.Service.create({
      id: uuidv4(),
      providerId: nullableToString(config.providerId),
      title: nullableToString(config.serviceTitle),
      description: `Test service: ${config.serviceTitle}`,
      priceType: 'FIXED',
      price: nullableToString(config.amount),
      currency: 'CAD',
      duration: 60,
      location: 'PROVIDER',
      maxDistance: 50,
      isActive: true,
      instantBooking: true,
      cancellationPolicy: 'FLEXIBLE',
      category: 'CLEANING'
    });
    
    if (!service.data) {
      throw new Error('Failed to create service');
    }
    
    // Create completed booking
    const booking = await this.client.models.Booking.create({
      id: uuidv4(),
      serviceId: nullableToString(service.data.id),
      providerId: nullableToString(config.providerId),
      customerId: nullableToString(config.customerId),
      customerEmail: 'customer@test.com',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      duration: 60,
      status: 'COMPLETED',
      paymentStatus: 'CAPTURED',
      paymentIntentId: `pi_test_${uuidv4()}`,
      amountCents: nullableToString(config.amount),
      platformFeeCents: Math.floor(config.amount * 0.08),
      providerEarningsCents: Math.floor(config.amount * 0.92),
      notes: 'Test completed booking',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return {
      serviceId: nullableToString(service.data.id),
      bookingId: booking.data?.id
    };
  }
  
  /**
   * Create test customer bookings
   */
  async createCustomerBookings(customerId: string, providerId: string, count: number = 3): Promise<{ serviceId: string; bookingIds: string[] }> {
    const bookings = [];
    
    // Create a test service
    const service = await this.client.models.Service.create({
      id: uuidv4(),
      providerId,
      title: 'Test Cleaning Service',
      description: 'Test service for customer bookings',
      priceType: 'FIXED',
      price: 8000,
      currency: 'CAD',
      duration: 60,
      location: 'CUSTOMER',
      maxDistance: 50,
      isActive: true,
      instantBooking: true,
      cancellationPolicy: 'FLEXIBLE',
      category: 'CLEANING'
    });
    
    if (!service.data) {
      throw new Error('Failed to create service');
    }
    
    for (let i = 0; i < count; i++) {
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + i + 1);
      
      const booking = await this.client.models.Booking.create({
        id: uuidv4(),
        serviceId: nullableToString(service.data.id),
        providerId,
        customerId,
        customerEmail: 'customer@test.com',
        date: bookingDate.toISOString().split('T')[0],
        time: `${10 + i}:00`,
        duration: 60,
        status: i === 0 ? 'CONFIRMED' : 'PENDING',
        paymentStatus: i === 0 ? 'ESCROW_HELD' : 'PENDING',
        paymentIntentId: i === 0 ? `pi_test_${uuidv4()}` : undefined,
        amountCents: 8000,
        platformFeeCents: 640,
        providerEarningsCents: 7360,
        address: '123 Test Street, Test City, TC',
        notes: `Test booking ${i + 1}`
      });
      
      if (booking.data) {
        bookings.push(booking.data.id);
      }
    }
    
    return {
      serviceId: nullableToString(service.data.id),
      bookingIds: bookings
    };
  }
  
  /**
   * Clean up provider data
   */
  async cleanupProviderData(providerId: string): Promise<void> {
    try {
      // Delete all bookings for this provider
      const { data: bookings } = await this.client.models.Booking.list({
        filter: { providerId: { eq: providerId } }
      });
      
      if (bookings) {
        for (const booking of bookings) {
          await this.client.models.Booking.delete({ id: booking.id });
        }
      }
      
      // Delete all services for this provider
      const { data: services } = await this.client.models.Service.list({
        filter: { providerId: { eq: providerId } }
      });
      
      if (services) {
        for (const service of services) {
          await this.client.models.Service.delete({ id: service.id });
        }
      }
      
      // Delete provider profile
      await this.client.models.ProviderProfile.delete({ id: providerId });
      
    } catch (error) {
      console.error('Error cleaning up provider data:', error);
    }
  }
  
  /**
   * Clean up customer data
   */
  async cleanupCustomerData(customerId: string): Promise<void> {
    try {
      // Delete all bookings for this customer
      const { data: bookings } = await this.client.models.Booking.list({
        filter: { customerId: { eq: customerId } }
      });
      
      if (bookings) {
        for (const booking of bookings) {
          await this.client.models.Booking.delete({ id: booking.id });
        }
      }
      
    } catch (error) {
      console.error('Error cleaning up customer data:', error);
    }
  }
  
  /**
   * Create provider profile
   */
  async createProviderProfile(providerId: string, data: {
    businessName: string;
    businessType: string;
    description?: string;
    yearsExperience?: number;
  }): Promise<any> {
    const profile = await this.client.models.ProviderProfile.create({
      id: providerId,
      businessName: nullableToString(data.businessName),
      businessType: nullableToString(data.businessType),
      description: data.description || 'Test provider profile',
      yearsExperience: data.yearsExperience || 5,
      insuranceVerified: true,
      backgroundCheckCompleted: true,
      licenseNumber: 'TEST-123456',
      serviceAreas: ['Test City', 'Test Area'],
      languages: ['English'],
      availability: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' }
      },
      instantBooking: true,
      responseTime: 60,
      completedJobs: 0,
      rating: 0,
      reviewCount: 0,
      badges: [],
      certifications: [],
      portfolio: []
    });
    
    return profile.data;
  }
  
  /**
   * Create test reviews
   */
  async createReviews(providerId: string, serviceId: string, count: number = 5): Promise<string[]> {
    const reviews = [];
    
    for (let i = 0; i < count; i++) {
      const review = await this.client.models.Review.create({
        id: uuidv4(),
        bookingId: uuidv4(),
        providerId,
        customerId: `customer_${uuidv4()}`,
        customerName: `Test Customer ${i + 1}`,
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
        comment: `Great service! Test review ${i + 1}`,
        serviceQuality: 5,
        punctuality: 5,
        communication: 5,
        value: 4,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      });
      
      if (review.data) {
        reviews.push(review.data.id);
      }
    }
    
    return reviews;
  }
}