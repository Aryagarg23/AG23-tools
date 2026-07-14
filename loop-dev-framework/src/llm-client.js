import dotenv from 'dotenv';
dotenv.config();

/**
 * A flexible LLM client that supports live API calls:
 * - Gemini API (using GEMINI_API_KEY)
 * - OpenAI API (using OPENAI_API_KEY)
 * - Local Ollama API (using OLLAMA_MODEL)
 * - Simulated offline fallback (if USE_SIMULATOR=true or no configs present)
 */
export class LLMClient {
  constructor() {
    this.geminiKey = process.env.GEMINI_API_KEY || '';
    this.openaiKey = process.env.OPENAI_API_KEY || '';
    // OPENAI_BASE_URL lets the OpenAI-compatible path target any server that speaks the
    // Chat Completions API — e.g. a local vLLM at http://localhost:8000/v1. When set, no real
    // OpenAI key is required (a dummy is sent). See journal/01-issues-to-open.md #4.
    this.openaiBaseUrl = process.env.OPENAI_BASE_URL || '';
    this.ollamaModel = process.env.OLLAMA_MODEL || '';
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.useSimulator = process.env.USE_SIMULATOR === 'true' || (!this.geminiKey && !this.openaiKey && !this.openaiBaseUrl && !this.ollamaModel);

    if (this.useSimulator) {
      console.log('[LLM Client] Running in SIMULATION mode.');
    } else if (this.geminiKey) {
      console.log('[LLM Client] Running with real Gemini API.');
    } else if (this.openaiKey || this.openaiBaseUrl) {
      console.log(`[LLM Client] Running with OpenAI-compatible API${this.openaiBaseUrl ? ` (base: ${this.openaiBaseUrl})` : ''}.`);
    } else if (this.ollamaModel) {
      console.log(`[LLM Client] Running with local Ollama API (Model: ${this.ollamaModel}, Host: ${this.ollamaHost}).`);
    }
  }

  /**
   * Send prompt to the selected model provider
   */
  async complete(systemPrompt, userPrompt) {
    if (this.useSimulator) {
      return this.simulate(systemPrompt, userPrompt);
    }

    if (this.geminiKey) {
      return this.callGemini(systemPrompt, userPrompt);
    } else if (this.openaiKey || this.openaiBaseUrl) {
      return this.callOpenAI(systemPrompt, userPrompt);
    } else if (this.ollamaModel) {
      return this.callOllama(systemPrompt, userPrompt);
    } else {
      throw new Error('No LLM provider configuration found.');
    }
  }

  /**
   * Call Gemini API via fetch
   */
  async callGemini(systemPrompt, userPrompt) {
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiKey}`;
    
    // Inject system instructions correctly for Gemini generateContent
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Request/Task:\n${userPrompt}` }] }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json' // request JSON mode
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Call OpenAI API via fetch
   */
  async callOpenAI(systemPrompt, userPrompt) {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const base = (this.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const url = `${base}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey || 'sk-local'}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' } // request JSON mode
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Call Local Ollama API via fetch
   */
  async callOllama(systemPrompt, userPrompt) {
    const url = `${this.ollamaHost}/api/chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        options: {
          temperature: 0.1
        },
        format: 'json', // request JSON format
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  /**
   * Deterministic Simulator for local testing
   */
  simulate(systemPrompt, userPrompt) {
    const isRcaEnabled = systemPrompt.includes('PAST FAILURES / LESSONS LEARNED') || userPrompt.includes('PAST FAILURES / LESSONS LEARNED');
    const isTask1 = userPrompt.includes('concurrency') || userPrompt.includes('limiter') || systemPrompt.includes('limiter') || systemPrompt.includes('Rate');
    const isTask2 = userPrompt.includes('leap') || userPrompt.includes('Leap') || systemPrompt.includes('leap') || systemPrompt.includes('Leap');

    if (isTask1) {
      if (isRcaEnabled) {
        return JSON.stringify({
          thought: "I see a lesson about race conditions in the past failures. It states that standard counter increments fail during concurrency, and I must use an atomic lock. I will implement the atomic lock variant immediately.",
          action: "write_file",
          path: "lib/rate-limiter.js",
          content: `
let count = 0;
let isLocked = false;

export async function rateLimit(limit) {
  while (isLocked) {
    await new Promise(r => setTimeout(r, 1));
  }
  isLocked = true;
  
  try {
    if (count >= limit) {
      return false;
    }
    count++;
    return true;
  } finally {
    isLocked = false;
  }
}

export function reset() {
  count = 0;
}
`
        });
      } else {
        const isRetry = userPrompt.includes('Result: Failure') || userPrompt.includes('[Step 1]');
        if (isRetry) {
          return JSON.stringify({
            thought: "The previous tests failed. I see it was due to concurrency. I will now try to add a lock to rateLimit.",
            action: "write_file",
            path: "lib/rate-limiter.js",
            content: `
let count = 0;
let isLocked = false;

export async function rateLimit(limit) {
  while (isLocked) {
    await new Promise(r => setTimeout(r, 1));
  }
  isLocked = true;
  try {
    if (count >= limit) {
      return false;
    }
    count++;
    return true;
  } finally {
    isLocked = false;
  }
}

export function reset() {
  count = 0;
}
`
          });
        } else {
          return JSON.stringify({
            thought: "I will implement a standard simple rate limiter counter.",
            action: "write_file",
            path: "lib/rate-limiter.js",
            content: `
let count = 0;

export async function rateLimit(limit) {
  if (count >= limit) {
    return false;
  }
  await new Promise(r => setTimeout(r, 2));
  count++;
  return true;
}

export function reset() {
  count = 0;
}
`
          });
        }
      }
    }

    if (isTask2) {
      if (isRcaEnabled) {
        return JSON.stringify({
          thought: "I see a lesson about leap years in the past failures. It states that standard divisible-by-4 checks fail on century boundaries like 1900/2100, and I must check that divisible by 100 is skipped unless divisible by 400. I will write the complete solution immediately.",
          action: "write_file",
          path: "lib/leap.js",
          content: `
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}
`
        });
      } else {
        const isRetry = userPrompt.includes('Result: Failure') || userPrompt.includes('[Step 1]');
        if (isRetry) {
          return JSON.stringify({
            thought: "The previous tests failed on century boundaries. I will now add the century exclusion and the 400-year exception rules.",
            action: "write_file",
            path: "lib/leap.js",
            content: `
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}
`
          });
        } else {
          return JSON.stringify({
            thought: "I will implement a simple leap year checker that checks if the year is divisible by 4.",
            action: "write_file",
            path: "lib/leap.js",
            content: `
export function isLeapYear(year) {
  return year % 4 === 0;
}
`
          });
        }
      }
    }

    return JSON.stringify({
      thought: "I am simulated and don't recognize the task.",
      action: "exit"
    });
  }
}
