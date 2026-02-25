import 'dotenv/config';
import { app } from './app';

const PORT = process.env.PORT ?? 8000;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
