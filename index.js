import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/health", (req, res) => res.send("ok"));

app.post("/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: "no image returned" });

    res.json({ image: b64 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import env from 'dotenv';

env.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); 



async function generateImage(promptText, size = "1024x1024") {
   const openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY, 
   });

   try {
      const response = await openai.images.generate({
         model: "dall-e-3",          
         prompt: promptText,
         size: size,
         n: 1
      });

      return response.data[0].url;

   } catch (error) {
      console.error("Error generating image:", error);
      throw error;
   }
}



function firstEndpoint(req, res) {
   res.send('server created');
}

app.get('/', firstEndpoint);


app.post('/generate-image', async (req, res) => {
   const { customPrompt, image_size } = req.body;
   
   // Validate that customPrompt is provided and not empty
   if (!customPrompt || customPrompt.trim() === "") {
      return res.status(400).json({ 
         success: false, 
         error: "customPrompt is required. Please provide a description of the image you want to generate." 
      });
   }
   
   const promptTxt = customPrompt.trim();
   
   // DALL-E 3 only supports these sizes (optional with default)
   const validSizes = ["1024x1024", "1024x768", "768x1024"];
   let finalSize = "1024x1024"; // default
   if (image_size && validSizes.includes(image_size)) {
      finalSize = image_size;
   }
   
   console.log("Prompt:", promptTxt);
   console.log("Size:", finalSize);

   try {
      const imageURL = await generateImage(promptTxt, finalSize);   
      console.log("Generated image URL:", imageURL);

      res.json({
         success: true,
         image: imageURL
      });

   } catch (err) {
      console.error("Error:", err.message);
      res.status(500).json({ success: false, error: err.message || "Failed to generate image" });
   }
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
   console.log(`Backend running on port ${PORT}`);
});
