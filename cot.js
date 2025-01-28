
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

// Load environment variables
dotenv.config();

tools = [{
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
            "additionalProperties": False
        },
        "strict": True
    }
}]

const DocumentProcessor = z.object({
    name: z.string(),
    processing_steps: z.array(z.object({
        step: z.string(),
        instructions: z.string(),
    })),
});
const DocumentFields = z.object({
    name: z.string(),
    document_date: z.string().nullable(),
    data: z.array(z.object({
        key: z.string(),
        value: z.string(),
    })),
});

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    const document = `[Illustration: Plate 1--MONA LISA. Frontispiece

In the Louvre. No. 1601. 2 ft 6 ½ ins. By 1 ft. 9 ins. (0.77 x 0.53)]



LEONARDO DA VINCI



By MAURICE W. BROCKWELL



Illustrated With Eight Reproductions in Colour

[Illustration]


"Leonardo," wrote an English critic as far back as 1721, "was a Man
so happy in his genius, so consummate in his Profession, so
accomplished in the Arts, so knowing in the Sciences, and withal, so
much esteemed by the Age wherein he lived, his Works so highly
applauded by the Ages which have succeeded, and his Name and Memory
still preserved with so much Veneration by the present Age--that, if
anything could equal the Merit of the Man, it must be the Success he
met with. Moreover, 'tis not in Painting alone, but in Philosophy,
too, that Leonardo surpassed all his Brethren of the 'Pencil.'"

This admirable summary of the great Florentine painter's life's work
still holds good to-day.




CONTENTS

His Birth
His Early Training
His Early Works
First Visit to Milan
In the East
Back in Milan
The Virgin of the Rocks
The Last Supper
The Court of Milan
Leonardo Leaves Milan
Mona Lisa
Battle of Anghiari
Again in Milan
In Rome
In France
His Death
His Art
His Mind
His Maxims
His Spell
His Descendants




LIST OF ILLUSTRATIONS

Plate
I. Mona Lisa
  In the Louvre
II. Annunciation
  In the Uffizi Gallery, Florence
III. Virgin of the Rocks
  In the National Gallery, London
IV. The Last Supper
  In the Refectory of Santa Maria delle Grazie, Milan
V. Copy of the Last Supper
  In the Diploma Gallery, Burlington House
VI. Head of Christ
  In the Brera Gallery, Milan
VII. Portrait (presumed) of Lucrezia Crivelli
  In the Louvre
VIII. Madonna, Infant Christ, and St Anne.
  In the Louvre




HIS BIRTH

Leonardo Da Vinci, the many-sided genius of the Italian Renaissance,
was born, as his name implies, at the little town of Vinci, which is
about six miles from Empoli and twenty miles west of Florence. Vinci
is still very inaccessible, and the only means of conveyance is the
cart of a general carrier and postman, who sets out on his journey
from Empoli at sunrise and sunset. Outside a house in the middle of
the main street of Vinci to-day a modern and white-washed bust of the
great artist is pointed to with much pride by the inhabitants.
Leonardo's traditional birthplace on the outskirts of the town still
exists, and serves now as the headquarters of a farmer and small wine
exporter.

Leonardo di Ser Piero d'Antonio di Ser Piero di Ser Guido da
Vinci--for that was his full legal name--was the natural and
first-born son of Ser Piero, a country notary, who, like his father,
grandfather, and great-grandfather, followed that honourable
vocation with distinction and success, and who subsequently--when
Leonardo was a youth--was appointed notary to the Signoria of
Florence. Leonardo's mother was one Caterina, who afterwards married
Accabriga di Piero del Vaccha of Vinci.`;

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a document analysis assistant that outputs JSON. For each document, you come up with a list of processing steps that will help you extract the core information from to understand the document. The instructions should not include the analysis of the document but rather the what needs to be done in the specific step. The output should be a JSON object."
                },
                {
                    role: "user",
                    content: "Please find processing steps for analysing the document. This is the document: " + document
                }
            ],
            model: "gpt-4o",
            response_format: zodResponseFormat(DocumentProcessor, "document_processor"),
        });

        const jsonres = JSON.parse(completion.choices[0].message.content);

        const extractedData = {};

        for (const step of jsonres.processing_steps) {
            const check_completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful assistant that processes the document. This is the processing step we are currently working on: ${JSON.stringify(step)}. Please output the JSON object with the data.`
                    },
                    {
                        role: "user",
                        content: "This is the document with the fields, please check if there is a author field in there:" + document
                    }
                ],
                model: "gpt-4o-mini",
                response_format: zodResponseFormat(DocumentFields, "document_fields"),
                functions: [

                ]
            });

            console.log(step.step);

            extractedData[step.step] = JSON.parse(check_completion.choices[0].message.content);
        }

        console.log('Response:', JSON.stringify(extractedData));
    } catch (error) {
        console.error('Error:', error);
    }
}

main();