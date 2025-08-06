const fs = require('fs');
const path = require('path');
const jsonlint = require('jsonlint');

function validateJsonFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8').trim();
  try {
    const parsedJson = jsonlint.parse(fileContent);

    // Check for exact string "sample" (case-insensitive, including the quotes)
    if (fileContent.toLowerCase().includes('"sample"')) {
      console.error(`Validation failed for '${filePath}': Found forbidden string "sample" (with quotes, case-insensitive).`);
      process.exit(1);
    }

    // Check for invalid field combinations
    checkInvalidCombinations(parsedJson, filePath);

    // Check formatting
    if (JSON.stringify(parsedJson, null, 2) === fileContent) {
      console.log(`JSON file '${filePath}' is valid.`);
    } else {
      console.error(`Error in JSON file '${filePath}': The JSON is not well-formatted.`);
      process.exit(1); // Exit with a non-zero status code
    }
  } catch (error) {
    console.error(`Error in JSON file '${filePath}':`, error.message);
    process.exit(1); // Exit with a non-zero status code
  }
}

function checkInvalidCombinations(obj, filePath) {
  if (typeof obj !== 'object' || obj === null) return;

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'object' && value !== null) {
      const val = value['value'];
      const supported = value['supported'];
      const flag = value['flag'];

      // value + supported validation
      if ('value' in value && 'supported' in value) {
        if ((val === 'YES' && supported === false) || (val === 'NO' && supported === true)) {
          console.error(`❌ Validation failed in '${filePath}': Invalid value-supported combination in key "${key}". Found: value="${val}", supported=${supported}`);
          process.exit(1);
        }
      }

      // value + flag validation
      if ('value' in value && 'flag' in value) {
        if ((val === 'YES' && flag === 'negative') || (val === 'NO' && flag === 'positive')) {
          console.error(`❌ Validation failed in '${filePath}': Invalid value-flag combination in key "${key}". Found: value="${val}", flag="${flag}"`);
          process.exit(1);
        }
      }

      // supported + flag validation
      if ('supported' in value && 'flag' in value) {
        if ((supported === true && flag === 'negative') || (supported === false && flag === 'positive')) {
          console.error(`❌ Validation failed in '${filePath}': Invalid supported-flag combination in key "${key}". Found: supported=${supported}, flag="${flag}"`);
          process.exit(1);
        }
      }

      // value "?" + supported/flag
      if (val === '?' && (supported === true || flag === 'positive' || flag === 'neutral')) {
        console.error(`❌ ${filePath}: Invalid unknown-value combination in key "${key}". value="?", supported=${supported}, flag="${flag}"`);
        process.exit(1);
      }

      // value "SOON" + supported
      if (val === 'SOON' && supported === true) {
        console.error(`❌ ${filePath}: Invalid SOON-supported combination in key "${key}". value="SOON", supported=${supported}`);
        process.exit(1);
      }

      // Recursively check deeper objects
      checkInvalidCombinations(value, filePath);
    }
  }
}

const itemTypesDir = '../item-types';

fs.readdirSync(itemTypesDir, { withFileTypes: true }).forEach((entry) => {
  if (entry.isDirectory()) {
    const itemsDir = path.join(itemTypesDir, entry.name, 'items');

    if (fs.existsSync(itemsDir)) {
      fs.readdirSync(itemsDir).forEach((file) => {
        if (file.endsWith('.json')) {
          const filePath = path.join(itemsDir, file);
          validateJsonFile(filePath);
        }
      });
    }
  }
});

console.log("✅ JSONs validation finished OK");
