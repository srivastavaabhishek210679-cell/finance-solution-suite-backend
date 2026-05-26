import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const aiController = {
  generateNarrative: async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ status: 'error', message: 'Prompt is required' });
    }
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = message.content?.[0]?.type === 'text' ? message.content[0].text : '';
    res.json({ status: 'success', data: { narrative: text } });
  }
};
