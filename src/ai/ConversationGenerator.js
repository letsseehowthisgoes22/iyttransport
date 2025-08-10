const OpenAI = require('openai');

class ConversationGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    
    this.retatrutideContext = `
Retatrutide is a novel triple agonist medication being developed for weight management and diabetes treatment. 
It targets GLP-1, GIP, and glucagon receptors. Key points:
- Currently in clinical trials (Phase 3)
- Shows promising results for significant weight loss
- May be more effective than current GLP-1 medications like semaglutide
- Being developed by Eli Lilly
- Not yet FDA approved
- Potential side effects similar to other GLP-1 medications
- May help with both weight loss and blood sugar control
`;

    this.conversationStyles = [
      'curious_researcher',
      'experienced_patient',
      'healthcare_professional',
      'concerned_family_member',
      'fitness_enthusiast'
    ];
  }

  async generateComment(post, style = null) {
    const selectedStyle = style || this.getRandomStyle();
    const prompt = this.buildPrompt(post, selectedStyle);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(selectedStyle)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.8
      });

      return {
        comment: response.choices[0].message.content.trim(),
        style: selectedStyle,
        confidence: this.calculateConfidence(post, response.choices[0].message.content)
      };
    } catch (error) {
      console.error('Error generating comment:', error.message);
      return null;
    }
  }

  getRandomStyle() {
    return this.conversationStyles[Math.floor(Math.random() * this.conversationStyles.length)];
  }

  getSystemPrompt(style) {
    const basePrompt = `You are participating in a Reddit discussion about weight loss, diabetes, or related health topics. Your goal is to naturally bring up retatrutide when relevant. ${this.retatrutideContext}`;

    const stylePrompts = {
      curious_researcher: `${basePrompt} You are someone who researches new medical treatments and is genuinely curious about emerging therapies. Be inquisitive and share interesting findings.`,
      
      experienced_patient: `${basePrompt} You are someone who has experience with weight loss medications or diabetes treatments. Share personal insights while being helpful to others.`,
      
      healthcare_professional: `${basePrompt} You are a healthcare professional who stays updated on new treatments. Provide informative, evidence-based responses while being professional.`,
      
      concerned_family_member: `${basePrompt} You are someone whose family member is dealing with weight or diabetes issues. You research treatments to help them and share what you learn.`,
      
      fitness_enthusiast: `${basePrompt} You are interested in health and fitness, including medical advances that could help people achieve their health goals. Be encouraging and supportive.`
    };

    return stylePrompts[style] || stylePrompts.curious_researcher;
  }

  buildPrompt(post, style) {
    return `
Post Title: "${post.title}"
Subreddit: ${post.subreddit}
Author: ${post.author}

Write a natural, helpful comment that relates to this post. If the post is about weight loss, diabetes, GLP-1 medications, or similar topics, naturally mention retatrutide and its potential benefits. If the post isn't directly related, find a way to naturally steer the conversation toward relevant health topics where retatrutide might be mentioned.

Keep the comment:
- Natural and conversational
- Helpful and informative
- Not overly promotional
- Appropriate for the subreddit context
- 1-3 paragraphs maximum
- Engaging and likely to start discussion

Style: ${style}
`;
  }

  calculateConfidence(post, comment) {
    let confidence = 0.5;

    const relevantKeywords = [
      'weight loss', 'diabetes', 'glp-1', 'semaglutide', 'ozempic', 'wegovy',
      'tirzepatide', 'mounjaro', 'obesity', 'blood sugar', 'insulin'
    ];

    const postText = (post.title + ' ' + (post.content || '')).toLowerCase();
    const matchingKeywords = relevantKeywords.filter(keyword => 
      postText.includes(keyword.toLowerCase())
    );

    confidence += matchingKeywords.length * 0.1;

    if (comment.toLowerCase().includes('retatrutide')) {
      confidence += 0.2;
    }

    if (comment.length > 50 && comment.length < 500) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  async generateConversationStarter(subreddit, topic = 'retatrutide') {
    const prompt = `
Create a natural, engaging Reddit post for r/${subreddit} that would start a discussion about ${topic}. 
The post should:
- Be appropriate for the subreddit
- Ask a genuine question or share interesting information
- Encourage discussion and responses
- Not be overly promotional
- Follow Reddit etiquette

Include both a title and post content.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an experienced Reddit user who knows how to create engaging posts that start meaningful discussions. ${this.retatrutideContext}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.8
      });

      const content = response.choices[0].message.content.trim();
      const lines = content.split('\n').filter(line => line.trim());
      
      return {
        title: lines[0].replace(/^(Title:|Post Title:)\s*/i, ''),
        content: lines.slice(1).join('\n').replace(/^(Content:|Post Content:)\s*/i, ''),
        subreddit: subreddit
      };
    } catch (error) {
      console.error('Error generating conversation starter:', error.message);
      return null;
    }
  }
}

module.exports = ConversationGenerator;
