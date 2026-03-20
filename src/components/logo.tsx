import Image from "next/image";
import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  const width = compact ? 150 : 220;
  const height = compact ? 52 : 76;

  return (
    <Link href="/dashboard" className="inline-flex items-center">
      <span className="logo-light">
        <Image
          src="/ais-logo.svg"
          alt="Aldeia Insight Scheduler"
          width={width}
          height={height}
          className="h-auto w-auto max-w-[220px]"
          priority
        />
      </span>
      <span className="logo-dark hidden">
        <Image
          src="/ais-logo-dark.svg"
          alt="Aldeia Insight Scheduler"
          width={width}
          height={height}
          className="h-auto w-auto max-w-[220px]"
          priority
        />
      </span>
    </Link>
  );
}
