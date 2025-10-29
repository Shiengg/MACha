import express from 'express';
import dotenv from 'dotenv';

const app = express();
dotenv.config();

app.use(express.json());

app.get('/', (req, res) => {
    res.send("MACha API is running");
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
    console.log(`- Local:        http://localhost:${PORT}`)
})