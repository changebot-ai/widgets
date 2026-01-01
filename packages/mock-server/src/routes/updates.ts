import { Router, Request, Response } from 'express';
import { mockStore } from '../data/store.js';

const router = Router();

// GET /updates - Returns widget + publications (matches production API)
router.get('/updates', async (req: Request, res: Response) => {
  const config = mockStore.getConfig();

  // Log request
  mockStore.logRequest({
    method: 'GET',
    path: '/updates',
  });

  // Apply configured delay
  if (config.responseDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.responseDelay));
  }

  // Check error mode
  if (config.errorMode === 'updates' || config.errorMode === 'all') {
    return res.status(500).json({ error: 'Simulated server error' });
  }

  const response = {
    widget: mockStore.getWidget(),
    publications: mockStore.getPublications(),
  };

  mockStore.logRequest({
    method: 'GET',
    path: '/updates',
    response: { publicationCount: response.publications.length },
  });

  res.json(response);
});

export default router;
