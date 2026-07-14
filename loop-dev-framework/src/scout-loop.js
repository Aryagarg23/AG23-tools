// Scouting loop (test 2): a second loop *type* distinct from the dev loop. Instead of
// write_file + run_test, the cheap agent is given internet tools and drives them via native
// tool-calling (vLLM serves Qwen3-Coder with --enable-auto-tool-choice --tool-call-parser
// qwen3_coder, so the model emits real tool_calls and the harness executes them).
//
// This is the answer to "how do we plug it into the internet": the model already emits tool
// calls; the harness owns the tool implementations (web-tools.js) and the observe→feed-back loop.
import { WEB_TOOLS, webSearch, fetchUrl } from './web-tools.js';

const BASE = (process.env.OPENAI_BASE_URL || 'http://localhost:8000/v1').replace(/\/+$/, '');
const MODEL = process.env.OPENAI_MODEL || 'QuantTrio/Qwen3-Coder-30B-A3B-Instruct-AWQ';
const KEY = process.env.OPENAI_API_KEY || 'sk-local';

async function chat(messages, tools) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: 'auto', temperature: 0.2 }),
  });
  if (!res.ok) throw new Error(`vLLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function fmtSearch(results) {
  if (!results.length) return 'No results.';
  return results.map((r, i) => `[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.snippet || ''}`.trim()).join('\n');
}

export async function runScoutLoop({ question, systemPrompt, maxSteps = 8, maxToolChars = 4000, onStep }) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ];
  const metrics = { steps: 0, searches: 0, fetches: 0, toolErrors: 0 };
  const toolLog = [];
  let final = null;

  for (let step = 1; step <= maxSteps; step++) {
    metrics.steps = step;
    const resp = await chat(messages, WEB_TOOLS);
    const msg = resp.choices[0].message;
    // Normalize: vLLM returns tool_calls on the assistant message
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });

    if (msg.tool_calls && msg.tool_calls.length) {
      for (const tc of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { metrics.toolErrors++; }
        let result;
        if (tc.function.name === 'web_search') {
          metrics.searches++;
          const r = await webSearch(args.query || '', 6);
          result = fmtSearch(r);
          if (onStep) onStep(`  🔍 web_search("${args.query}") → ${r.length} results`);
        } else if (tc.function.name === 'fetch_url') {
          metrics.fetches++;
          result = await fetchUrl(args.url || '', maxToolChars);
          if (onStep) onStep(`  📄 fetch_url("${args.url}") → ${String(result).length} chars`);
        } else {
          result = `unknown tool: ${tc.function.name}`;
          metrics.toolErrors++;
        }
        toolLog.push({ step, tool: tc.function.name, args, resultPreview: String(result).slice(0, 200) });
        messages.push({ role: 'tool', tool_call_id: tc.id, content: String(result).slice(0, maxToolChars) });
      }
      continue; // let the model observe tool results
    }

    // No tool calls → the model produced its final synthesis
    final = msg.content;
    if (onStep) onStep(`  ✅ final synthesis (${(final || '').length} chars)`);
    break;
  }

  return { final, metrics, toolLog, messages };
}
