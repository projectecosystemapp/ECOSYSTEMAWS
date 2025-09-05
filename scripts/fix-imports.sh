#!/bin/bash

# Find all TypeScript files with the non-existent imports and fix them
find . -name "*.ts" -not -path "./node_modules/*" -exec grep -l "nullableToOptionalString\|safeString" {} \; | while read file; do
    echo "Fixing $file"
    
    # Remove nullableToOptionalString and safeString from imports
    sed -i '' 's/, nullableToOptionalString//g' "$file"
    sed -i '' 's/nullableToOptionalString, //g' "$file"
    sed -i '' 's/, safeString//g' "$file"
    sed -i '' 's/safeString, //g' "$file"
    
    # Handle cases where these are the only imports
    sed -i '' 's/{ nullableToOptionalString }/{ nullableToString }/g' "$file"
    sed -i '' 's/{ safeString }/{ nullableToString }/g' "$file"
    sed -i '' 's/{ nullableToOptionalString, safeString }/{ nullableToString }/g' "$file"
    sed -i '' 's/{ safeString, nullableToOptionalString }/{ nullableToString }/g' "$file"
done

echo "Fixed all non-existent imports"
