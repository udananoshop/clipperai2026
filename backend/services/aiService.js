const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AIService {
  async generateCaption(text, language = 'en', platform = 'youtube') {
    try {
      const prompt = `Generate a compelling ${platform} caption in ${language} for this content: "${text}". Make it engaging, SEO-optimized, and under 150 characters.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating caption:', error);
      throw new Error('Failed to generate caption');
    }
  }

  async analyzeTranscript(transcript) {
    try {
      const prompt = `Analyze this video transcript and provide insights on engagement potential, key themes, and emotional tone: "${transcript}". Keep response under 200 words.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      throw new Error('Failed to analyze transcript');
    }
  }

  async generateHashtags(content, platform = 'youtube', language = 'en') {
    try {
      const platformSpecific = {
        youtube: 'YouTube SEO hashtags',
        tiktok: 'TikTok trending hashtags',
        instagram: 'Instagram hashtags',
        facebook: 'Facebook hashtags'
      };

      const prompt = `Generate 10 relevant ${platformSpecific[platform]} in ${language} for this content: "${content}". Return as comma-separated list.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
      });

      return response.choices[0].message.content.trim().split(',').map(tag => tag.trim());
    } catch (error) {
      console.error('Error generating hashtags:', error);
      throw new Error('Failed to generate hashtags');
    }
  }
}

module.exports = new AIService();
