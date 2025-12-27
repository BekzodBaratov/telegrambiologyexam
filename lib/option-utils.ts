/**
 * Utility functions for option ID management
 *
 * This module provides randomization-safe answer handling by using stable option IDs
 * instead of positional letters (A/B/C/D).
 *
 * Option ID format: "{questionId}_{originalLetter}" e.g., "123_A", "123_B"
 * This ensures each option has a unique, stable identifier regardless of display order.
 */

/**
 * Generate a stable option ID from question ID and original letter
 */
export function generateOptionId(questionId: number, letter: string): string {
  return `${questionId}_${letter.toUpperCase()}`
}

/**
 * Extract the original letter from an option ID
 */
export function getLetterFromOptionId(optionId: string): string | null {
  if (!optionId || !optionId.includes("_")) {
    return null
  }
  const parts = optionId.split("_")
  return parts[parts.length - 1] || null
}

/**
 * Extract the question ID from an option ID
 */
export function getQuestionIdFromOptionId(optionId: string): number | null {
  if (!optionId || !optionId.includes("_")) {
    return null
  }
  const parts = optionId.split("_")
  const id = Number.parseInt(parts[0], 10)
  return isNaN(id) ? null : id
}

/**
 * Convert legacy options (A/B/C/D keys) to options with stable IDs
 * Input: { "A": "Option 1", "B": "Option 2", ... }
 * Output: { "A": { id: "123_A", text: "Option 1" }, "B": { id: "123_B", text: "Option 2" }, ... }
 */
export function addOptionIds(
  questionId: number,
  options: Record<string, string> | null,
): Record<string, { id: string; text: string }> | null {
  if (!options) return null

  const result: Record<string, { id: string; text: string }> = {}
  for (const [letter, text] of Object.entries(options)) {
    result[letter] = {
      id: generateOptionId(questionId, letter),
      text: text as string,
    }
  }
  return result
}

/**
 * Resolve correct_option_id for a question
 * - If correct_option_id exists, use it
 * - If not (legacy question), derive it from correct_answer letter
 */
export function resolveCorrectOptionId(
  questionId: number,
  correctOptionId: string | null,
  correctAnswer: string | null,
): string | null {
  // New questions have correct_option_id set
  if (correctOptionId) {
    return correctOptionId
  }

  // Legacy questions: derive from correct_answer letter
  if (correctAnswer && correctAnswer.match(/^[A-Z]$/i)) {
    return generateOptionId(questionId, correctAnswer)
  }

  return null
}

/**
 * Check if a selected option ID matches the correct option ID
 * This is the primary validation method - randomization-safe
 */
export function isAnswerCorrect(selectedOptionId: string | null, correctOptionId: string | null): boolean {
  if (!selectedOptionId || !correctOptionId) {
    return false
  }
  return selectedOptionId === correctOptionId
}

/**
 * For backward compatibility: check answer using legacy letter comparison
 * Only used when correct_option_id is not available
 */
export function isLegacyAnswerCorrect(
  submittedLetter: string,
  correctAnswer: string,
  optionOrder: string[] | null,
): boolean {
  if (!correctAnswer) return false

  // If no randomization, direct comparison
  if (!optionOrder || optionOrder.length === 0) {
    return submittedLetter.toUpperCase() === correctAnswer.toUpperCase()
  }

  // Map displayed letter back to original letter
  const displayLabels = ["A", "B", "C", "D", "E", "F", "G", "H"]
  const displayIndex = displayLabels.indexOf(submittedLetter.toUpperCase())

  if (displayIndex >= 0 && displayIndex < optionOrder.length) {
    const originalLetter = optionOrder[displayIndex]
    return originalLetter.toUpperCase() === correctAnswer.toUpperCase()
  }

  return false
}
