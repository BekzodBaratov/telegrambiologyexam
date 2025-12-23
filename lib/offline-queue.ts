"use client"

interface QueuedAnswer {
  id: string
  attemptId: number
  questionId: number
  answer: string
  imageUrls?: string[]
  timestamp: number
  retries: number
}

const STORAGE_KEY = "offline-answer-queue"
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 2000

class OfflineAnswerQueue {
  private queue: QueuedAnswer[] = []
  private isProcessing = false
  private listeners: Set<(queue: QueuedAnswer[]) => void> = new Set()

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage()
      window.addEventListener("online", () => this.processQueue())
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch (e) {
      console.error("Failed to load offline queue:", e)
      this.queue = []
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue))
    } catch (e) {
      console.error("Failed to save offline queue:", e)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.queue]))
  }

  subscribe(listener: (queue: QueuedAnswer[]) => void): () => void {
    this.listeners.add(listener)
    listener([...this.queue])
    return () => this.listeners.delete(listener)
  }

  enqueue(attemptId: number, questionId: number, answer: string, imageUrls?: string[]): void {
    // Remove existing answer for same question
    this.queue = this.queue.filter((q) => !(q.attemptId === attemptId && q.questionId === questionId))

    this.queue.push({
      id: `${attemptId}-${questionId}-${Date.now()}`,
      attemptId,
      questionId,
      answer,
      imageUrls,
      timestamp: Date.now(),
      retries: 0,
    })

    this.saveToStorage()
    this.notifyListeners()
    this.processQueue()
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return
    }

    this.isProcessing = true

    // Group answers by attemptId for batch processing
    const byAttempt = new Map<number, QueuedAnswer[]>()
    for (const item of this.queue) {
      const existing = byAttempt.get(item.attemptId) || []
      existing.push(item)
      byAttempt.set(item.attemptId, existing)
    }

    for (const [attemptId, answers] of byAttempt) {
      try {
        const response = await fetch("/api/student/save-answers-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            answers: answers.map((a) => ({
              questionId: a.questionId,
              answer: a.answer,
              imageUrls: a.imageUrls,
            })),
          }),
        })

        if (response.ok) {
          // Remove successfully saved answers
          this.queue = this.queue.filter((q) => !answers.some((a) => a.id === q.id))
        } else {
          // Increment retry count
          for (const answer of answers) {
            const item = this.queue.find((q) => q.id === answer.id)
            if (item) {
              item.retries++
              if (item.retries >= MAX_RETRIES) {
                // Remove after max retries
                this.queue = this.queue.filter((q) => q.id !== item.id)
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to process queue:", e)
        // Will retry on next processQueue call
      }
    }

    this.saveToStorage()
    this.notifyListeners()
    this.isProcessing = false

    // Schedule retry if items remain
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), RETRY_DELAY_MS)
    }
  }

  getPendingCount(): number {
    return this.queue.length
  }

  clearForAttempt(attemptId: number): void {
    this.queue = this.queue.filter((q) => q.attemptId !== attemptId)
    this.saveToStorage()
    this.notifyListeners()
  }
}

// Singleton instance
export const offlineQueue = typeof window !== "undefined" ? new OfflineAnswerQueue() : null
