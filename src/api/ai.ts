import * as FileSystem from 'expo-file-system/legacy';
import { post } from './client';
import { ENDPOINTS } from '../constants/api';
import {
  AiHeadlineRequest,
  AiHeadlineResponse,
  AiExpandRequest,
  AiExpandResponse,
  AiTranscribeRequest,
  AiTranscribeResponse,
  AiLanguage,
} from '../types';
import { cleanSectionContent, cleanSectionTitle } from '../lib/contentSanitizer';

const FALLBACK_GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

function hasMalayalamScript(text: string): boolean {
  return /[\u0D00-\u0D7F]/.test(text);
}

function getLanguageRule(lang: AiLanguage): string {
  if (lang === 'malayalam') {
    return (
      'LANGUAGE RULE: You MUST write ALL output strictly in formal Malayalam (മലയാളം script). ' +
      'This includes BOTH the title and the body. ' +
      'Even if the input summary is in English, produce the output in Malayalam. ' +
      'Do NOT use English words or Latin script anywhere in the output.'
    );
  }
  return (
    'LANGUAGE RULE: You MUST write ALL output strictly in English. ' +
    'Even if the input contains Malayalam words, produce the output in English.'
  );
}

function extractJsonBlock(text: string): any {
  let cleaned = text.trim();
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }
  return JSON.parse(cleaned);
}

function stripSurroundingQuotes(str: string): string {
  let out = str.trim();
  for (const q of ['"', "'", '«', '»']) {
    if (out.startsWith(q) && out.endsWith(q)) {
      out = out.slice(1, -1).trim();
    }
  }
  return out;
}

function cleanTranscription(text: string): string {
  let cleaned = text.trim();
  for (const prefix of ['Transcript:', 'Transcription:', 'ട്രാൻസ്ക്രിപ്ഷൻ:', 'ട്രാൻസ്ക്രിപ്റ്റ്:']) {
    if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleaned = cleaned.slice(prefix.length).trim();
    }
  }
  return stripSurroundingQuotes(cleaned);
}

async function callGroqChat(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  temperature = 0.2,
  maxTokens = 1500
): Promise<string> {
  let lastError = '';
  for (const model of GROQ_CHAT_MODELS) {
    try {
      const response = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FALLBACK_GROQ_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        const content = (resData?.choices?.[0]?.message?.content || '').trim();
        if (content) return content;
      } else {
        const errJson = await response.json().catch(() => null);
        lastError = errJson?.error?.message || `AI request failed (${response.status})`;
      }
    } catch (e: any) {
      lastError = e?.message || lastError;
    }
  }
  throw new Error(lastError || 'All AI models failed to respond.');
}

