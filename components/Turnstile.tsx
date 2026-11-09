"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
function api() { return (window as Window & { turnstile?: TurnstileApi }).turnstile; }

export default function Turnstile({ siteKey, attempt, onToken, onError }: {
  siteKey: string; attempt: number; onToken: (token: string | null) => void; onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callbacks = useRef({ onToken, onError });
  useEffect(() => { callbacks.current = { onToken, onError }; }, [onToken, onError]);
  const render = useCallback(() => {
    const turnstile = api();
    if (!turnstile || !container.current || widgetId.current !== null) return;
    widgetId.current = turnstile.render(container.current, {
      sitekey: siteKey,
      callback: (token: string) => callbacks.current.onToken(token),
      "expired-callback": () => callbacks.current.onToken(null),
      "error-callback": () => { callbacks.current.onToken(null); callbacks.current.onError(); },
    });
  }, [siteKey]);
  useEffect(() => {
    render();
    return () => {
      if (widgetId.current !== null) api()?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [render, attempt]);
  return <>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive" onReady={render} onError={onError} />
    <div ref={container} />
  </>;
}
