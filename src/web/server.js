const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const AccountManager = require('../accounts/AccountManager');
const ConversationGenerator = require('../ai/ConversationGenerator');

class WebServer {
  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.accountManager = new AccountManager();
    this.conversationGenerator = null;
    
    this.pendingComments = [];
    this.approvedComments = [];
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../../public')));
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });

    this.app.get('/api/status', async (req, res) => {
      const accountStats = this.accountManager.getAccountStats();
      res.json({
        accounts: accountStats,
        pendingComments: this.pendingComments.length,
        approvedComments: this.approvedComments.length,
        aiEnabled: !!this.conversationGenerator
      });
    });

    this.app.get('/api/accounts', async (req, res) => {
      const accounts = this.accountManager.getActiveAccounts().map(acc => ({
        id: acc.id,
        username: acc.username,
        status: acc.status,
        lastUsed: acc.lastUsed,
        commentsPosted: acc.commentsPosted
      }));
      res.json(accounts);
    });

    this.app.get('/api/pending-comments', (req, res) => {
      res.json(this.pendingComments);
    });

    this.app.post('/api/approve-comment/:id', (req, res) => {
      const commentId = req.params.id;
      const commentIndex = this.pendingComments.findIndex(c => c.id === commentId);
      
      if (commentIndex !== -1) {
        const comment = this.pendingComments.splice(commentIndex, 1)[0];
        comment.status = 'approved';
        comment.approvedAt = new Date().toISOString();
        this.approvedComments.push(comment);
        
        res.json({ success: true, message: 'Comment approved' });
      } else {
        res.status(404).json({ success: false, message: 'Comment not found' });
      }
    });

    this.app.post('/api/reject-comment/:id', (req, res) => {
      const commentId = req.params.id;
      const commentIndex = this.pendingComments.findIndex(c => c.id === commentId);
      
      if (commentIndex !== -1) {
        this.pendingComments.splice(commentIndex, 1);
        res.json({ success: true, message: 'Comment rejected' });
      } else {
        res.status(404).json({ success: false, message: 'Comment not found' });
      }
    });

    this.app.post('/api/generate-comment', async (req, res) => {
      const { postUrl, postTitle, subreddit, style } = req.body;
      
      if (!this.conversationGenerator) {
        return res.status(400).json({ success: false, message: 'AI not configured' });
      }

      try {
        const post = { title: postTitle, subreddit, link: postUrl };
        const result = await this.conversationGenerator.generateComment(post, style);
        
        if (result) {
          const commentData = {
            id: Date.now().toString(),
            post: post,
            comment: result.comment,
            style: result.style,
            confidence: result.confidence,
            createdAt: new Date().toISOString(),
            status: 'pending'
          };
          
          this.pendingComments.push(commentData);
          res.json({ success: true, comment: commentData });
        } else {
          res.status(500).json({ success: false, message: 'Failed to generate comment' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    this.app.post('/api/add-account', async (req, res) => {
      try {
        const account = await this.accountManager.addAccount(req.body);
        res.json({ success: true, account: {
          id: account.id,
          username: account.username,
          status: account.status
        }});
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  }

  async initialize() {
    await this.accountManager.initialize();
    
    if (process.env.OPENAI_API_KEY) {
      this.conversationGenerator = new ConversationGenerator(process.env.OPENAI_API_KEY);
    }
  }

  addPendingComment(commentData) {
    this.pendingComments.push({
      id: Date.now().toString(),
      ...commentData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
  }

  getApprovedComments() {
    return this.approvedComments.filter(c => c.status === 'approved');
  }

  clearApprovedComment(commentId) {
    this.approvedComments = this.approvedComments.filter(c => c.id !== commentId);
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Web interface running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = WebServer;
