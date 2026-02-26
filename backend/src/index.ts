import 'dotenv/config';
import { app } from './app';
import { startEmailBatchProcessor } from './services/email-batch-processor';

const PORT = process.env.PORT ?? 8000;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  startEmailBatchProcessor();
});
