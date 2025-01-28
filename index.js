import OpenAI from 'openai';
import dotenv from 'dotenv';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

// Load environment variables
dotenv.config();

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
                    content: "You are a helpful assistant that outputs JSON. Keep responses concise."
                },
                {
                    role: "user",
                    content: "Please find fields for analysing the document."
                },
                {
                    role: "assistant",
                    content: "What do you think about searching for the document date?"
                },
                {
                    role: "user",
                    content: "Great, what other fields do you think we should search for?"
                },
                {
                    role: "assistant",
                    content: "What do you think about searching for the document participants?"
                },
                {
                    role: "user",
                    content: "Great, I think you got the principles right. Please output the fields in JSON format. This is the document: " + document
                },
            ],
            model: "gpt-4o",
            response_format: zodResponseFormat(DocumentFields, "document_fields"),
        });

        const jsonres = JSON.parse(completion.choices[0].message.content);

        const check_completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant that checks our output for mandatory fields. You output JSON with one field "included" which is boolean and one field "missing_fields" which is an array of strings.`
                },
                {
                    role: "user",
                    content: "This is the document with the fields, please check if there is a author field in there:" + JSON.stringify(jsonres.fields)
                }
            ],
            model: "gpt-4o-mini",
            response_format: {
                type: "json_object"
            }
        });

        const jsonres2 = JSON.parse(check_completion.choices[0].message.content);

        if (jsonres2.included) {
            console.log('Response:', completion.choices[0].message.content);
        } else {
            console.log('Missing fields:', jsonres2);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();