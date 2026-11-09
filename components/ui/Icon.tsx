import type { SVGProps } from "react";

export type IconName = "home" | "share" | "facilities" | "community" | "shield" | "heart" | "arrow" | "train" | "toilet" | "elevator" | "escalator";
const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  share: <><path d="M8 3v9a3 3 0 0 0 3 3h8M5 12v4a4 4 0 0 0 4 4h9M16 15l2 6M12 3h5v7" /><path d="m14 7 3 3 3-3" /></>,
  facilities: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M9 8h6M9 12h6M12 16v5M9 18h6" /></>,
  community: <><path d="M21 11a8 8 0 0 1-8 8H8l-5 3V11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /><path d="M8 10h8M8 14h5" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="M12 8v5M12 16h.01" /></>,
  heart: <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 0 9 8 15 8-6 12-11 8-15Z" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  train: <><rect x="5" y="3" width="14" height="16" rx="4" /><path d="M5 11h14M12 3v8M8 22l2-3m6 3-2-3M8 15h.01M16 15h.01" /></>,
  toilet: <><path d="M4 3h7v8H4ZM6 11v3a7 7 0 0 0 7 7h3v-6M11 8h9v5a4 4 0 0 1-4 4h-3M6 6h2" /></>,
  elevator: <><rect x="3" y="2" width="18" height="20" rx="3" /><path d="M12 10v12M7 10h10v12M7 6l2-2 2 2m2-1 2 2 2-2" /></>,
  escalator: <><path d="M3 16h4l8-9h6v5h-4l-8 9H3Z" /><path d="M7 12V8m0-4v.01" /></>,
};
export default function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}
