//this file includes samples for structured output and few shot learning
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

// Load environment variables
dotenv.config();

function get_weather(location) {
    return {
        temperature: 20,
        location: location
    }
}

const tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current temperature for a given location.",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City and country e.g. Bogotá, Colombia"
                }
            },
            "required": [
                "location"
            ],
            "additionalProperties": false
        },
        "strict": true
    }
}]

const DocumentFields = z.object({
    name: z.string(),
    document_date: z.string().nullable(),
    fields: z.array(z.string()),
});

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that outputs JSON. Keep responses concise."
                },
                {
                    role: "user",
                    content: "Please get me some weather information for Bogotá, Colombia."
                },
            ],
            model: "gpt-4o",
            response_format: {
                type: "json_object"
            },
            tools: tools
        });

        const tool_calls = completion.choices[0].message.tool_calls;

        if (tool_calls.length > 0) {
            const tool_call = tool_calls[0];
            const tool_result = await tool_call.function.arguments;
            
            const weather_info = get_weather(tool_result.location);

            //llm call with tool result
            const completion2 = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that outputs JSON. Keep responses concise."
                    },
                    {
                        role: "user",
                        content: "Please get me some weather information for Bogotá, Colombia."
                    },
                    completion.choices[0].message,
                    {
                        role: "tool",
                        "tool_call_id": tool_call.id,
                        "content": JSON.stringify(weather_info)
                    },
                ],
                model: "gpt-4o",
            });

            console.log('Response:', completion2.choices[0].message.content);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();