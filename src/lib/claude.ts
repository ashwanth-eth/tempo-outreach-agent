/**
 * Claude API client for profile extraction and email drafting
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import type { Profile, AgentConfig } from '../types/profile.js';

const client = new Anthropic();

/**
 * Extract profile data from a LinkedIn screenshot
 */
export async function extractProfile(imagePath: string): Promise<Profile> {
  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // Determine media type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mediaType = ext === '.png' ? 'image/png' :
                    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                    ext === '.webp' ? 'image/webp' : 'image/png';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Extract the LinkedIn profile information from this screenshot. Return ONLY a JSON object with these fields:
- name: Full name
- company: Current company name
- role: Current job title
- headline: LinkedIn headline (if visible)
- location: Location (if visible)
- about: Brief summary or about section (if visible)

If a field is not visible, omit it. Return ONLY the JSON object, no other text.`,
          },
        ],
      },
    ],
  });

  // Parse the response
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    // Extract JSON from the response (handle potential markdown code blocks)
    let jsonStr = content.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    return JSON.parse(jsonStr) as Profile;
  } catch (e) {
    throw new Error(`Failed to parse profile JSON: ${content.text}`);
  }
}

/**
 * Draft a personalized cold email based on profile data
 */
export async function draftEmail(profile: Profile, config: AgentConfig): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Write a personalized cold outreach email for the following person:

**Target Profile:**
- Name: ${profile.name}
- Role: ${profile.role}
- Company: ${profile.company}
${profile.headline ? `- Headline: ${profile.headline}` : ''}
${profile.about ? `- About: ${profile.about}` : ''}

**Sender Context:**
- Name: ${config.senderName}
- Context: ${config.senderContext}
- Purpose: ${config.outreachPurpose}

**Instructions:**
1. Keep it under 150 words
2. Be genuine and specific — reference something about their role or company
3. Have a clear, low-friction ask (e.g., "Would you be open to a 15-minute call?")
4. No fake flattery or generic templates
5. Professional but warm tone

Return ONLY the email body (no subject line, no signature). Start with the greeting.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text.trim();
}
