#!/usr/bin/env npx tsx

/**
 * Database Seeding Script
 * 
 * Seeds the database with sample data for development and testing.
 * Run with: npx tsx scripts/seed-database.ts
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { configureAmplify } from '@/lib/amplify-server-utils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configure Amplify for server-side usage
configureAmplify();

const client = generateClient<Schema>({
  authMode: 'identityPool',
});

interface SeedData {
  users: Array<{
    email: string;
    firstName: string;
    lastName: string;
    role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
    city: string;
    state: string;
  }>;
  services: Array<{
    title: string;
    description: string;
    price: number;
    category: string;
    providerEmail: string;
    duration: number;
  }>;
  categories: string[];
}

const seedData: SeedData = {
  users: [
    {
      email: 'admin@ecosystem.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      city: 'San Francisco',
      state: 'CA'
    },
    {
      email: 'provider1@example.com',
      firstName: 'John',
      lastName: 'Smith',
      role: 'PROVIDER',
      city: 'Los Angeles',
      state: 'CA'
    },
    {
      email: 'provider2@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'PROVIDER',
      city: 'New York',
      state: 'NY'
    },
    {
      email: 'provider3@example.com',
      firstName: 'Mike',
      lastName: 'Davis',
      role: 'PROVIDER',
      city: 'Austin',
      state: 'TX'
    },
    {
      email: 'customer1@example.com',
      firstName: 'Alice',
      lastName: 'Brown',
      role: 'CUSTOMER',
      city: 'San Francisco',
      state: 'CA'
    },
    {
      email: 'customer2@example.com',
      firstName: 'Bob',
      lastName: 'Wilson',
      role: 'CUSTOMER',
      city: 'Seattle',
      state: 'WA'
    }
  ],
  categories: [
    'Home Services',
    'Business',
    'Events', 
    'Fitness',
    'Creative',
    'Automotive',
    'Health',
    'Photography'
  ],
  services: [
    {
      title: 'Professional House Cleaning',
      description: 'Deep cleaning service for your home including kitchen, bathrooms, bedrooms, and living areas.',
      price: 120.00,
      category: 'Home Services',
      providerEmail: 'provider1@example.com',
      duration: 180
    },
    {
      title: 'Wedding Photography',
      description: 'Capture your special day with professional wedding photography. Includes 8-hour coverage and edited photos.',
      price: 2500.00,
      category: 'Photography',
      providerEmail: 'provider2@example.com',
      duration: 480
    },
    {
      title: 'Personal Training Session',
      description: '1-on-1 fitness training session customized to your goals. Includes workout plan and nutrition advice.',
      price: 80.00,
      category: 'Fitness',
      providerEmail: 'provider3@example.com',
      duration: 60
    },
    {
      title: 'Car Detailing Service',
      description: 'Complete interior and exterior car detailing. Wash, wax, vacuum, and interior cleaning.',
      price: 150.00,
      category: 'Automotive',
      providerEmail: 'provider1@example.com',
      duration: 120
    },
    {
      title: 'Logo Design',
      description: 'Professional logo design for your business. Includes 3 concepts and unlimited revisions.',
      price: 350.00,
      category: 'Creative',
      providerEmail: 'provider2@example.com',
      duration: 168
    },
    {
      title: 'Event Planning',
      description: 'Full-service event planning for corporate events, parties, and special occasions.',
      price: 1200.00,
      category: 'Events',
      providerEmail: 'provider3@example.com',
      duration: 480
    }
  ]
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Clear existing data (optional - comment out for production)
    console.log('🗑️  Clearing existing data...');
    
    // Seed Users
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const userData of seedData.users) {
      try {
        const user = await client.models.User.create({
          email: nullableToString(userData.email),
          firstName: nullableToString(userData.firstName),
          lastName: nullableToString(userData.lastName),
          role: nullableToString(userData.role),
          city: nullableToString(userData.city),
          state: nullableToString(userData.state),
        });
        createdUsers.push(user.data);
        console.log(`   ✅ Created ${userData.role.toLowerCase()}: ${userData.email}`);
      } catch (error) {
        console.log(`   ❌ Failed to create user ${userData.email}:`, error);
      }
    }

    // Seed Providers (for users with PROVIDER role)
    console.log('\n🏢 Creating provider profiles...');
    const providerUsers = seedData.users.filter(u => u.role === 'PROVIDER');
    for (const providerData of providerUsers) {
      try {
        const provider = await client.models.Provider.create({
          email: nullableToString(providerData.email),
          firstName: nullableToString(providerData.firstName),
          lastName: nullableToString(providerData.lastName),
          businessName: `${providerData.firstName} ${providerData.lastName} Services`,
          city: nullableToString(providerData.city),
          state: nullableToString(providerData.state),
          verificationStatus: 'APPROVED',
          active: true,
        });
        console.log(`   ✅ Created provider profile: ${providerData.email}`);
      } catch (error) {
        console.log(`   ❌ Failed to create provider ${providerData.email}:`, error);
      }
    }

    // Seed Services
    console.log('\n🛠️  Creating services...');
    for (const serviceData of seedData.services) {
      try {
        const service = await client.models.Service.create({
          title: nullableToString(serviceData.title),
          description: nullableToString(serviceData.description),
          price: nullableToString(serviceData.price),
          category: nullableToString(serviceData.category),
          providerEmail: nullableToString(serviceData.providerEmail),
          duration: nullableToString(serviceData.duration),
          active: true,
        });
        console.log(`   ✅ Created service: ${serviceData.title}`);
      } catch (error) {
        console.log(`   ❌ Failed to create service ${serviceData.title}:`, error);
      }
    }

    // Create sample bookings
    console.log('\n📅 Creating sample bookings...');
    const sampleBookings = [
      {
        serviceId: '1', // Will need to get actual service IDs
        customerEmail: 'customer1@example.com',
        providerEmail: 'provider1@example.com',
        scheduledDate: '2024-01-15',
        scheduledTime: '10:00',
        status: 'PENDING' as const,
        totalAmount: 120.00,
      },
      {
        serviceId: '2',
        customerEmail: 'customer2@example.com',
        providerEmail: 'provider2@example.com',
        scheduledDate: '2024-01-20',
        scheduledTime: '14:00',
        status: 'CONFIRMED' as const,
        totalAmount: 2500.00,
      }
    ];

    // Note: In a real implementation, we'd fetch actual service IDs
    console.log('   ⚠️  Booking creation skipped - needs actual service IDs');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${seedData.users.length} users created`);
    console.log(`   • ${providerUsers.length} provider profiles created`);
    console.log(`   • ${seedData.services.length} services created`);
    console.log('   • 0 bookings created (manual setup required)');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n🎉 Seeding process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error during seeding:', error);
      process.exit(1);
    });
}

export { seedDatabase };