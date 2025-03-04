import OpenAI from "openai";
import systemPrompt from "@/constants/SystemPrompt";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(request: Request) {
  const { userPrompt } = await request.json();

  if (!userPrompt) {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "system",
          content: `
Here is the message is: "${userPrompt}"`,
        },
      ],
      model: "deepseek-chat",
    });

    const botReply = completion.choices[0].message.content;
    console.log(botReply, "bot reply");

    return Response.json(botReply);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
