// check-env.js
const path = require('path');
const fs = require('fs');
console.log('Reading file:', path.resolve(__dirname, '.env'));
try {
  const raw = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
  console.log('---- .env raw start ----');
  console.log(raw);
  console.log('---- .env raw end ----\n');
} catch (e) {
  console.error('Cannot read .env:', e.message);
}

const dotenv = require('dotenv');
const parsed = dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log('dotenv parse error:', parsed.error || 'none');
console.log('parsed:', parsed.parsed);

console.log('process.env.AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME);
