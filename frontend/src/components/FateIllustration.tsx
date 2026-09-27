"use client";

import { useSessionTheme } from "@/lib/useSessionTheme";

interface FateIllustrationProps {
  fate: "lost" | "survived";
}

/** Each ending gets a bespoke tableau in the selected world's visual language. */
export function FateIllustration({ fate }: FateIllustrationProps) {
  const { theme } = useSessionTheme();
  const won = fate === "survived";

  return (
    <svg className={`fate-illustration fate-illustration-${fate} fate-illustration-${theme.id}`} viewBox="0 0 360 220" role="img" aria-label={`${theme.name}: ${won ? "survived" : "eliminated"}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`fate-glow-${fate}-${theme.id}`}>
          <stop stopColor="var(--accent)" stopOpacity=".2" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="112" rx="154" ry="99" fill={`url(#fate-glow-${fate}-${theme.id})`} />
      <path className="fate-ground" d="M15 194h330M34 204h292" />
      {theme.id === "haunted_house" && <g className="fate-world-ink">
        <circle className="fate-moon" cx="276" cy="57" r="29" />
        <path className="fate-haunted-house" d="M60 194V96l48-40 49 40v98m-111-96h124l-62-53Zm31 96v-57h39v57m-25-99h13v21h-13zm24 0h13v21h-13z" />
        <path className={won ? "fate-open-door" : "fate-door"} d="M103 194v-43a14 14 0 0 1 28 0v43" />
        <path className="fate-figure" d={won ? "M246 158v36m0-24-12 13m12-13 12 13m-12 11-10 19m10-19 11 19" : "M242 169v25m0-19-9 12m9-12 10 11m-10 8-8 16m8-16 10 16"} />
        <circle className="fate-figure-head" cx="246" cy={won ? "147" : "158"} r="8" />
        <path className="fate-world-detail" d="M87 118h10m38 0h10M40 188l20-12m168 10 15-14" />
      </g>}
      {theme.id === "zombie_outbreak" && <g className="fate-world-ink">
        <path className="fate-bunker" d="M35 194V88h73v106m-63-82h53m-53 15h53m-53 15h53m156 64V65h64v129m-49-106h34m-34 17h34m-34 17h34" />
        <path className="fate-wire" d="M25 132h55l18-20 19 20h39l18-20 17 20h61l20-20 21 20h43m-333 52h330" />
        <path className={won ? "fate-exit" : "fate-door"} d="M145 194v-66h55v66" />
        <circle className="fate-warning" cx="172" cy="142" r="8" />
        <path className="fate-figure" d={won ? "M228 153v41m0-27-12 11m12-11 11 10m-11 17-10 18m10-18 10 18" : "M223 165v29m0-21-10 11m10-11 11 9m-11 12-9 16m9-16 10 16"} />
        <circle className="fate-figure-head" cx="228" cy={won ? "142" : "154"} r="8" />
        <path className="fate-biohazard" d="m299 35 19 33h-38zM299 47v10m0 5v1" />
      </g>}
      {theme.id === "slasher_movie" && <g className="fate-world-ink">
        <path className="fate-pines" d="m18 194 39-102 39 102Zm14-39h50m-23-5 45-119 45 119m-24-3 47-124 48 124m-21 4 48-104 47 104m-31 4 35-87 35 87" />
        <circle className="fate-moon" cx="285" cy="54" r="27" />
        <path className={won ? "fate-film-gate fate-open" : "fate-film-gate"} d="M130 194v-87l51-39 51 39v87m-115-85h127l-63-49Zm41 85v-48h39v48" />
        <path className="fate-figure" d={won ? "M274 154v40m0-27-12 11m12-11 11 11m-11 16-9 18m9-18 10 18" : "M274 159v35m0-24-11 12m11-12 11 12m-11 12-9 17m9-17 10 17"} />
        <path className="fate-mask" d="M259 136q15-12 30 0v23q-15 14-30 0z" />
        <path className="fate-slash" d="m247 126 52 55m0-55-52 55" />
      </g>}
      {theme.id === "alien_invasion" && <g className="fate-world-ink">
        <path className="fate-outpost" d="M26 194V102h69v92m-55-72h42m-42 19h42m-42 19h42m178 32V89h72v105m-57-83h42m-42 18h42m-42 18h42" />
        <path className="fate-orbit" d="M103 66c47-39 116-39 162 0m-143 9c37-29 88-29 125 0" />
        <path className="fate-craft" d="M122 104q58-67 116 0-58 45-116 0Zm35-4q23-22 46 0-23 18-46 0Z" />
        <path className={won ? "fate-beam fate-evac" : "fate-beam"} d="M181 125v59m-33-35 33 34 34-34" />
        <path className="fate-figure" d={won ? "M181 150v44m0-29-12 12m12-12 12 12m-12 17-9 18m9-18 10 18" : "M180 160v34m0-24-10 12m10-12 11 12m-11 12-9 17m9-17 10 17"} />
        <circle className="fate-figure-head" cx="181" cy={won ? "139" : "151"} r="8" />
        <circle className="fate-signal" cx="181" cy="104" r="4" />
      </g>}
      {theme.id === "deep_sea_terror" && <g className="fate-world-ink">
        <path className="fate-waterline" d="M12 64q25-14 50 0t50 0 50 0 50 0 50 0 50 0 50 0" />
        <path className="fate-submarine" d="M63 152q0-28 31-28h56q31 0 31 28v19H63zM90 124v-18m27 18v-18m-40 63v12m89-12v12" />
        <circle className="fate-window" cx="97" cy="148" r="8" /><circle className="fate-window" cx="125" cy="148" r="8" /><circle className="fate-window" cx="153" cy="148" r="8" />
        <path className="fate-tentacle" d={won ? "M216 194c-29-30-5-45 2-63 7 18-11 24 0 38 5-30 34-42 30-68 24 31 0 49-5 70 18-22 40-18 44-43 12 36-7 45-29 66" : "M213 194c-22-31 5-44 3-62 16 20-2 28 7 42 0-27 28-41 23-67 22 31-2 52 3 73 14-23 35-21 39-46 13 39-10 48-33 60"} />
        <path className={won ? "fate-dive-light" : "fate-depth"} d="m59 184 40 0 14 10h26l15-10h27m-90 12 10 7m93-6 11-8" />
        <circle className="fate-eye" cx="269" cy="132" r="5" /><circle className="fate-eye" cx="286" cy="132" r="5" />
      </g>}
      {theme.id === "cryptid_woods" && <g className="fate-world-ink">
        <circle className="fate-moon" cx="273" cy="52" r="27" />
        <path className="fate-pines" d="m12 194 38-102 39 102Zm-2-38h77m-5 38L99 52l49 142Zm55-25 42-112 43 112Zm114 25 46-125 46 125Zm49-32 35-96 35 96Z" />
        <path className="fate-creek" d="M25 187c31-13 41 13 72 0s42 13 73 0 42 13 73 0 42 13 92 0" />
        <path className="fate-tall-one" d={won ? "M216 191V101m0 22-18-26m18 41 22-29m-22 50-18-24m18 30 20-13" : "M216 194V92m0 21-18-26m18 40 23-32m-23 48-21-27m21 34 22-18"} />
        <circle className="fate-eye" cx="211" cy="114" r="3" /><circle className="fate-eye" cx="222" cy="114" r="3" />
        <path className="fate-figure" d={won ? "M146 154v40m0-27-12 12m12-12 11 11m-11 16-9 18m9-18 10 18" : "M146 164v30m0-21-10 11m10-11 11 10m-11 12-9 17m9-17 10 17"} />
        <circle className="fate-figure-head" cx="146" cy={won ? "143" : "155"} r="8" />
      </g>}
    </svg>
  );
}
