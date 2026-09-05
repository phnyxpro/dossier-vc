import { useCallback, useEffect, useRef, useState, type TextareaHTMLAttributes } from "react";
import { Mic, Square, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Textarea } from "@/components/ui/primitives";
import { transcribeAudio } from "@/lib/dossier/transcribe.functions";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
};

function encodeWav(chunks: Float32Array[], sampleRate: number, targetRate = 16000): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const ratio = sampleRate / targetRate;
  const outLength = Math.floor(merged.length / ratio);
  const samples = new Int16Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const s = Math.max(-1, Math.min(1, merged[Math.floor(i * ratio)] ?? 0));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(pos + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: "audio/wav" });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function MicTextarea({ value, onChange, className, ...rest }: Props) {
  const transcribe = useServerFn(transcribeAudio);
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const [seconds, setSeconds] = useState(0);
  const media = useRef<{
    stream: MediaStream;
    ctx: AudioContext;
    source: MediaStreamAudioSourceNode;
    node: ScriptProcessorNode;
    chunks: Float32Array[];
  } | null>(null);

  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(node);
      node.connect(ctx.destination);
      media.current = { stream, ctx, source, node, chunks };
      setSeconds(0);
      setState("recording");
    } catch {
      toast.error("We could not reach your microphone. Check your browser permissions.");
    }
  }, []);

  const stop = useCallback(async () => {
    const m = media.current;
    media.current = null;
    if (!m) return setState("idle");
    setState("working");
    m.stream.getTracks().forEach((t) => t.stop());
    m.node.disconnect();
    m.source.disconnect();
    const blob = encodeWav(m.chunks, m.ctx.sampleRate);
    await m.ctx.close().catch(() => undefined);
    if (blob.size < 4096) {
      setState("idle");
      toast.error("That recording was too short — hold the mic on and speak, then stop.");
      return;
    }
    try {
      const audio = await blobToBase64(blob);
      const result = await transcribe({ data: { audio } });
      const text = result.text?.trim();
      if (!text) {
        toast.error("We did not catch any speech in that recording.");
      } else {
        const next = value.trim() ? `${value.trim()} ${text}` : text;
        onChange({ target: { value: next } });
        toast.success("Speech added to the field.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not turn that recording into text.");
    } finally {
      setState("idle");
    }
  }, [onChange, transcribe, value]);

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={onChange}
        className={`pb-12 ${state === "recording" ? "ring-2 ring-red-500/70" : ""} ${className ?? ""}`}
        {...rest}
      />
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
        {state === "recording" ? (
          <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording {mmss}
          </span>
        ) : state === "working" ? (
          <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Turning speech into text…
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={state === "recording" ? stop : start}
          disabled={state === "working"}
          aria-label={state === "recording" ? "Stop recording" : "Start recording"}
          className={`pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
            state === "recording"
              ? "bg-red-500 text-white hover:bg-red-400"
              : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          }`}
        >
          {state === "recording" ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current" /> Stop
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" /> Speak
            </>
          )}
        </button>
      </div>
    </div>
  );
}
