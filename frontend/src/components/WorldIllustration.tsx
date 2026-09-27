import { useId } from "react";

interface WorldIllustrationProps {
  themeId: string;
  name: string;
  variant?: "card" | "wide" | "portrait";
  className?: string;
  svgId?: string;
}

/**
 * Original vector scenes for all six nightmares. The same world plate is reused
 * at different scales across the experience; no world falls back to another's art.
 */
export function WorldIllustration({ themeId, name, variant = "card", className = "", svgId }: WorldIllustrationProps) {
  const id = themeId;
  // SVG fragment IDs share the document namespace; scope gradients per plate so
  // duplicate worlds on the home screen cannot borrow one another's artwork.
  const fragmentId = useId().replaceAll(":", "");
  const skyId = `${fragmentId}-sky-${id}`;
  const haloId = `${fragmentId}-halo-${id}`;
  return (
    <svg
      className={`world-scene world-scene-${id} world-scene-${variant} ${className}`.trim()} data-theme-scene={id} id={svgId}
      viewBox="0 0 640 340"
      role="img"
      aria-label={`${name} scene illustration`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice" 
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--record-bg, var(--scene-bg, var(--bg-1)))" />
          <stop offset="1" stopColor="#090a08" />
        </linearGradient>
        <radialGradient id={haloId}>
          <stop stopColor="var(--record-accent, var(--scene-accent, var(--accent)))" stopOpacity=".26" />
          <stop offset="1" stopColor="var(--record-accent, var(--scene-accent, var(--accent)))" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${fragmentId}-water-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="var(--record-accent, var(--scene-accent, var(--accent)))" stopOpacity=".2" />
          <stop offset="1" stopColor="#061014" stopOpacity=".9" />
        </linearGradient>
      </defs>
      <path className="scene-sky" fill={`url(#${skyId})`} d="M0 0h640v340H0z" />
      <ellipse cx="320" cy="174" rx="195" ry="150" fill={`url(#${haloId})`} />
      <path className="scene-horizon" d="M0 256 75 205l53 34 83-81 76 83 68-52 76 42 76-67 75 74 58-31v133H0Z" />

      {id === "haunted_house" && <g className="scene-ink scene-haunted">
        <circle className="scene-moon" cx="453" cy="91" r="41" />
        <path d="M65 283V119l57-56 58 56v164m-130-160h145m-112 160V163h41v120m-31-85h20m-20 17h20m-3-104V50m-13 14h26" />
        <path d="M222 284V128l99-77 98 77v156M197 134h248L321 37Zm35 150V172h47v112m47 0V171h50v113" />
        <path d="M299 161h17v26h-17zm32 0h17v26h-17z" className="scene-window" />
        <path d="M305 283v-50a16 16 0 0 1 32 0v50" className="scene-door" />
        <path d="M0 285h640M145 286c22-31 37-35 58-41m-58 41c8-19 7-30 3-42" className="scene-detail" />
        <path d="M511 283V177l40-44 41 44v106m-90-103h98m-75 103v-64h32v64" />
        <circle cx="307" cy="175" r="26" className="scene-lantern-glow" />
      </g>}

      {id === "zombie_outbreak" && <g className="scene-ink scene-zombie">
        <path d="M0 282h75v-66h36v-52h91v118h29v-91h65v91h45v-77h47v77h37v-123h46v-62h72v185h45" />
        <path d="M340 283V121l43-34 43 34v162m-101-157h116l-58-50Z" />
        <path d="M359 162h15v20h-15zm33 0h15v20h-15zm-33 39h15v20h-15zm33 0h15v20h-15z" className="scene-window" />
        <path d="M465 283V76h82v207m-69-182h56m-56 20h56m-56 20h56" className="scene-detail" />
        <path d="M74 282c2-30 19-40 30-21 11-16 27-5 25 21m-55-1 2-31 8-19 8 22m24 28-1-28-8-23-8 26" />
        <path d="M96 254c-8-16-4-31 9-31 14 0 18 19 10 34m-14-13h4m8 0h4m-12 13 5 4 5-4" className="scene-monster" />
        <path d="M0 286h640m-590 0v-31m15 31v-50m534 50v-42m16 42v-66" />
        <path d="M461 41h40m-20-20v40m-33-33 12 12m42 0 12-12" className="scene-hazard" />
      </g>}

      {id === "slasher_movie" && <g className="scene-ink scene-slasher">
        <circle cx="501" cy="84" r="43" className="scene-moon" />
        <path d="m22 288 52-151 51 151m-72-69h42M82 288 144 94l63 194m-90-92h55m318 92 53-154 51 154m-75-68h45m-9 68 42-120 43 120" />
        <path d="M236 286V168l83-65 84 65v118m-189-116h211L319 79Zm47 116v-76h51v76m38 0v-76h53v76" />
        <path d="M294 178h24v34h-24zm44 0h24v34h-24z" className="scene-window" />
        <path d="M481 134c0-32 18-55 41-55s42 23 42 55v76c0 36-18 60-42 60s-41-24-41-60z" className="scene-mask" />
        <path d="m498 158 22 13-22 13m48-26-21 13 21 13m-42 29h33" className="scene-mask-mark" />
        <path d="m582 39-25 62 20-6-14 43 40-73-22 7 10-33z" className="scene-bolt" />
        <path d="M0 289h640m-304-5c27 20 49 21 80 0m-75 0c23 10 43 11 65 0" className="scene-detail" />
      </g>}

      {id === "alien_invasion" && <g className="scene-ink scene-alien">
        <path d="M37 285V139h102v146M53 139V93h70v46M80 94V53h18v41m406 191V117h92v168m-70-168V75h49v42M0 286h640" />
        <path d="M61 166h22v22H61zm44 0h22v22h-22zm-44 43h22v22H61zm44 0h22v22h-22zm404-57h15v31h-15zm32 0h15v31h-15zm-32 51h15v31h-15zm32 0h15v31h-15z" className="scene-window" />
        <path d="M238 150c28-55 88-76 142-56 25 9 44 27 61 56-25 23-58 35-102 35-43 0-76-12-101-35Z" className="scene-craft" />
        <path d="M262 148c24-30 57-46 95-46s71 16 96 46c-24 17-55 26-96 26s-72-9-95-26Z" className="scene-craft-light" />
        <circle cx="357" cy="150" r="9" className="scene-eye" />
        <path d="M357 186v36m-36-2 36 28 36-28m-36 28v36m-68-132-43-12m176 12 43-12" className="scene-beam" />
        <path d="M174 47h18m-9-9v18m275 23h18m-9-9v18M191 262c21-14 27-29 15-44m245 45c-20-17-22-33-8-47" className="scene-detail" />
      </g>}

      {id === "deep_sea_terror" && <g className="scene-ink scene-deepsea">
        <path d="M0 47c37 18 58-18 96 0s58 18 96 0 58-18 96 0 58 18 96 0 58-18 96 0 58 18 96 0 43-15 64-4" className="scene-wave" />
        <path d="M0 67c37 18 58-18 96 0s58 18 96 0 58-18 96 0 58 18 96 0 58-18 96 0 58 18 96 0 43-15 64-4" className="scene-wave" />
        <path d="M82 284V184l51-43 52 43v100m-116-99h128l-64-55Zm22 99v-61h35v61" />
        <path d="M104 206h19v22h-19zm39 0h19v22h-19z" className="scene-window" />
        <path d="M411 284V161l50-37 49 37v123m-109-121h120l-60-47Z" />
        <path d="M437 189h51v95h-51zm18 18h17v50h-17z" className="scene-window" />
        <path d="M0 287h640m-305-5c-24-34-14-68 13-98 31 27 37 64 16 98m-15-85v86m-21-58-35-16m71 21 37-28m-71 55-31 21m69-19 36 18" className="scene-tentacle" />
        <path d="M272 283c-18-26-15-47 4-64 21 21 24 43 9 64Zm10-47v48" className="scene-creature" />
        <circle cx="299" cy="91" r="29" className="scene-sonar" />
        <circle cx="299" cy="91" r="15" className="scene-sonar" />
        <path d="m299 91 24-17" className="scene-sonar-beam" />
      </g>}

      {id === "cryptid_woods" && <g className="scene-ink scene-cryptid">
        <circle cx="464" cy="82" r="40" className="scene-moon" />
        <path d="m10 289 53-156 55 156Zm33-65h39M95 289l66-216 66 216Zm40-90h54m-20 90 49-154 48 154m79 0 63-204 65 204Zm39-92h50m-2 92 43-139 44 139" />
        <path d="M246 288V167l73-62 75 62v121m-168-120h187l-94-79Zm29 120v-74h44v74m38 0v-74h46v74" />
        <path d="M276 171h17v24h-17zm61 0h17v24h-17z" className="scene-window" />
        <path d="M453 126c17-32 42-40 62-13m-56-19c1-38 24-63 54-58 32 5 40 34 31 69m-60 8-31-13m70 10 29-18m-54 8-4-40m23 42 14-32m-48 54-30 28m66-32 34 25" className="scene-cryptid-form" />
        <path d="M469 115h8m38-5h8m-36 24 12 4 11-7" className="scene-eyes" />
        <path d="M0 290h640m-375-3c-19-16-20-31-3-44m2 47c18-18 17-34 0-48m6 48c23-9 31-22 22-39" className="scene-creek" />
        <path d="M214 48c-20 1-29 14-22 30m231 0c21-6 31 2 30 17" className="scene-detail" />
      </g>}

      <path className="scene-ground" d="M0 291h640v49H0z" />
      <path className="scene-registration" d="M12 12h22M12 12v22m616-22h-22m22 0v22M12 328h22m-22 0v-22m616 22h-22m22 0v-22" />
      <path className="scene-grain-line" d="M0 314h640M0 322h640M0 330h640" />
    </svg>
  );
}
