const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

class RedditScraper {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.antiFingerprint = options.antiFingerprint || true;
    this.headless = options.headless !== false;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  async initialize() {
    const launchOptions = {
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    };

    if (this.antiFingerprint) {
      launchOptions.args.push(
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images'
      );
    }

    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();

    if (this.antiFingerprint) {
      await this.setupAntiFingerprinting();
    }

    await this.page.setViewport({ width: 1366, height: 768 });
  }

  async setupAntiFingerprinting() {
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await this.page.setUserAgent(userAgent);

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      window.chrome = {
        runtime: {},
      };
      
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: () => Promise.resolve({ state: 'granted' }),
        }),
      });
    });

    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
  }

  async searchSubreddit(subreddit, keywords = [], options = {}) {
    const {
      type = 'hot',
      limit = 25,
      timeFilter = 'all'
    } = options;

    const url = `https://old.reddit.com/r/${subreddit}/${type}`;
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.randomDelay(1000, 3000);

      const posts = await this.scrapePosts(limit, keywords);
      return posts;
    } catch (error) {
      console.error(`Error scraping subreddit ${subreddit}:`, error.message);
      return [];
    }
  }

  async scrapePosts(limit, keywords = []) {
    const posts = [];
    let currentPage = 1;

    while (posts.length < limit) {
      try {
        const pagePosts = await this.parseCurrentPage(keywords);
        posts.push(...pagePosts);

        if (posts.length >= limit || pagePosts.length === 0) {
          break;
        }

        const hasNextPage = await this.goToNextPage();
        if (!hasNextPage) {
          break;
        }

        await this.randomDelay(2000, 5000);
        currentPage++;
      } catch (error) {
        console.error(`Error on page ${currentPage}:`, error.message);
        break;
      }
    }

    return posts.slice(0, limit);
  }

  async parseCurrentPage(keywords = []) {
    try {
      const elements = await this.page.$$('#siteTable > div[class*="thing"]');
      const posts = [];

      for (const element of elements) {
        try {
          const post = await this.extractPostData(element);
          
          if (keywords.length === 0 || this.matchesKeywords(post.title, keywords)) {
            posts.push(post);
          }
        } catch (error) {
          console.error('Error extracting post data:', error.message);
          continue;
        }
      }

      return posts;
    } catch (error) {
      console.error('Error parsing current page:', error.message);
      return [];
    }
  }

  async extractPostData(element) {
    const title = await element.$eval('p[class="title"] a', node => node.innerText.trim()).catch(() => '');
    const link = await element.$eval('p[class="title"] a', node => node.href).catch(() => '');
    const author = await element.$eval('p[class="tagline "] a[class*="author"]', node => node.innerText.trim()).catch(() => '');
    const score = await element.$eval('div[class*="score"]', node => node.innerText.trim()).catch(() => '0');
    const commentsText = await element.$eval('a[data-event-action="comments"]', node => node.innerText.trim()).catch(() => '0 comments');
    const postTime = await element.$eval('p[class="tagline "] time', node => node.getAttribute('title')).catch(() => '');
    const subreddit = await element.$eval('p[class="tagline "] a[class*="subreddit"]', node => node.innerText.trim()).catch(() => '');

    const commentsCount = parseInt(commentsText.match(/\d+/)?.[0] || '0');
    const postId = await element.evaluate(node => node.getAttribute('data-fullname')).catch(() => '');

    return {
      id: postId,
      title,
      link,
      author,
      score: parseInt(score) || 0,
      commentsCount,
      postTime,
      subreddit,
      commentsLink: link.includes('/comments/') ? link : `https://old.reddit.com${link}`
    };
  }

  async goToNextPage() {
    try {
      const nextButton = await this.page.$('span[class="next-button"] > a[rel="nofollow next"]');
      if (!nextButton) {
        return false;
      }

      await nextButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      return true;
    } catch (error) {
      console.error('Error going to next page:', error.message);
      return false;
    }
  }

  matchesKeywords(text, keywords) {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = RedditScraper;
