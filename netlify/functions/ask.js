// netlify/functions/ask.js
export default async (req, ctx) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { wavBase64 } = await req.json();
    if (!wavBase64) return new Response(JSON.stringify({ error: 'wavBase64 required' }), { status: 400 });

    const apiKey = process.env.GOOGLE_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (!apiKey) return new Response(JSON.stringify({ error: 'Server missing GOOGLE_API_KEY' }), { status: 500 });

    const contents = [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: 'audio/wav', data: wavBase64 } },
        { text: 'You are Scout, a kind, upbeat guide for ages 5-9. Transcribe what I said and reply in 1–2 short sentences, simple language.' }
      ]
    }];

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    const data = await resp.json();
    if (!resp.ok) {
      const msg = data?.error?.message || 'Upstream error';
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join(' ') || '';
    return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
