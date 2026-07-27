import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { scrapingService } from '../services/scraping.service';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, message: 'URL is required' });
      return;
    }

    const data = await scrapingService.scrapeCompetition(url);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Scraping failed' });
  }
});

export default router;