export async function generateHeadline(
  data: AiHeadlineRequest
): Promise<AiHeadlineResponse> {
  const content = data.content.trim();
  const lang: AiLanguage = data.language || (hasMalayalamScript(content) ? 'malayalam' : 'malayalam');

  try {
    const res = await post<AiHeadlineResponse>(ENDPOINTS.ai.headline, {
      content,
      language: lang,
    });
    if (res?.headline && (lang !== 'malayalam' || hasMalayalamScript(res.headline))) {
      return { headline: cleanSectionTitle(res.headline) };
    }
  } catch (err) {
    // Fall through to direct AI generation
  }

  const langRule = getLanguageRule(lang);
  const systemPrompt =
    'You are a professional newspaper editor. Generate a short, punchy newspaper headline ' +
    'for the provided article body.\n\n' +
    `${langRule}\n\n` +
    'Rules:\n' +
    '1. Headline must be short and catchy (4–8 words).\n' +
    '2. Do not put quotes around the headline.\n' +
    '3. Output ONLY the raw headline text. No explanations.';

  const raw = await callGroqChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Article:\n${content}` },
    ],
    0.4,
    120
  );

  return { headline: cleanSectionTitle(stripSurroundingQuotes(raw)) };
}

export async function expandContent(
  data: AiExpandRequest
): Promise<AiExpandResponse> {
  const summary = data.summary.trim();
  const lang: AiLanguage = data.language || (hasMalayalamScript(summary) ? 'malayalam' : 'malayalam');
  const charLimit = data.character_limit || 2000;

  try {
    const res = await post<AiExpandResponse>(ENDPOINTS.ai.expand, {
      summary,
      character_limit: charLimit,
      language: lang,
      include_photo: Boolean(data.include_photo),
    });
    // If Malayalam was requested, verify the remote server actually returned Malayalam script
    if (
      res?.expanded_content &&
      (lang !== 'malayalam' || hasMalayalamScript(res.expanded_content))
    ) {
      return {
        ...res,
        expanded_content: cleanSectionContent(res.expanded_content),
        generated_title: cleanSectionTitle(res.generated_title, res.expanded_content),
        image_url: res.image_url || null,
        image_caption: res.image_caption || null,
      };
    }
  } catch (err) {
    // Fall through to direct AI expansion if remote server fails
  }

  const targetLen = Math.floor(charLimit * 0.92);
  const langRule = getLanguageRule(lang);
  const systemPrompt =
    "You are a professional newspaper editor. Expand the user's brief summary or bullet points " +
    'into a complete, high-quality newspaper article body, and generate a short punchy headline.\n\n' +
    `${langRule}\n\n` +
    'Return your output as a raw JSON object with exactly two keys:\n' +
    '- "title": A short, catchy newspaper headline (4–8 words, properly capitalised, no quotes).\n' +
    '- "body": The expanded article body.\n\n' +
    'Rules for the body:\n' +
    `1. MUST NOT exceed ${charLimit} characters (including spaces). ` +
    `Aim for approximately ${targetLen} characters to fill the column layout perfectly.\n` +
    '2. Do NOT include any headings, titles, or metadata inside the body field.\n' +
    '3. Do NOT include introductory phrases or markdown formatting.\n' +
    '4. Write in formal journalism style with standard paragraph separations (double line breaks).\n' +
    '5. STICK STRICTLY TO THE PROVIDED FACTS. Expand by adding background context and significance — ' +
    'do not fabricate specific names, dates, numbers, or locations.\n\n' +
    'Output ONLY the raw JSON object. No preamble, no post-explanation.';

  const rawText = await callGroqChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Expand this news summary:\n${summary}` },
    ],
    0.2,
    1500
  );

  let title = '';
  let body = '';
  try {
    const parsed = extractJsonBlock(rawText);
    title = stripSurroundingQuotes(String(parsed.title || ''));
    body = String(parsed.body || '').trim();
  } catch {
    body = rawText.trim();
  }

  body = cleanSectionContent(body);
  title = cleanSectionTitle(title, body);

  if (body.length > charLimit) {
    const trimmed = body.slice(0, charLimit);
    const lastEnd = Math.max(
      trimmed.lastIndexOf('.'),
      trimmed.lastIndexOf('!'),
      trimmed.lastIndexOf('?')
    );
    body = lastEnd !== -1 ? trimmed.slice(0, lastEnd + 1) : trimmed;
  }

  let imageUrl: string | null = null;
  let imageCaption: string | null = null;
  if (data.include_photo) {
    const photoRes = await searchAiNewsPhoto(title || summary, lang);
    if (photoRes) {
      imageUrl = photoRes.image_url;
      imageCaption = photoRes.image_caption;
    }
  }

  return {
    expanded_content: body,
    generated_title: title,
    image_url: imageUrl,
    image_caption: imageCaption,
  };
}

