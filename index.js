import express from 'express';
const app = express();

function firstEndpoint(req, res) {
   res.send('server created');
}

app.get('/', firstEndpoint);
app.listen(3000);