import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  /** base64-encoded WAV audio (no data: prefix) */
  audio: z.string().min(100),
});

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Transcribes a short WAV recording with the Lovable AI speech-to-text model. */
export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Speech to text is not configured.");

    const bytes = base64ToBytes(data.audio);
    if (bytes.byteLength < 2048) {
      return { text: "", empty: true as const };
    }

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" }), "recording.wav");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Too many requests right now — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      if (res.status === 403) throw new Error("AI access is blocked for this workspace.");
      throw new Error(`Transcription failed (${res.status}). ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { text?: string };
    return { text: (json.text ?? "").trim(), empty: false as const };
  });
