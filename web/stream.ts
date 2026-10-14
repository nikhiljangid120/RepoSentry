import type { Run } from '../src/contracts';
export async function consumeRunStream(response: Response, onUpdate: (run: Run) => void) {
  if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'Investigation request failed'); }
  if (!response.body) throw new Error('Browser cannot stream this response');
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  let buffer = ''; let completed: Run | undefined;
  try {
    while (true) {
      const chunk = await reader.read(); buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const event = frame.split('\n').find(l => l.startsWith('event: '))?.slice(7);
        const data = frame.split('\n').filter(l => l.startsWith('data: ')).map(l => l.slice(6)).join('\n');
        if (!data) continue;
        const parsed = JSON.parse(data);
        if (event === 'error') throw new Error(parsed.error);
        if (event === 'update' || event === 'complete') { onUpdate(parsed); if (event === 'complete') completed = parsed; }
      }
      if (chunk.done) break;
    }
  } finally { reader.releaseLock(); }
  if (!completed) throw new Error('Connection ended before a final result. Inspect history before retrying; execution is unverified.');
  return completed;
}
