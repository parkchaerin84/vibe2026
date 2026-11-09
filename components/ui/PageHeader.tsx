import Icon, { type IconName } from "./Icon";

export default function PageHeader({ title, description, icon, eyebrow = "SUBWAYEASY", line = false }: {
  title: string; description: string; icon: IconName; eyebrow?: string; line?: boolean;
}) {
  return <header className="ui-page-header">
    <div className="flex items-center gap-2 mb-4"><span className="ui-eyebrow">{eyebrow}</span>{line && <span className="line-badge"><i aria-hidden="true" />서울 2호선</span>}</div>
    <div className="flex items-start gap-4"><span className="ui-icon-box shrink-0"><Icon name={icon} /></span><div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1><p className="text-sm sm:text-base text-ink-muted mt-2 leading-relaxed max-w-2xl">{description}</p></div></div>
  </header>;
}
