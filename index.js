import express from 'express';
const app = express();

function firstEndpoint(req, res) {
   res.send('server created');
}

app.get('/', firstEndpoint);

app.post('/generate-image', (req, res) => {

   console.log(req.body);
})
app.listen(3000);