// Test Vertex AI với @google/genai mới
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./vertex-key.json";

const { GoogleGenAI } = require('@google/genai');

const PROJECT_ID = process.env.PROJECT_ID || 'gen-lang-client-0524859745';

async function testVertex() {
    console.log('=== Test Vertex AI ===');
    console.log('Project:', PROJECT_ID);

    try {
        const ai = new GoogleGenAI({
            vertexai: {
                project: PROJECT_ID,
                location: 'us-central1'
            }
        });

        console.log('1. Test chat với gemini-2.0-flash...');
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: 'Xin chào, bạn tên gì? Trả lời ngắn gọn.' }] }],
        });

        const answer = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('Answer:', answer.slice(0, 200));

        console.log('\n2. Test embedding với text-embedding-004...');
        const embedResponse = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: 'Hello world',
        });

        const vector = embedResponse?.embeddings?.[0]?.values || [];
        console.log('Vector dimensions:', vector.length);

        console.log('\n✅ Vertex AI hoạt động!');

    } catch (error) {
        console.error('❌ Lỗi:', error.message || error);
        if (error.details) console.error('Details:', JSON.stringify(error.details, null, 2));
    }
}

testVertex();
