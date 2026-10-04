export function JourneyArt({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 560 440"
      fill="none"
      aria-hidden="true"
      className={compact ? "journey-art compact" : "journey-art"}
    >
      <circle cx="300" cy="218" r="184" fill="var(--art-wash)" />
      <g className="map-sheet" transform="rotate(-8 280 230)">
        <path
          d="M62 110 204 81 348 106 487 77V351L348 381 204 355 62 384Z"
          fill="var(--art-paper)"
          stroke="var(--art-ink)"
          strokeWidth="1.5"
        />
        <path
          d="M204 81V355M348 106V381"
          stroke="var(--art-ink)"
          strokeOpacity=".2"
        />
        <path
          d="m63 301 75-46 69 26 76-114 68 41 136-50"
          stroke="var(--art-wash)"
          strokeWidth="32"
        />
        <path
          d="m63 301 75-46 69 26 76-114 68 41 136-50"
          stroke="var(--art-paper)"
          strokeWidth="2"
          strokeDasharray="5 7"
        />
        <path
          d="m97 116 29 49 91-2 46 41 66-68 67 111 89 18M100 371l48-53 69 9 52-70 115 60 59-5M67 208l116-2 51 24 101 5 69-26 83 62"
          stroke="var(--art-ink)"
          strokeOpacity=".15"
          strokeWidth="2"
        />
        <g stroke="var(--art-ink)" strokeWidth="1.6" strokeLinejoin="round">
          <path d="m112 216 40-19 38 19-38 20Z" fill="var(--art-paper)" />
          <path
            d="M112 216v-47l40-19v47m0-47 38 19v47l-38 20v-39"
            fill="var(--art-building)"
          />
          <path d="m112 169 40 18 38-18m-27 22v10m12-16v10m-50-18v10m13-4v10" />
          <path d="m310 323 37-18 47 19-38 20Z" fill="var(--art-paper)" />
          <path
            d="M310 323v-54l37-18 47 19v54l-38 20v-54Z"
            fill="var(--art-building)"
          />
          <path d="m310 269 37 18 47-17m-70 18v11m12-5v11m34-11v11m12-16v11" />
          <path
            d="m368 158 33-16 35 16v39l-34 16-34-17Z"
            fill="var(--art-building)"
          />
          <path
            d="m364 158 37-31 39 31-38 19Zm38 19v36m12-43v12m12-18v12"
            fill="var(--art-paper)"
          />
          <path
            d="m220 148 21-11 22 11-22 11Zm0 0v28l21 11 22-11v-28m-22 11v28"
            fill="var(--art-building)"
          />
        </g>
        <g fill="var(--art-ink)">
          <path d="M104 330v-20m0 5c-23 0-17-29 0-33 17 4 23 33 0 33M435 295v-18m0 5c-21 0-15-27 0-31 15 4 21 31 0 31M279 354v-15m0 4c-18 0-13-23 0-26 13 3 18 26 0 26" />
        </g>
        <path
          className="journey-route"
          d="M158 277c36 37 61-1 86-37s54-21 69-12 49 12 66-1"
          stroke="var(--art-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 7"
        />
        <circle
          cx="158"
          cy="277"
          r="7"
          fill="var(--art-accent)"
          stroke="var(--art-paper)"
          strokeWidth="3"
        />
        <g transform="translate(370 190)">
          <path
            d="M0 15C-29-15-13-34 0-34S29-15 0 15Z"
            fill="var(--art-accent)"
          />
          <circle cy="-17" r="6" fill="var(--art-paper)" />
        </g>
      </g>
      <g
        transform="rotate(13 437 84)"
        stroke="var(--art-accent)"
        className="journey-stamp"
      >
        <circle cx="437" cy="84" r="47" strokeWidth="2" />
        <circle cx="437" cy="84" r="39" strokeDasharray="2 4" />
        <path
          d="m416 85 14 14 27-30"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M422 59h30m-30 52h30" strokeWidth="1.5" />
      </g>
      <g stroke="var(--art-ink)" strokeWidth="1.5">
        <path d="M56 68h22M67 57v22M490 365h18m-9-9v18" />
        <path d="m54 410 50-10m-38 17 16-3" strokeOpacity=".4" />
      </g>
    </svg>
  );
}

export function CollectionArt({ variant }: { variant: number }) {
  if (variant === 0) return <JourneyArt compact />;
  return (
    <svg
      viewBox="0 0 560 440"
      fill="none"
      aria-hidden="true"
      className="journey-art compact"
    >
      <circle cx="280" cy="220" r="164" fill="var(--art-wash)" />
      {variant === 1 ? (
        <g
          transform="rotate(-12 280 220)"
          stroke="var(--art-ink)"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <path d="M137 106h178v237H137z" fill="var(--art-building)" />
          <path d="M148 95h180v236H148z" fill="var(--art-paper)" />
          <path
            d="M165 95v236M197 143h91M197 160h64M197 264h91M197 282h62"
            strokeOpacity=".45"
          />
          <path
            d="M211 201h54v38h-54zM204 201l34-24 34 24m-34 0v38m-15-25h7m15 0h7"
            fill="var(--art-building)"
          />
          <g transform="rotate(26 344 235)">
            <path
              d="M299 145h103v181H299v-41a12 12 0 0 0 0-24v-56a12 12 0 0 0 0-24Z"
              fill="var(--art-paper)"
            />
            <path d="M308 278h85" strokeDasharray="4 5" />
            <circle cx="350" cy="219" r="25" stroke="var(--art-accent)" />
            <path
              d="m337 219 9 9 17-21M327 300h44"
              stroke="var(--art-accent)"
            />
          </g>
        </g>
      ) : (
        <g stroke="var(--art-ink)" strokeWidth="2">
          <path
            d="M91 298c78-70 113-11 179-35s100-32 180 25"
            strokeOpacity=".35"
          />
          <path
            d="M115 325c44-22 72-17 104-2m104-23c57-18 92-5 119 12"
            strokeOpacity=".2"
          />
          <circle cx="280" cy="205" r="95" fill="var(--art-paper)" />
          <circle cx="280" cy="205" r="81" strokeDasharray="2 8" />
          <path d="M280 105v17m0 166v17M180 205h17m166 0h17" />
          <path d="m254 230 13-38 39-13-13 39Z" fill="var(--art-building)" />
          <path
            d="m280 205 26-26-13 39Z"
            fill="var(--art-accent)"
            stroke="var(--art-accent)"
          />
          <circle cx="280" cy="205" r="5" fill="var(--art-paper)" />
          <path
            d="M152 285v-77m0 27c-31 0-28-38-6-45m7 68c28-3 38-31 25-46M409 284v-58m0 22c-21-1-26-23-16-36m17 54c25-2 33-25 20-36"
            strokeLinecap="round"
          />
          <path
            d="M119 348h70m201-14h48M279 73v12m-6-6h12"
            strokeOpacity=".5"
          />
        </g>
      )}
    </svg>
  );
}