export async function searchAiNewsPhoto(
  topicOrHeadline: string,
  lang: AiLanguage = 'malayalam'
): Promise<{ image_url: string; image_caption: string } | null> {
  if (!topicOrHeadline || !topicOrHeadline.trim()) return null;

  try {
    let englishKeywords = topicOrHeadline.trim();
    if (hasMalayalamScript(englishKeywords) || englishKeywords.length > 40) {
      try {
        const rawKeywords = await callGroqChat(
          [
            {
              role: 'system',
              content:
                'Extract 2 to 3 concise English visual search keywords to find an authentic news photograph on Wikimedia. ' +
                'Output ONLY the 2-3 keywords, no quotes, no punctuation, no explanations.',
            },
            { role: 'user', content: topicOrHeadline.slice(0, 300) },
          ],
          0.1,
          40
        );
        if (rawKeywords && rawKeywords.trim()) {
          englishKeywords = rawKeywords.replace(/["'.!?:;\n\r]/g, ' ').trim();
        }
      } catch {}
    }

    const searchUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6` +
      `&gsrsearch=${encodeURIComponent(englishKeywords)}&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&format=json`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'NewsRushMobileApp/1.0 (newsrush@elementzit.com)',
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages;
      if (pages) {
        for (const key of Object.keys(pages)) {
          const info = pages[key]?.imageinfo?.[0];
          const url = info?.url || '';
          if (
            url &&
            (url.endsWith('.jpg') ||
              url.endsWith('.jpeg') ||
              url.endsWith('.png') ||
              url.includes('.jpg?') ||
              url.includes('.jpeg?') ||
              url.includes('.png?'))
          ) {
            const rawDesc =
              info.extmetadata?.ObjectName?.value ||
              info.extmetadata?.ImageDescription?.value ||
              englishKeywords;
            const cleanDesc = String(rawDesc)
              .replace(/<[^>]+>/g, '')
              .trim()
              .slice(0, 70);
            const caption =
              lang === 'malayalam'
                ? `ചിത്രം: ${cleanDesc || 'വാർത്താ ചിത്രം'}`
                : `Photo: ${cleanDesc || 'Press'}`;
            return {
              image_url: url,
              image_caption: caption,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('AI news photo search failed:', err);
  }

  // Curated news photo fallback if no specific match
  const fallbackImages: Record<string, string> = {
    metro: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
    sports: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80',
    kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
    general: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
  };
  const lower = topicOrHeadline.toLowerCase();
  let fallbackUrl = fallbackImages.kerala;
  if (lower.includes('metro') || lower.includes('മെട്രോ') || lower.includes('train')) fallbackUrl = fallbackImages.metro;
  else if (lower.includes('cricket') || lower.includes('sport') || lower.includes('സഞ്ജു') || lower.includes('കളി')) fallbackUrl = fallbackImages.sports;
  else if (lower.includes('school') || lower.includes('forest') || lower.includes('സ്കൂൾ')) fallbackUrl = fallbackImages.general;

  return {
    image_url: fallbackUrl,
    image_caption: lang === 'malayalam' ? 'ചിത്രം: ന്യൂസ് റഷ്' : 'Photo: NewsRush',
  };
}

export async function transcribeAudio(
  data: AiTranscribeRequest
): Promise<AiTranscribeResponse> {
  const lang: AiLanguage = data.language || 'malayalam';
  const mimeType = data.mime_type || 'audio/mp4';

  // 1. For Malayalam: Prefer the backend Gemini ASR first when audio_b64 is present!
  // Google Gemini has significantly higher accuracy for Malayalam than Whisper.
  if (lang === 'malayalam' && data.audio_b64) {
    try {
      const res = await post<AiTranscribeResponse>(ENDPOINTS.ai.transcribe, {
        audio_b64: data.audio_b64,
        mime_type: mimeType,
        language: lang,
      });
      if (res?.transcript && res.transcript.trim()) {
        const cleaned = cleanTranscription(res.transcript);
        if (cleaned) {
          return { transcript: cleaned };
        }
      }
    } catch (err: any) {
      console.warn('Backend Gemini ASR failed, falling back to direct Groq Whisper:', err?.message);
    }
  }

  // 2. Direct high-speed ASR via Groq Whisper Turbo
  if (data.audio_uri && FALLBACK_GROQ_KEY) {
    for (const modelName of ['whisper-large-v3', 'whisper-large-v3-turbo']) {
      try {
        const uploadResult = await FileSystem.uploadAsync(GROQ_TRANSCRIBE_URL, data.audio_uri, {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          mimeType: mimeType,
          headers: {
            Authorization: `Bearer ${FALLBACK_GROQ_KEY}`,
          },
          parameters: {
            model: modelName,
            language: lang === 'malayalam' ? 'ml' : 'en',
            response_format: 'json',
            temperature: '0',
            ...(lang === 'malayalam'
              ? { prompt: 'വാർത്ത, കേരളം, തിരുവനന്തപുരം, കൊച്ചി, കോഴിക്കോട്' }
              : {}),
          },
        });

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
          const result = JSON.parse(uploadResult.body);
          let transcript = String(result?.text || '').trim();
          if (transcript) {
            transcript = cleanTranscription(transcript);

            // For Malayalam: Polish and restore conjuncts, grammar, and typography
            if (lang === 'malayalam' && transcript) {
              try {
                const refined = await callGroqChat(
                  [
                    {
                      role: 'system',
                      content:
                        'You are a professional Malayalam newspaper editor. Clean and verify the following speech-to-text transcript.\n' +
                        'Rules:\n' +
                        '1. Output strictly in authentic Malayalam script (മലയാളം അക്ഷരങ്ങൾ).\n' +
                        '2. Fix any mangled Malayalam conjunct letters, broken characters, or Manglish/phonetic English words into correct Malayalam words.\n' +
                        '3. Maintain the exact spoken meaning and facts verbatim. Do NOT translate into English, answer questions, or add commentary.\n' +
                        '4. Output ONLY the clean Malayalam text.',
                    },
                    { role: 'user', content: transcript },
                  ],
                  0.1,
                  600
                );
                if (refined && hasMalayalamScript(refined)) {
                  transcript = stripSurroundingQuotes(refined);
                }
              } catch {}
            }

            return { transcript };
          }
        }
      } catch (e: any) {
        console.warn(`Direct Groq ${modelName} failed:`, e?.message);
      }
    }
  }

  // 3. Fallback: Backend `/api/ai/transcribe` endpoint (if not already tried above)
  if (data.audio_b64 && lang !== 'malayalam') {
    try {
      const res = await post<AiTranscribeResponse>(ENDPOINTS.ai.transcribe, {
        audio_b64: data.audio_b64,
        mime_type: mimeType,
        language: lang,
      });
      if (res?.transcript) {
        return { transcript: cleanTranscription(res.transcript) };
      }
    } catch (err: any) {
      console.warn('Backend transcription fallback failed:', err?.message);
    }
  }

  throw new Error(
    'Could not transcribe audio — the recording may be too short, silent, or unclear. Please try again.'
  );
}
