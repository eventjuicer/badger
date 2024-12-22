
const readline = require('readline');

// Create a readline interface to read from stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false // Important for non-interactive input
});

rl.on('line', (line) => {
  const trimmedLine = line.trim();
  if (trimmedLine) {
    const url = extractURL(trimmedLine);
    if (url) {
      console.log('Extracted URL:', url);
      // Further processing can be done here
    } else {
      console.log('No URL found in the scanned barcode.');
    }
  }
});

function extractURL(text) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlPattern);
  return matches ? matches[0] : null;
}

console.log('Ready to scan. Please scan a barcode containing a URL...');




process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  // 'data' will contain the barcode (plus possibly a newline)
  console.log('Scanned data:', data.trim());
});

console.log('Please scan a barcode...');
