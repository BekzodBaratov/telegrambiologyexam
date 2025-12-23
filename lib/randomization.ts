import { generateSecureRandomSeed } from "@/lib/security"

// Seeded random number generator for deterministic randomization
// Uses cryptographically secure seed stored in database

export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  // Linear congruential generator
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }

  // Fisher-Yates shuffle with seeded random
  shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }
}

interface Question {
  id: number
  question_type_code: string
  group_id: number | null
  order_in_group: number | null
  options: Record<string, string> | null
}

interface RandomizationResult {
  questionOrder: number[]
  optionOrders: Record<number, string[]>
  seed: number
}

export function generateRandomization(questions: Question[], attemptId?: number): RandomizationResult {
  // Use cryptographically secure seed instead of predictable attemptId
  const seed = generateSecureRandomSeed()
  const rng = new SeededRandom(seed)

  // Separate questions by type
  const y1Questions: Question[] = []
  const y2Groups: Map<number, Question[]> = new Map()
  const o1Questions: Question[] = []
  const o2Questions: Question[] = []

  for (const q of questions) {
    const typeCode = q.question_type_code

    if (typeCode === "Y1") {
      y1Questions.push(q)
    } else if (typeCode === "Y2") {
      if (q.group_id !== null) {
        if (!y2Groups.has(q.group_id)) {
          y2Groups.set(q.group_id, [])
        }
        y2Groups.get(q.group_id)!.push(q)
      }
    } else if (typeCode === "O1") {
      o1Questions.push(q)
    } else if (typeCode === "O2") {
      o2Questions.push(q)
    }
  }

  // Shuffle Y1 questions
  const shuffledY1 = rng.shuffle(y1Questions)

  // Shuffle Y2 groups (not sub-questions within groups)
  const groupIds = Array.from(y2Groups.keys())
  const shuffledGroupIds = rng.shuffle(groupIds)

  // Shuffle O1 questions
  const shuffledO1 = rng.shuffle(o1Questions)

  // O2 questions keep original order (not shuffled)

  // Build final question order
  const questionOrder: number[] = []

  // Add Y1 questions
  for (const q of shuffledY1) {
    questionOrder.push(q.id)
  }

  // Add Y2 groups (sub-questions in original order_in_group)
  for (const groupId of shuffledGroupIds) {
    const groupQuestions = y2Groups.get(groupId)!
    // Sort by order_in_group to maintain sub-question order
    groupQuestions.sort((a, b) => (a.order_in_group || 0) - (b.order_in_group || 0))
    for (const q of groupQuestions) {
      questionOrder.push(q.id)
    }
  }

  // Add O1 questions
  for (const q of shuffledO1) {
    questionOrder.push(q.id)
  }

  // Add O2 questions (original order)
  for (const q of o2Questions) {
    questionOrder.push(q.id)
  }

  // Generate option orders for Y1 and Y2 questions
  const optionOrders: Record<number, string[]> = {}

  for (const q of questions) {
    const typeCode = q.question_type_code

    // Only shuffle options for Y1 and Y2
    if ((typeCode === "Y1" || typeCode === "Y2") && q.options) {
      const optionKeys = Object.keys(q.options)
      if (optionKeys.length >= 2) {
        optionOrders[q.id] = rng.shuffle(optionKeys)
      } else {
        optionOrders[q.id] = optionKeys
      }
    }
  }

  return { questionOrder, optionOrders, seed }
}

// Reorder options based on stored order and remap correct answer
export function applyOptionOrder(
  options: Record<string, string>,
  storedOrder: string[],
  correctAnswer: string,
): { options: Record<string, string>; correctAnswer: string } {
  const optionLabels = ["A", "B", "C", "D", "E", "F", "G", "H"]
  const newOptions: Record<string, string> = {}

  const oldToNew: Record<string, string> = {}
  storedOrder.forEach((oldKey, index) => {
    const newKey = optionLabels[index]
    oldToNew[oldKey] = newKey
    newOptions[newKey] = options[oldKey]
  })

  let newCorrectAnswer = correctAnswer

  // Remap correct answer if it's a single letter (Y1)
  if (correctAnswer && correctAnswer.length === 1 && oldToNew[correctAnswer]) {
    newCorrectAnswer = oldToNew[correctAnswer]
  }

  // For Y2 matching answers like "1-A,2-B,3-C", remap each answer
  if (correctAnswer && correctAnswer.includes("-")) {
    const pairs = correctAnswer.split(",")
    const remappedPairs = pairs.map((pair) => {
      const [num, letter] = pair.split("-")
      const newLetter = oldToNew[letter] || letter
      return `${num}-${newLetter}`
    })
    newCorrectAnswer = remappedPairs.join(",")
  }

  return { options: newOptions, correctAnswer: newCorrectAnswer }
}
