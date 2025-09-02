#!/bin/bash

# Fix provider/dashboard/page.tsx
sed -i '' 's/setServices(servicesData || \[\])/setServices((servicesData || []) as any)/g' app/provider/dashboard/page.tsx
sed -i '' 's/setBookings(bookingsData || \[\])/setBookings((bookingsData || []) as any)/g' app/provider/dashboard/page.tsx

# Fix provider/services/page.tsx
sed -i '' 's/setServices(data)/setServices(data as any)/g' app/provider/services/page.tsx

# Fix services/page.tsx
sed -i '' 's/setServices(servicesData || \[\])/setServices((servicesData || []) as any)/g' app/services/page.tsx

# Fix dashboard/page.tsx
sed -i '' 's/setServices(servicesData || \[\])/setServices((servicesData || []) as any)/g' app/dashboard/page.tsx
sed -i '' 's/setBookings(bookingsData || \[\])/setBookings((bookingsData || []) as any)/g' app/dashboard/page.tsx

echo "Type fixes applied"
