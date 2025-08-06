const fs = require('fs');
const path = require('path');

function formatJsonFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  try {
    const parsedJson = JSON.parse(fileContent);
    const formattedJson = JSON.stringify(parsedJson, null, 2);
    fs.writeFileSync(filePath, formattedJson);
  } catch (error) {
    console.error(`Error in JSON file '${filePath}':`, error.message);
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
          formatJsonFile(filePath);
        }
      });
    }
  }
});