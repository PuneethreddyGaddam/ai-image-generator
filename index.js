import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import env from 'dotenv';

env.config();

const app = express();
app.use(express.json());
app.use(cors()); 



async function generateImage(promptText) {
   const openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY, 
   });

   try {
      const response = await openai.images.generate({
         model: "gpt-image-1",          
         prompt: promptText,
         size: "1024x1024",
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
   const promptTxt = "Generate an gray tabby cat hugging an otter with an orange scarf";

   try {
      const imageURL = await generateImage(promptTxt);   
      console.log(imageURL);

      res.json({
         success: true,
         image: imageURL
      });

   } catch (err) {
      res.status(500).json({ success: false, error: "Failed to generate image" });
   }
});



app.listen(process.env.PORT, () => {
   console.log(`Backend running on port ${process.env.PORT}`);
});
