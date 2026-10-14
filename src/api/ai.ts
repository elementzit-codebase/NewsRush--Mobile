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

const FALLBACK_GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_MODEL = 'qwen/qwen3.8-27b';

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

async function callGroqChat(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  temperature = 0.2,
  maxTokens = 1500
): Promise<string> {
  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FALLBACK_GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    let detail = `AI request failed (${response.status})`;
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || detail;
    } catch {}
    throw new Error(detail);
  }

  const resData = await response.json();
  return (resData?.choices?.[0]?.message?.content || '').trim();
}

export async function generateHeadline(
  data: AiHeadlineRequest
): Promise<AiHeadlineResponse> {
  const lang: AiLanguage = data.language || 'english';
  const content = data.content.trim();

  try {
    const res = await post<AiHeadlineResponse>(ENDPOINTS.ai.headline, {
      content,
      language: lang,
    });
    // If Malayalam was requested, ensure the server didn't ignore `language` (older deployment)
    if (res?.headline && (lang !== 'malayalam' || hasMalayalamScript(res.headline))) {
      return res;
    }
  } catch (err) {
    // Fall through to direct AI generation if the remote server fails or isn't updated
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

  return { headline: stripSurroundingQuotes(raw) };
}

export async function expandContent(
  data: AiExpandRequest
): Promise<AiExpandResponse> {
  const lang: AiLanguage = data.language || 'english';
  const charLimit = data.character_limit || 2000;
  const summary = data.summary.trim();

  try {
    const res = await post<AiExpandResponse>(ENDPOINTS.ai.expand, {
      summary,
      character_limit: charLimit,
      language: lang,
    });
    // If Malayalam was requested, verify the remote server actually returned Malayalam script
    if (
      res?.expanded_content &&
      (lang !== 'malayalam' || hasMalayalamScript(res.expanded_content))
    ) {
      return res;
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

  if (body.length > charLimit) {
    const trimmed = body.slice(0, charLimit);
    const lastEnd = Math.max(
      trimmed.lastIndexOf('.'),
      trimmed.lastIndexOf('!'),
      trimmed.lastIndexOf('?')
    );
    body = lastEnd !== -1 ? trimmed.slice(0, lastEnd + 1) : trimmed;
  }

  return {
    expanded_content: body,
    generated_title: title,
  };
}

export async function transcribeAudio(
  data: AiTranscribeRequest
): Promise<AiTranscribeResponse> {
  const lang: AiLanguage = data.language || 'english';
  const mimeType = data.mime_type || 'audio/mp4';

  // 1. Try the backend `/api/ai/transcribe` endpoint first
  if (data.audio_b64) {
    try {
      const res = await post<AiTranscribeResponse>(ENDPOINTS.ai.transcribe, {
        audio_b64: data.audio_b64,
        mime_type: mimeType,
        language: lang,
      });
      if (res?.transcript) {
        return res;
      }
    } catch (err: any) {
      // If the remote server hasn't deployed `/api/ai/transcribe` yet (404 Not Found)
      // or GEMINI_API_KEY is missing on the server, fall through to Whisper ASR fallback
      if (!data.audio_uri) {
        throw err;
      }
    }
  }

  // 2. Fallback: Direct ASR transcription via Whisper Large V3
  if (!data.audio_uri) {
    throw new Error('No audio recording URI available for transcription.');
  }

  let transcript = '';
  let lastError = 'Could not transcribe audio. Please try again.';

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
            ? { prompt: 'മലയാളം വാർത്താ റിപ്പോർട്ട്. സംസാരിക്കുന്ന വാക്കുകൾ മലയാളം ലിപിയിൽ മാത്രം കൃത്യമായി രേഖപ്പെടുത്തുക.' }
            : {}),
        },
      });

      if (uploadResult.status >= 200 && uploadResult.status < 300) {
        const result = JSON.parse(uploadResult.body);
        transcript = String(result?.text || '').trim();
        if (transcript) break;
      } else {
        try {
          const errJson = JSON.parse(uploadResult.body);
          lastError = errJson?.error?.message || `Transcription failed (${uploadResult.status})`;
        } catch {
          lastError = `Transcription failed (${uploadResult.status})`;
        }
      }
    } catch (e: any) {
      lastError = e?.message || lastError;
    }
  }

  if (!transcript) {
    throw new Error(
      lastError ||
        'Could not transcribe audio — the recording may be too short, silent, or unclear. Please try again.'
    );
  }

  // Strip any prefixes
  for (const prefix of ['Transcript:', 'Transcription:', 'ട്രാൻസ്ക്രിപ്ഷൻ:', 'ട്രാൻസ്ക്രിപ്റ്റ്:']) {
    if (transcript.toLowerCase().startsWith(prefix.toLowerCase())) {
      transcript = transcript.slice(prefix.length).trim();
    }
  }
  transcript = stripSurroundingQuotes(transcript);

  // If Malayalam was selected and Whisper returned transliterated Latin text, convert to Malayalam script
  if (lang === 'malayalam' && !hasMalayalamScript(transcript)) {
    try {
      const converted = await callGroqChat(
        [
          {
            role: 'system',
            content:
              'You are a Malayalam script converter. Convert the user input verbatim into authentic Malayalam script (മലയാളം അക്ഷരങ്ങൾ). ' +
              'Do NOT answer questions or add commentary. Output ONLY the Malayalam script text.',
          },
          { role: 'user', content: transcript },
        ],
        0.1,
        512
      );
      if (converted && hasMalayalamScript(converted)) {
        transcript = stripSurroundingQuotes(converted);
      }
    } catch {}
  }

  return { transcript };
}
