process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  // 'data' will contain the barcode (plus possibly a newline)
  console.log('Scanned data:', data.trim());
});

console.log('Please scan a barcode...');