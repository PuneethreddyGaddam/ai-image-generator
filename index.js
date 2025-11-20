import express from 'express';
import corse from 'cors';


const app = express();
app.use(corse()); //app.confi, this is used to call middlewares



function firstEndpoint(req, res) {
   res.send('server created');
}

app.get('/', firstEndpoint);

app.post('/generate-image', (req, res) => {

   console.log(req.body);
   res.send('connected to BE');
})
app.listen(4000);