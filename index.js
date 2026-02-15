import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import env from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from './supabaseServerClient.js';

env.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));



async function generateImage(promptText, size = "1024x1024") {
   const openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY,
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
   res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
      console.error("Error generating image (server):", err);
      res.status(500).json({ success: false, error: "failed to generate" });
   }
});


// Expose only public Supabase config to the client (anon key + url)
app.get('/supabase-config', (req, res) => {
   res.json({
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
   });
});


// Middleware: verify Supabase access token (Bearer) using the admin client
async function verifySupabaseToken(req, res, next) {
   try {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : (req.body && req.body.access_token) || req.query.access_token || null;
      if (!token) return res.status(401).json({ success: false, error: 'Missing access token' });

      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data || !data.user) return res.status(401).json({ success: false, error: 'Invalid or expired token' });

      req.user = data.user;
      next();
   } catch (err) {
      console.error('Token verification error:', err);
      return res.status(500).json({ success: false, error: 'Token verification failed' });
   }
}

// Protected route example: returns basic profile info
app.get('/protected/profile', verifySupabaseToken, (req, res) => {
   const user = req.user;
   res.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
});

// Protected image generation endpoint (requires auth)
app.post('/protected/generate-image', verifySupabaseToken, async (req, res) => {
   const { customPrompt, image_size } = req.body;
   if (!customPrompt || customPrompt.trim() === '') {
      return res.status(400).json({ success: false, error: 'customPrompt is required' });
   }

   const promptTxt = customPrompt.trim();
   const validSizes = ['1024x1024', '1024x768', '768x1024'];
   let finalSize = '1024x1024';
   if (image_size && validSizes.includes(image_size)) finalSize = image_size;

   try {
      // Optionally, you can log which user requested the image
      console.log('Protected generate by user:', req.user.id);
      const imageURL = await generateImage(promptTxt, finalSize);
      res.json({ success: true, image: imageURL });
   } catch (err) {
      console.error('Protected generate error:', err);
      res.status(500).json({ success: false, error: 'failed to generate' });
   }
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
   console.log(`Backend running on port ${PORT}`);
});
