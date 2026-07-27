import * as cheerio from 'cheerio';
import axios from 'axios';

export interface ScrapedCompetitionResult {
  name?: string;
  organizer?: string;
  description?: string;
  prize?: string;
  timeline?: string;
  requirements?: string;
  eligibility?: string;
  venue?: string;
  website?: string;
  deadline?: string;
  rounds?: string[];
}

export class ScrapingService {
  async scrapeCompetition(url: string): Promise<ScrapedCompetitionResult> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().trim() ||
        $('h1').first().text().trim();

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('p').first().text().trim();

      const organizer =
        $('[class*="organizer"]').text().trim() ||
        $('[class*="author"]').text().trim() ||
        $('meta[property="og:site_name"]').attr('content') ||
        '';

      const prizeText =
        $('[class*="prize"]').text().trim() ||
        $('[class*="reward"]').text().trim() ||
        '';

      const eligibility =
        $('[class*="eligibility"]').text().trim() ||
        $('[class*="criteria"]').text().trim() ||
        '';

      const timeline =
        $('[class*="timeline"]').text().trim() ||
        $('[class*="schedule"]').text().trim() ||
        '';

      const rounds: string[] = [];
      $('[class*="round"], [class*="stage"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 100) rounds.push(text);
      });

      return {
        name: title,
        organizer,
        description,
        prize: prizeText,
        eligibility,
        timeline,
        website: url,
        rounds: rounds.length > 0 ? rounds.slice(0, 5) : ['Round 1: Registration', 'Round 2: Evaluation'],
      };
    } catch (error: any) {
      console.error('[Scraper Error]', error.message);
      // Fallback response parsing domain if direct scrape fails
      const parsedUrl = new URL(url);
      const domainName = parsedUrl.hostname.replace('www.', '').split('.')[0];
      const capitalized = domainName.charAt(0).toUpperCase() + domainName.slice(1);

      return {
        name: `${capitalized} Business Challenge`,
        organizer: capitalized,
        description: `Imported competition details from ${url}`,
        website: url,
        prize: 'TBD',
        rounds: ['Stage 1: Proposal Submission', 'Stage 2: Pitch Deck', 'Stage 3: Finals'],
      };
    }
  }
}

export const scrapingService = new ScrapingService();
