import Navbar from "@/components/Navbar";
import Examples from "@/components/Examples";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <Navbar />
      <div className="w-full min-h-screen relative isolate overflow-hidden bg-gray-900 px-6 py-24 shadow-2xl sm:px-24 xl:py-32">
        <h1 className="mt-16 mx-auto max-w-2xl text-center text-5xl font-bold tracking-tight text-white sm:text-6xl">
          AI Getting Started
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-center text-xl leading-8 text-slate-400">
          Help you set up an AI project with ease. Here are two example use cases:
        </p>

        <div className="mx-auto mt-10 max-w-xl">
          <Link
            href="/cursor"
            className="group flex flex-col gap-2 rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/10 to-violet-500/10 px-6 py-5 text-left shadow-lg ring-1 ring-white/10 transition hover:border-sky-400/50 hover:from-sky-500/15 hover:to-violet-500/15 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <span className="text-sm font-semibold uppercase tracking-wide text-sky-300">
              Nouveau · Guide Cursor
            </span>
            <span className="text-lg font-semibold text-white">
              Interface conviviale : raccourcis, modes et prompts à copier
            </span>
            <span className="text-sm text-slate-400 group-hover:text-slate-300">
              Ouvre le hub à côté de l’éditeur →
            </span>
          </Link>
        </div>

        <Examples />

        <svg
          viewBox="0 0 1024 1024"
          className="absolute left-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
          aria-hidden="true"
        >
          <circle
            cx={512}
            cy={512}
            r={512}
            fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
            fillOpacity="0.5"
          />
          <defs>
            <radialGradient
              id="759c1415-0410-454c-8f7c-9a820de03641"
              cx={0}
              cy={0}
              r={1}
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(512 512) rotate(90) scale(512)"
            >
              <stop stopColor="rgb(17 24 39)" />
              <stop offset={1} stopColor="rgb(125 211 252)" stopOpacity={0} />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </main>
  );
}
