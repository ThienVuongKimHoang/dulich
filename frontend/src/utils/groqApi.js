const EXAMPLES_API_URL = "/api/v1/vocab/examples";

export async function generateExamples(word, vietnamese) {
  const response = await fetch(EXAMPLES_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word, vietnamese }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("API error response:", errText);
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  return response.json();
}

export async function generateGrammarQuiz(topic, count = 5) {
  const response = await fetch("/api/v1/vocab/grammar-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, count }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("API error response:", errText);
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  return response.json();
}

export function getImageUrl(imageKeyword, id) {
  const encoded = encodeURIComponent(imageKeyword);
  return `https://loremflickr.com/400/260/${encoded}?lock=${id}`;
}
