# Reddit Bot System

A multi-account Reddit bot system for natural conversations about retatrutide using web scraping with anti-fingerprinting measures.

## Features

- **Multi-Account Management**: Manage multiple Reddit accounts for natural conversations
- **Web Scraping**: Uses Puppeteer for headless web scraping (no Reddit API)
- **Anti-Fingerprinting**: Advanced measures to avoid detection
- **Manual Approval**: Web interface for approving comments before posting
- **AI-Powered Conversations**: Natural responses about retatrutide using OpenAI
- **Keyword Targeting**: Finds relevant posts about retatrutide and related topics
- **Conversation Starter**: Can initiate conversations on specific posts

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file and configure:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`

4. Configure Reddit accounts in `./data/accounts.json`

5. Start the system:
```bash
npm start
```

6. Access the control interface at `http://localhost:3000`

## Usage

### Web Interface
- View pending comments for approval
- Approve/reject comments before posting
- Monitor account status and activity
- Start conversations on specific posts

### Configuration
- `./data/accounts.json` - Reddit account credentials
- `./data/config.json` - Bot behavior settings
- `./data/keywords.json` - Target keywords and phrases

## Anti-Fingerprinting Features

- Randomized user agents
- Proxy rotation support
- Random delays between actions
- Browser fingerprint randomization
- Headless mode with stealth plugins

## Safety Features

- Manual approval for all comments
- Rate limiting to avoid detection
- Account rotation
- Error handling and recovery
- Logging and monitoring
