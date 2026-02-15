import env from 'dotenv';
env.config({ override: true });

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from './supabaseServerClient.js';

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


app.post('/generate-image', verifySupabaseToken, async (req, res) => {
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
   console.log("User:", req.user.id);

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

// NEW: Custom Signup endpoint to bypass email confirmation (for dev ease)
app.post('/auth/signup', async (req, res) => {
   const { email, password, firstName, lastName } = req.body;
   if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

   try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
         email,
         password,
         email_confirm: true,
         user_metadata: {
            first_name: firstName || '',
            last_name: lastName || ''
         }
      });

      if (error) {
         console.error('Admin signup error:', error);
         return res.status(error.status || 400).json({ success: false, error: error.message });
      }

      res.json({ success: true, user: data.user });
   } catch (err) {
      console.error('Unexpected signup error:', err);
      res.status(500).json({ success: false, error: 'Internal server error during signup' });
   }
});


// Sanitize helper to remove accidental quotes or whitespace
const sanitize = (val) => (val || '').trim().replace(/^["']|["']$/g, '');

// Expose only public Supabase config to the client (anon key + url)
app.get('/supabase-config', (req, res) => {
   res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
   const config = {
      SUPABASE_URL: sanitize(process.env.SUPABASE_URL),
      SUPABASE_ANON_KEY: sanitize(process.env.SUPABASE_ANON_KEY)
   };
   console.log("Serving Sanitized Supabase Config:", config.SUPABASE_URL);
   res.json(config);
});


// Middleware: verify Supabase access token (Bearer) using the admin client
async function verifySupabaseToken(req, res, next) {
   try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) {
         return res.status(401).json({ success: false, error: 'Missing or malformed access token' });
      }

      const token = auth.split(' ')[1];
      const { data, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !data || !data.user) {
         return res.status(401).json({ success: false, error: 'Invalid or expired token' });
      }

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

// Note: /protected/generate-image is deprecated in favor of /generate-image with verifySupabaseToken logic




const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
   console.log(`Backend running on port ${PORT}`);
});
