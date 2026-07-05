const QUEUE_KEY = "vocabmaster_queue";
const HISTORY_KEY = "vocabmaster_history";

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToQueue(word) {
  const queue = getQueue();
  if (queue.find((w) => w.id === word.id)) return false; // already in queue
  queue.push({ id: word.id, word: word.word, vietnamese: word.vietnamese, addedAt: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return true;
}

export function removeFromQueue(wordId) {
  const queue = getQueue().filter((w) => w.id !== wordId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}

export function isInQueue(wordId) {
  return getQueue().some((w) => w.id === wordId);
}

// Save quiz result
export function saveResult(wordId, correct) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
    if (!history[wordId]) history[wordId] = { correct: 0, wrong: 0 };
    if (correct) history[wordId].correct++;
    else history[wordId].wrong++;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
  } catch {
    return {};
  }
}
