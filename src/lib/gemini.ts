import { GoogleGenerativeAI } from "@google/generative-ai";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const model = genAI.getGenerativeModel({
    model: 'gemini-1-5.flash'
})

export const aiSummariseCommit = async (diff: string) => {
    const response = await model.generateContent([
        { text: diff }, // Fără `mimeType`, deoarece nu este acceptat
    ]);

    return response.response.text();
};

