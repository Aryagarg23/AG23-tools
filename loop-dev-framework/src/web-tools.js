// Internet tools for the scouting loop. Keyless by default (DuckDuckGo HTML endpoint); if
// TAVILY_API_KEY is set, web_search uses Tavily for higher-quality agent search instead.
// Node 24 has global fetch — no dependencies.

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&#x3D;/g, '=')
    .replace(/\s+/g, ' ').trim();
}

// DuckDuckGo redirect hrefs look like //duckduckgo.com/l/?uddg=<encoded>&rut=...
function decodeDdgHref(href) {
  const m = href.match(/[?&]uddg=([^&]+)/);
  if (m) { try { return decodeURIComponent(m[1]); } catch { /* fallthrough */ } }
  return href.startsWith('//') ? 'https:' + href : href;
}

async function ddgSearch(query, maxResults) {
  const endpoints = [
    'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query),
    'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(query),
  ];
  for (const url of endpoints) {
    let html;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
      html = await res.text();
    } catch (e) { continue; }
    const results = [];
    // html endpoint: <a class="result__a" href="...">title</a> ... result__snippet
    const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) && results.length < maxResults) {
      results.push({ url: decodeDdgHref(m[1]), title: stripTags(m[2]) });
    }
    // lite endpoint fallback: result links are <a class="result-link" href> or plain rows
    if (results.length === 0) {
      const re2 = /<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      while ((m = re2.exec(html)) && results.length < maxResults) {
        results.push({ url: decodeDdgHref(m[1]), title: stripTags(m[2]) });
      }
    }
    // attach snippets where available
    const snips = [];
    const sre = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    while ((m = sre.exec(html))) snips.push(stripTags(m[1]));
    results.forEach((r, i) => { r.snippet = snips[i] || ''; });
    if (results.length) return results;
  }
  return [];
}

async function tavilySearch(query, maxResults) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: maxResults }),
  });
  const data = await res.json();
  return (data.results || []).map(r => ({ url: r.url, title: r.title, snippet: r.content || '' }));
}

export async function webSearch(query, maxResults = 6) {
  const results = process.env.TAVILY_API_KEY
    ? await tavilySearch(query, maxResults)
    : await ddgSearch(query, maxResults);
  return results;
}

export async function fetchUrl(url, maxChars = 4000) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, redirect: 'follow' });
    const ct = res.headers.get('content-type') || '';
    const body = await res.text();
    if (ct.includes('json')) return body.slice(0, maxChars);
    const text = body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ').trim();
    return text.slice(0, maxChars) + (text.length > maxChars ? ' …[truncated]' : '');
  } catch (e) {
    return `ERROR fetching ${url}: ${e.message}`;
  }
}

// OpenAI tool schemas exposed to the model.
export const WEB_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web. Returns a list of {url, title, snippet}. Use specific queries.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'the search query' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetch a URL and return its text content (truncated). Use on promising search results.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'the URL to fetch' } },
        required: ['url'],
      },
    },
  },
];
