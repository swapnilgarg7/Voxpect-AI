"use client";

export function AudioPlayer({ url }: { url: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-4">
      <audio
        controls
        className="w-full"
        style={{ colorScheme: "dark" }}
        src={url}
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
