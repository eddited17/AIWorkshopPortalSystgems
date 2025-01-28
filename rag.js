import dotenv from 'dotenv';
import VectorDB from "@themaximalist/vectordb.js"
import fs from 'fs';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod.mjs';
import { z } from 'zod';
// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const TagExtractor = z.object({
  tags: z.array(z.string()),
});
export const ChunkAnalyzer = z.object({
  newChapter: z.boolean(),
});

const generateTags = async (chunk) => {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are a document classifier. Please classify the document into 3 different categories. these are from the list of possible categories:
        
        history, science, technology, politics, economics, and culture, finance
        
        The output should be a JSON object.`
      },
      {
        role: "user",
        content: "Please classify the document. What options do you have to classify the document: " + chunk
      }
    ],
    model: "gpt-4o",
    response_format: zodResponseFormat(TagExtractor, "tag_extractor"),
  });

  const res = JSON.parse(completion.choices[0].message.content);

  return res.tags;
}

const isNewChapter = async (currentChunk, nextChunk) => {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are a document classifier. You are given two chunks of a document. You need to determine if the next chunk belongs to a new chapter is a new chapter.
        
        The output should be a JSON object.`
      },
      {
        role: "user",
        content: "Please determine if the next chunk belongs to a new chapter. The current chunk is: " + currentChunk + " and the next chunk is: " + nextChunk
      }
    ],
    model: "gpt-4o",
    response_format: zodResponseFormat(ChunkAnalyzer, "chunk_analyzer"),
  });

  const res = JSON.parse(completion.choices[0].message.content);

  return res.newChapter;
}

const db = new VectorDB({
  dimensions: 1536,
  embeddings: {
    service: "openai"
  }
});

async function load_document() {
  const document = fs.readFileSync('Davinci Sample.txt', 'utf8');

  //create chunks of 500 characters with overlap of 100
  const chunks = [];
  for (let i = 0; i < document.length; i += 2000) {
    const iWithOverlap = i - 100;
    const chunk = document.slice(iWithOverlap < 0 ? 0 : iWithOverlap, i + 600);
    chunks.push(chunk);
  }

  let nextChunk;
  let currentChunk;
  for (const chunk of chunks) {
    //llm call to generate tags
    const tags = await generateTags(chunk);
    console.log(tags);

    if (!currentChunk) {
      currentChunk = chunk;
    } else {
      currentChunk = currentChunk + chunk;
    }

    if (i === chunks.length - 1) {
      nextChunk = chunk;
    }

    //llm call to generate if this is a new chapter
    const newChapter = await isNewChapter(currentChunk, nextChunk);
    console.log(newChapter);

    if (newChapter) {
      await db.add(currentChunk, {
        metadata: {
          source: "Davinci Sample.txt",
          tags: tags
        }
      });
      currentChunk = undefined;
    }
  }

  return document;
}

async function main() {
  await load_document();
  // ask for up to 4 embeddings back, default is 3
  const question = "What did leonardo da vinci invent?";

   //Rewritten query = "In the books from A10, search for all the technical books about Leonardo da Vincis inventions."
  //llm call to classify the question into our categories
  const tags = await generateTags(question);

  const results = await db.search("What did leonardo da vinci invent?", 10);

  results.filter(result => tags.includes(result.metadata.tags[0]));

  console.log(results);
}

main();
