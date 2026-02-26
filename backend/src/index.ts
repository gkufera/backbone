import 'dotenv/config';
import { app } from './app';
import {
  startEmailBatchProcessor,
  stopEmailBatchProcessor,
} from './services/email-batch-processor';

const PORT = process.env.PORT ?? 8000;

const server = app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  startEmailBatchProcessor();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopEmailBatchProcessor();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
