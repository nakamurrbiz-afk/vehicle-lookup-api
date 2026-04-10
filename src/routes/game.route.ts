import { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';

// ── Rate limiting (in-memory, resets on cold start) ──────────────────────────
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 8_000; // 8 seconds between requests per IP

function isRateLimited(ip: string): boolean {
  const last = rateLimitMap.get(ip) ?? 0;
  if (Date.now() - last < RATE_LIMIT_MS) return true;
  rateLimitMap.set(ip, Date.now());
  return false;
}

// ── Game types ────────────────────────────────────────────────────────────────
export type GameType = 'riddle' | 'trivia' | 'word';

interface GameRequest {
  plate: string;
  make?: string;
  model?: string;
  year?: number;
  gameType: GameType;
  language: 'en' | 'ja';
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(body: GameRequest): string {
  const { plate, make, model, year, gameType, language } = body;
  const isJP = language === 'ja';
  const vehicle = [make, model, year].filter(Boolean).join(' ') || 'unknown vehicle';

  if (gameType === 'riddle') {
    return isJP
      ? `ナンバープレート「${plate}」と車「${vehicle}」をテーマにした面白いなぞなぞを1つ作ってください。必ず以下のJSON形式のみで返答してください（他のテキスト不要）:\n{"question":"なぞなぞの文","answer":"答え","hint":"ヒント"}`
      : `Create a fun riddle themed around license plate "${plate}" and a ${vehicle}. Reply ONLY with this JSON (no other text):\n{"question":"the riddle","answer":"the answer","hint":"a hint"}`;
  }

  if (gameType === 'trivia') {
    return isJP
      ? `${vehicle}（ナンバー: ${plate}）についての4択クイズを1問作ってください。必ず以下のJSON形式のみで返答してください（他のテキスト不要）:\n{"question":"問題文","options":["A. 選択肢1","B. 選択肢2","C. 選択肢3","D. 選択肢4"],"answer":"A","explanation":"解説文"}`
      : `Create a 4-choice trivia question about a ${vehicle} (plate: ${plate}). Reply ONLY with this JSON (no other text):\n{"question":"the question","options":["A. option1","B. option2","C. option3","D. option4"],"answer":"A","explanation":"brief explanation"}`;
  }

  // word association
  return isJP
    ? `ナンバープレート「${plate}」の文字や数字から連想できるものをテーマにした3ヒントクイズを作ってください。必ず以下のJSON形式のみで返答してください（他のテキスト不要）:\n{"theme":"お題（答え）","hints":["ヒント1（簡単すぎない）","ヒント2（少しヒント）","ヒント3（ほぼ答え）"]}`
    : `Create a 3-hint word association quiz inspired by the characters in license plate "${plate}". Reply ONLY with this JSON (no other text):\n{"theme":"the answer word","hints":["vague hint","medium hint","obvious hint"]}`;
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function gameRoute(app: FastifyInstance) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  app.post<{ Body: GameRequest }>('/game', {
    schema: {
      body: {
        type: 'object',
        required: ['plate', 'gameType', 'language'],
        properties: {
          plate:    { type: 'string', maxLength: 20 },
          make:     { type: 'string', maxLength: 60 },
          model:    { type: 'string', maxLength: 60 },
          year:     { type: 'number' },
          gameType: { type: 'string', enum: ['riddle', 'trivia', 'word'] },
          language: { type: 'string', enum: ['en', 'ja'] },
        },
      },
    },
  }, async (request, reply) => {
    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
      ?? request.ip
      ?? 'unknown';

    if (isRateLimited(ip)) {
      return reply.status(429).send({ error: 'Too many requests. Please wait a moment.' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return reply.status(503).send({ error: 'AI game service not configured.' });
    }

    const prompt = buildPrompt(request.body);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return reply.status(502).send({ error: 'Invalid response from AI.' });
    }

    const game = JSON.parse(match[0]);
    return reply.send({ gameType: request.body.gameType, game });
  });
}
