#!/bin/bash

# Fix BackendSecret issues in amplify functions
files=(
    "amplify/functions/stripe-webhook/resource.ts"
    "amplify/functions/refund-processor/resource.ts" 
    "amplify/functions/stripe-connect/resource.ts"
)

for file in "${files[@]}"; do
    echo "Fixing $file"
    
    # Replace the import
    sed -i '' 's/import { nullableToString, nullableToNumber } from.*type-utils.*/import { secretToString } from "..\/..\/..\/lib\/type-utils";/' "$file"
    
    # Replace all nullableToString calls with secretToString
    sed -i '' 's/nullableToString(/secretToString(/g' "$file"
done

echo "Fixed all BackendSecret issues in amplify functions"
