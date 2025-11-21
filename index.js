import express from 'express';
import corse from 'cors';
import OpenAI from 'openai';
import env from 'dotenv';

env.config();
const app = express();
app.use(express.json());
app.use(corse()); //app.confi, this is used to call middlewares



function firstEndpoint(req, res) {
   res.send('server created');
}

app.get('/', firstEndpoint);

app.post('/generate-image', (req, res) => {

   const promptTxt = "Generate an image of an gray tabby cat hugging an otter with an orange scarf"
   const imageObj = awaitgenerateImage(promptTxt);
   console.log(imageObj);

   
   res.send('connected to BE');
})

   async function generateImage(promptText){

      const openai = new OpenAI({
         apiKey: process.env.OPEN-AI-KEY,
    });

      try{
          const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: promptText,
            n: 1,
            size: "1024x1024",
         });
         return response.data[0].url;
      }catch (error){
         console.error("Error generating image:", error);
         throw error;
      }
   }

app.post('/generate-image', (req, res) => {
   const openai = new OpenAI({
      apiKey: process.env.OPEN-AI-KEY,
   });
   res.send('connected to BE');
})
app.listen(process.env.PORT);