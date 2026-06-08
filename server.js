import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { dbConnect } from './config/dbConnection.js';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const PREFIX = '/api/v1';
app.use(cors());




app.get('/test-server', (req, res) => {
  res.send({ message: 'Hello from the server!' });
});




dbConnect().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
    });
}).catch((err) => {
    console.log(err)
})