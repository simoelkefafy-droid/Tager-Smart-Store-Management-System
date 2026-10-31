import { Link } from 'wouter';

const base = import.meta.env.BASE_URL;

export function BrandHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="no-print border-b border-border bg-card/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-3 rounded-md" data-testid="link-home">
          <img src={`${base}brand/tager.svg`} alt="" className="h-10 w-10" />
          <span className="text-xl font-semibold text-primary">تاجر</span>
        </Link>
        <div className="flex items-center gap-2">{children}</div>
      </div>
      <div className="gold-rule" />
    </header>
  );
}
