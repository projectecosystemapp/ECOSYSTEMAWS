#!/usr/bin/env npx tsx

/**
 * Systematic TypeScript Error Fix Script
 * Constitutional Compliance Tool
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Files that need type-utils imports
const filesNeedingTypeUtils = [
  'app/api/stripe/connect/route.ts',
  'app/api/stripe/connect-account/route.ts',
  'app/bookings/page.tsx',
  'app/customer/bookings/page.tsx',
  'app/provider/bookings/page.tsx',
  'components/admin/AdminStats.tsx',
  'components/admin/DataTable.tsx',
  'lib/api/mappers.ts'
];

async function addTypeUtilsImport(filePath: string): Promise<void> {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if import already exists
  if (content.includes('@/lib/type-utils')) {
    console.log(`✅ Already has import: ${filePath}`);
    return;
  }

  // Find the last import line
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') && !lines[i].includes('type ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    console.log(`❌ No imports found in: ${filePath}`);
    return;
  }

  // Insert the import after the last import
  lines.splice(lastImportIndex + 1, 0, "import { nullableToString, nullableToNumber, nullableToBoolean } from '@/lib/type-utils';");
  
  fs.writeFileSync(fullPath, lines.join('\n'));
  console.log(`✅ Added type-utils import to: ${filePath}`);
}

async function main(): Promise<void> {
  console.log('🔧 Starting systematic TypeScript error fixes...\n');

  // Add imports to files that need them
  for (const filePath of filesNeedingTypeUtils) {
    await addTypeUtilsImport(filePath);
  }

  console.log('\n📊 Checking error count...');
  try {
    const output = execSync('npm run fix:types 2>&1 | grep -c "error TS"', { encoding: 'utf8' });
    console.log(`Current TypeScript errors: ${output.trim()}`);
  } catch (error) {
    console.log('Error count check failed, but continuing...');
  }

  console.log('\n✅ Import fixes complete!');
}

if (require.main === module) {
  main().catch(console.error);
}
