const fs = require('fs');

// Function to search for all JSON files in a directory
function findJSONFiles(directory) {
    return fs.readdirSync(directory).filter((file) => file.endsWith('.json'));
}

function readJSONFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error reading JSON file at ${filePath}:`, error);
        exit(1)
    }
}

function safeReadJSONFile(filePath) {
    if (fs.existsSync(filePath)) {
        return readJSONFile(filePath)
    }
    return undefined
}

module.exports = {
    findJSONFiles,
    readJSONFile,
    safeReadJSONFile
  };