import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/log-error', (req, res) => {
  console.log('BROWSER ERROR:', req.body.error);
  res.sendStatus(200);
});

app.listen(9999, () => {
  console.log('Log server listening on port 9999');
});
