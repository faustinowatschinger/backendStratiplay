import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { handler as createPlanHandler } from './api/create-plan.js';
import chatCustomPrompt from './routes/chat.js';
import cancelPlanRouter from './api/cancel-plan.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: 'https://stratiplay.com' // Cambia 'localhost' por tu dominio
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/backend/api/create-plan', createPlanHandler);
app.use('/api/chat', chatCustomPrompt);
app.use('/api', cancelPlanRouter);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});