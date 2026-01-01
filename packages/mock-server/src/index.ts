import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import updatesRouter from './routes/updates.js';
import usersRouter from './routes/users.js';
import adminRouter from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3456;

// Middleware
app.use(cors());
app.use(express.json());

// Serve admin panel static files
app.use('/admin', express.static(path.join(__dirname, '../src/views')));

// Also serve from views folder when running with tsx
app.use('/admin', express.static(path.join(__dirname, 'views')));

// API routes (match production API structure)
app.use('/', updatesRouter); // /updates
app.use('/', usersRouter); // /users/:userId

// Admin API
app.use('/admin/api', adminRouter);

// Root redirect to admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Serve admin.html for /admin route
app.get('/admin', (req, res) => {
  // Try src/views first (when running with tsx), then ../src/views (when built)
  const viewsPath = path.join(__dirname, 'views', 'admin.html');
  const altViewsPath = path.join(__dirname, '../src/views', 'admin.html');

  res.sendFile(viewsPath, (err) => {
    if (err) {
      res.sendFile(altViewsPath);
    }
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔════════════════════════════════════════════════════╗');
  console.log('  ║                                                    ║');
  console.log('  ║   Changebot Mock Server                            ║');
  console.log('  ║                                                    ║');
  console.log(`  ║   Admin Panel: http://localhost:${PORT}/admin          ║`);
  console.log(`  ║   Widget URL:  http://localhost:${PORT}                ║`);
  console.log('  ║                                                    ║');
  console.log('  ╚════════════════════════════════════════════════════╝');
  console.log('');
});
