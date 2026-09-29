// Intuish AI checker: a free Cloudflare Worker that grades written answers with Google Gemini.
// The Gemini key lives in the Worker as a secret named GEMINI_KEY, so it never reaches the app or the browser.
const ALLOWED = [/^https:\/\/imatiny408-tech\.github\.io$/, /^https:\/\/[a-z0-9-]+\.claudeusercontent\.com$/, /^http:\/\/localhost(:\d+)?$/];
const MODEL = "gemini-2.5-flash";

function cors(origin){
  const ok = ALLOWED.some(r => r.test(origin || ""));
  return {"Access-Control-Allow-Origin": ok ? origin : "https://imatiny408-tech.github.io", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin"};
}
const json = (body, status, h) => new Response(JSON.stringify(body), {status, headers: {...h, "Content-Type": "application/json"}});

export default {
  async fetch(req, env){
    const origin = req.headers.get("Origin"), h = cors(origin);
    if(req.method === "OPTIONS") return new Response(null, {status: 204, headers: h});
    if(req.method !== "POST") return json({ok: true, name: "Intuish AI checker"}, 200, h);
    if(!ALLOWED.some(r => r.test(origin || ""))) return json({error: "not allowed"}, 403, h);
    let b; try { b = await req.json(); } catch(e){ return json({error: "bad request"}, 400, h); }
    const prompt = String(b.prompt || "").slice(0, 12000), system = String(b.system || "").slice(0, 3000);
    if(!prompt) return json({error: "empty"}, 400, h);
    const parts = [];
    if(b.video && /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(b.video)) parts.push({file_data: {file_uri: b.video}});
    parts.push({text: prompt});
    const body = {
      system_instruction: {parts: [{text: system}]},
      contents: [{role: "user", parts}],
      generationConfig: {temperature: 0.2, maxOutputTokens: 1500, thinkingConfig: {thinkingBudget: 512}, mediaResolution: "MEDIA_RESOLUTION_LOW"}
    };
    if(b.search) body.tools = [{google_search: {}}];
    const call = async bd => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {method: "POST", headers: {"Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY}, body: JSON.stringify(bd)});
    let r = await call(body);
    // A video Gemini can't open (private, too long): grade without it
    if(!r.ok && parts.length > 1){ body.contents[0].parts = [parts[parts.length - 1]]; body.tools = [{google_search: {}}]; r = await call(body); }
    if(!r.ok) return json({error: "ai " + r.status}, 502, h);
    const j = await r.json();
    const text = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || "").join("") || "";
    return json({text}, 200, h);
  }
};
