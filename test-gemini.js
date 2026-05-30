require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key loaded:', apiKey ? '✅ Yes' : '❌ No');

if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

async function testGemini() {
  try {
    console.log('Initializing Gemini...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    console.log('Sending request...');
    const prompt = `Generate a JSON contract for: "Create a login API endpoint"`;
    
    const response = await model.generateContent(prompt);
    console.log('Response received!');
    console.log(response.response.text());
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testGemini();
