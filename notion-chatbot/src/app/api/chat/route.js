export async function POST(request) {
  const { messages, thinking_mode } = await request.json();
  const lastUserMessage = messages?.filter(m => m.role === 'user').pop()?.content || '';

  try {
    const controller = new AbortController();
    // Increase timeout to 1 hour (3,600,000 ms)
    const timeoutId = setTimeout(() => controller.abort(), 3600000);

    const backendResponse = await fetch(`http://localhost:8000/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: lastUserMessage,
        thinking_mode: thinking_mode
      }),
      signal: controller.signal,
      // Attempt to prevent internal Node.js timeouts
      keepalive: true,
    });
    
    if (!backendResponse.ok) {
      clearTimeout(timeoutId);
      return new Response("Backend error", { status: 500 });
    }

    // Use a TransformStream to pass through the chunks
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = backendResponse.body.getReader();

    // Start background task to pipe data
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (err) {
        console.error("Streaming error:", err);
      } finally {
        writer.close();
        clearTimeout(timeoutId);
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Fetch error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
