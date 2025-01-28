
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import fs from 'fs';

// Load environment variables
dotenv.config();

const DocumentProcessor = z.object({
    name: z.string(),
    main_topic: z.string(),
    tree_paths: z.array(z.object({
        path: z.string(),
        instructions: z.string(),
    })),
});

const SummeryIndexes = z.object({
    indexes: z.array(z.number()),
});

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    const document = fs.readFileSync('./Davinci Sample.txt', 'utf8');

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a document analysis assistant that outputs JSON. For each document, you come up with 3 different path of summerizing the document. The output should be a JSON object."
                },
                {
                    role: "user",
                    content: "Please summerize the document. What options do you have to summerize the document: " + document
                }
            ],
            model: "gpt-4o",
            response_format: zodResponseFormat(DocumentProcessor, "document_processor"),
        });

        const jsonres = JSON.parse(completion.choices[0].message.content);

        const results = []

        for (const path of jsonres.tree_paths) {
            const completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: "Please summerize the document using the following the following instructions: " + path.instructions + "This is the document: " + document
                    }
                ],
                model: "gpt-4o-mini",
            });

            console.log(path);
            results.push(completion.choices[0].message.content);
        }

        let final_result = ''
        results.forEach((result, i) => {
            final_result += `${i}: ${result}\n`
        })

        const final_completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: "Please give back all indexes of the options, that you see fit to summerize the document in regards of the main topic" + jsonres.main_topic + ". If none of the options are good, please give back an empty array. This is the final result: " + final_result
                }
            ],
            model: "gpt-4o-mini",
            response_format: zodResponseFormat(SummeryIndexes, "summery_indexes"),
        })

        console.log(final_completion.choices[0].message.content);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();