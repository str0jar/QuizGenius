export const QUESTION_COUNTS = [3, 5, 10] as const;
export type QuestionCount = (typeof QUESTION_COUNTS)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Ľahká',
  medium: 'Stredná',
  hard: 'Ťažká',
};

export const DEFAULT_COUNT: QuestionCount = 5;
export const DEFAULT_DIFFICULTY: Difficulty = 'medium';
export const MIN_TEXT_LENGTH = 50;
export const MAX_TEXT_LENGTH = 20000;

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface QuizData {
  title: string;
  description: string;
  questions: Question[];
  meta?: { difficulty?: Difficulty };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Overí a zjednotí kvíz uložený v DB / vrátený z AI.
 * Starší kvízy majú `correctAnswer` namiesto `correctOptionIndex` – tu sa preklopia.
 * Vráti null, ak je štruktúra poškodená.
 */
export function normalizeQuiz(raw: unknown): QuizData | null {
  if (!isRecord(raw) || !Array.isArray(raw.questions)) return null;

  const questions: Question[] = [];
  for (let i = 0; i < raw.questions.length; i++) {
    const item: unknown = raw.questions[i];
    if (!isRecord(item)) return null;

    const correct = item.correctOptionIndex ?? item.correctAnswer; // legacy: correctAnswer
    const { question, options, explanation } = item;

    if (typeof question !== 'string' || !question.trim()) return null;
    if (!Array.isArray(options) || options.length !== 4 || !options.every((o) => typeof o === 'string')) return null;
    if (typeof correct !== 'number' || !Number.isInteger(correct) || correct < 0 || correct > 3) return null;

    questions.push({
      id: String(item.id ?? i + 1),
      question,
      options: options as string[],
      correctOptionIndex: correct,
      explanation: typeof explanation === 'string' ? explanation : '',
    });
  }
  if (questions.length === 0) return null;

  const rawDifficulty = isRecord(raw.meta) ? raw.meta.difficulty : undefined;
  const difficulty = (DIFFICULTIES as readonly unknown[]).includes(rawDifficulty)
    ? (rawDifficulty as Difficulty)
    : undefined;

  return {
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Kvíz',
    description: typeof raw.description === 'string' ? raw.description : '',
    questions,
    meta: difficulty ? { difficulty } : undefined,
  };
}
