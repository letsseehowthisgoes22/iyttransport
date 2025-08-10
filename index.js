require('dotenv').config();
const RedditScraper = require('./src/scrapers/RedditScraper');
const AccountManager = require('./src/accounts/AccountManager');
const ConversationGenerator = require('./src/ai/ConversationGenerator');
const WebServer = require('./src/web/server');

class RedditBotSystem {
  constructor() {
    this.scraper = null;
    this.accountManager = new AccountManager();
    this.conversationGenerator = null;
    this.webServer = new WebServer(process.env.WEB_INTERFACE_PORT || 3000);
    this.isRunning = false;
    
    this.targetKeywords = [
      'retatrutide',
      'weight loss',
      'diabetes',
      'glp-1',
      'semaglutide',
      'ozempic',
      'wegovy',
      'tirzepatide',
      'mounjaro',
      'obesity'
    ];
    
    this.targetSubreddits = [
      'loseit',
      'diabetes',
      'keto',
      'intermittentfasting',
      'progresspics',
      '1200isplenty',
      'fitness',
      'WeightLossAdvice',
      'diabetes_t2',
      'SuperMorbidlyObese'
    ];
  }

  async initialize() {
    console.log('🚀 Initializing Reddit Bot System...');
    
    try {
      await this.accountManager.initialize();
      console.log('✅ Account manager initialized');
      
      if (process.env.OPENAI_API_KEY) {
        this.conversationGenerator = new ConversationGenerator(process.env.OPENAI_API_KEY);
        console.log('✅ AI conversation generator initialized');
      } else {
        console.log('⚠️  OpenAI API key not provided - AI features disabled');
      }
      
      await this.webServer.initialize();
      console.log('✅ Web server initialized');
      
      this.scraper = new RedditScraper({
        headless: process.env.HEADLESS_MODE !== 'false',
        antiFingerprint: process.env.ANTI_FINGERPRINT_MODE !== 'false'
      });
      
      console.log('✅ Reddit Bot System initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Reddit Bot System:', error.message);
      return false;
    }
  }

  async start() {
    if (!await this.initialize()) {
      process.exit(1);
    }
    
    console.log('🌐 Starting web interface...');
    await this.webServer.start();
    
    this.isRunning = true;
    console.log('🎯 Reddit Bot System is running!');
    console.log(`📱 Control interface: http://localhost:${process.env.WEB_INTERFACE_PORT || 3000}`);
    
    this.startMonitoring();
  }

  async startMonitoring() {
    console.log('👀 Starting monitoring for relevant posts...');
    
    while (this.isRunning) {
      try {
        await this.monitorSubreddits();
        await this.processApprovedComments();
        
        await this.sleep(5 * 60 * 1000);
      } catch (error) {
        console.error('❌ Error in monitoring loop:', error.message);
        await this.sleep(30 * 1000); // Wait 30 seconds before retrying
      }
    }
  }

  async monitorSubreddits() {
    if (!this.conversationGenerator) {
      return; // Skip if AI is not available
    }

    console.log('🔍 Monitoring subreddits for relevant posts...');
    
    for (const subreddit of this.targetSubreddits) {
      try {
        await this.scraper.initialize();
        
        const posts = await this.scraper.searchSubreddit(subreddit, this.targetKeywords, {
          type: 'new',
          limit: 10
        });
        
        console.log(`📋 Found ${posts.length} relevant posts in r/${subreddit}`);
        
        for (const post of posts) {
          if (this.shouldGenerateComment(post)) {
            await this.generateAndQueueComment(post);
          }
        }
        
        await this.scraper.close();
        await this.sleep(2000); // Wait between subreddits
      } catch (error) {
        console.error(`❌ Error monitoring r/${subreddit}:`, error.message);
      }
    }
  }

  shouldGenerateComment(post) {
    const postDate = new Date(post.postTime);
    const now = new Date();
    const hoursDiff = (now - postDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return false;
    }
    
    if (post.commentsCount > 50) {
      return false;
    }
    
    if (post.score < 5) {
      return false;
    }
    
    return true;
  }

  async generateAndQueueComment(post) {
    try {
      const result = await this.conversationGenerator.generateComment(post);
      
      if (result && result.confidence > 0.6) {
        this.webServer.addPendingComment({
          post: post,
          comment: result.comment,
          style: result.style,
          confidence: result.confidence
        });
        
        console.log(`💬 Generated comment for: "${post.title}" (confidence: ${Math.round(result.confidence * 100)}%)`);
      }
    } catch (error) {
      console.error('❌ Error generating comment:', error.message);
    }
  }

  async processApprovedComments() {
    const approvedComments = this.webServer.getApprovedComments();
    
    if (approvedComments.length === 0) {
      return;
    }
    
    console.log(`📝 Processing ${approvedComments.length} approved comments...`);
    
    for (const commentData of approvedComments) {
      try {
        const account = this.accountManager.getNextAccount();
        
        if (!account) {
          console.log('⚠️  No active accounts available');
          break;
        }
        
        const success = await this.postComment(commentData, account);
        
        if (success) {
          await this.accountManager.updateAccountUsage(account.id);
          this.webServer.clearApprovedComment(commentData.id);
          console.log(`✅ Posted comment using account: ${account.username}`);
          
          await this.sleep(30000 + Math.random() * 30000); // 30-60 seconds
        } else {
          console.log(`❌ Failed to post comment using account: ${account.username}`);
        }
      } catch (error) {
        console.error('❌ Error processing approved comment:', error.message);
      }
    }
  }

  async postComment(commentData, account) {
    console.log(`🎭 Simulating comment post for account: ${account.username}`);
    console.log(`📍 Post: ${commentData.post.title}`);
    console.log(`💬 Comment: ${commentData.comment.substring(0, 100)}...`);
    
    await this.sleep(2000 + Math.random() * 3000);
    
    return true;
  }

  async testScraping() {
    console.log('🧪 Testing Reddit scraping functionality...');
    
    try {
      this.scraper = new RedditScraper({
        headless: process.env.HEADLESS_MODE !== 'false',
        antiFingerprint: process.env.ANTI_FINGERPRINT_MODE !== 'false'
      });
      
      await this.scraper.initialize();
      
      const posts = await this.scraper.searchSubreddit('loseit', ['weight loss'], {
        type: 'hot',
        limit: 5
      });
      
      console.log(`✅ Successfully scraped ${posts.length} posts from r/loseit`);
      posts.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title} (${post.score} points, ${post.commentsCount} comments)`);
      });
      
      await this.scraper.close();
      return true;
    } catch (error) {
      console.error('❌ Scraping test failed:', error.message);
      return false;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    console.log('🛑 Stopping Reddit Bot System...');
    this.isRunning = false;
    
    if (this.scraper) {
      await this.scraper.close();
    }
    
    if (this.webServer) {
      this.webServer.stop();
    }
    
    console.log('✅ Reddit Bot System stopped');
  }
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  if (global.botSystem) {
    await global.botSystem.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  if (global.botSystem) {
    await global.botSystem.stop();
  }
  process.exit(0);
});

async function main() {
  const botSystem = new RedditBotSystem();
  global.botSystem = botSystem;
  
  if (process.argv.includes('--test')) {
    console.log('🧪 Running in test mode...');
    const success = await botSystem.testScraping();
    process.exit(success ? 0 : 1);
  }
  
  await botSystem.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = RedditBotSystem;
