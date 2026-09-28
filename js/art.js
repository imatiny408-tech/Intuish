/* Colored illustration for each subject */
window.ART = {
  acting:`<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="200" height="160" fill="#8B1E2B"/>
    ${Array.from({length:8},(_,i)=>`<rect x="${i*26}" y="0" width="12" height="160" fill="#6E1520" opacity=".75"/>`).join("")}
    <path d="M0 0h200v16c-20 10-40 10-50 0-10 10-40 10-50 0-10 10-40 10-50 0-10 10-40 10-50 0z" fill="#5A0F18"/>
    <path d="M100 8 L36 160 L164 160 Z" fill="#FFE08A" opacity=".28"/>
    <ellipse cx="100" cy="150" rx="74" ry="11" fill="#FFD56B" opacity=".45"/>
    <g transform="rotate(-12 78 92)"><path d="M50 62h56v30c0 22-12 38-28 38s-28-16-28-38z" fill="#F4C542" stroke="#6B4A00" stroke-width="3"/>
      <ellipse cx="66" cy="82" rx="7" ry="5" fill="#3A2600"/><ellipse cx="90" cy="82" rx="7" ry="5" fill="#3A2600"/>
      <path d="M64 104q14 12 28 0" fill="none" stroke="#3A2600" stroke-width="3.5" stroke-linecap="round"/></g>
    <g transform="rotate(12 124 98)"><path d="M96 68h56v30c0 22-12 38-28 38s-28-16-28-38z" fill="#EDE7DA" stroke="#2A2A2A" stroke-width="3"/>
      <ellipse cx="112" cy="88" rx="7" ry="5" fill="#2A2A2A"/><ellipse cx="136" cy="88" rx="7" ry="5" fill="#2A2A2A"/>
      <path d="M110 118q14 -12 28 0" fill="none" stroke="#2A2A2A" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M113 94v8" stroke="#3E7FD6" stroke-width="3" stroke-linecap="round"/></g>
  </svg>`,
  hiset:`<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="200" height="160" fill="#DCE9FB"/>
    ${[30,50,70,90,110,130].map(y=>`<path d="M0 ${y}h200" stroke="#B9D0F2" stroke-width="1.5"/>`).join("")}
    <path d="M26 0v160" stroke="#F19999" stroke-width="2"/>
    <circle cx="74" cy="70" r="38" fill="#2E6FD8"/>
    <rect x="92" y="62" width="64" height="64" rx="12" fill="#3BAA6B"/>
    <path d="M56 138 L88 86 L120 138 Z" fill="#E5484D" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
    <text x="126" y="110" font-family="Quicksand,Arial" font-weight="700" font-size="26" fill="#FFFFFF" text-anchor="middle">x²</text>
    <g transform="rotate(45 150 50)"><rect x="140" y="4" width="20" height="74" rx="3" fill="#F6C343" stroke="#6B4A00" stroke-width="2.5"/>
      <rect x="140" y="-6" width="20" height="12" rx="3" fill="#F29AB3" stroke="#6B4A00" stroke-width="2.5"/>
      <path d="M140 78l10 20 10-20z" fill="#F3D9B1" stroke="#6B4A00" stroke-width="2.5" stroke-linejoin="round"/><path d="M146.5 91l3.5 7 3.5-7z" fill="#333"/></g>
  </svg>`,
  anatomy:`<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="200" height="160" fill="#FCE4E4"/>
    <circle cx="100" cy="84" r="64" fill="#F8CFD1"/>
    <path d="M86 44c-4-16 4-30 18-32" stroke="#3E7FD6" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M108 46c2-18 18-26 32-20" stroke="#C0263A" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M100 140C60 112 40 90 40 64c0-18 14-32 31-32 13 0 23 7 29 18 6-11 16-18 29-18 17 0 31 14 31 32 0 26-20 48-60 76z" fill="#D8343F"/>
    <path d="M70 62c-8 10-6 26 6 34M126 58c6 12 2 26-10 34" stroke="#A31F2D" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M70 48c-8 0-14 6-15 14" stroke="#F58A94" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M12 96h44l10-20 14 40 12-30 8 10h88" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`,
  psych:`<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="200" height="160" fill="#ECE3FA"/>
    <path d="M70 160v-36c-18-10-28-28-28-50 0-34 26-58 60-58s58 22 58 54c0 10-2 18-6 26l12 20h-14v14c0 8-6 14-14 14h-18v16z" fill="#7A4FC2"/>
    <g fill="#F4A6C4"><circle cx="86" cy="64" r="17"/><circle cx="106" cy="52" r="19"/><circle cx="126" cy="66" r="16"/><circle cx="96" cy="84" r="16"/><circle cx="118" cy="84" r="15"/></g>
    <path d="M84 66q10-8 20 0t20 0M96 84q10-6 22 0M104 52v12" stroke="#D96F9A" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="160" cy="34" r="7" fill="#F6C343"/><circle cx="176" cy="18" r="4.5" fill="#F6C343" opacity=".8"/><circle cx="148" cy="16" r="3" fill="#F6C343" opacity=".6"/>
  </svg>`,
  spanish:`<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="200" height="160" fill="#FFE7B3"/>
    <circle cx="160" cy="30" r="18" fill="#F6B73C"/>
    <path d="M22 34h96a14 14 0 0 1 14 14v34a14 14 0 0 1-14 14H62l-22 18 4-18H22A14 14 0 0 1 8 82V48a14 14 0 0 1 14-14z" fill="#D7263D"/>
    <text x="70" y="75" font-family="Quicksand,Arial" font-weight="700" font-size="28" fill="#FFFFFF" text-anchor="middle">¡Hola!</text>
    <path d="M84 96h92a14 14 0 0 1 14 14v22a14 14 0 0 1-14 14h-10l4 14-20-14H84a14 14 0 0 1-14-14v-22a14 14 0 0 1 14-14z" fill="#1B998B"/>
    <text x="130" y="129" font-family="Quicksand,Arial" font-weight="700" font-size="22" fill="#FFFFFF" text-anchor="middle">¿Qué tal?</text>
  </svg>`,
  music:`<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="200" height="160" fill="#DDF1EE"/>
    ${[26,38,50,62,74].map(y=>`<path d="M0 ${y}h200" stroke="#0F5C63" stroke-width="2" opacity=".35"/>`).join("")}
    <g fill="#0F5C63"><ellipse cx="62" cy="68" rx="11" ry="8" transform="rotate(-20 62 68)"/><rect x="70" y="22" width="4" height="46"/>
      <ellipse cx="118" cy="56" rx="11" ry="8" transform="rotate(-20 118 56)"/><ellipse cx="150" cy="44" rx="11" ry="8" transform="rotate(-20 150 44)"/>
      <rect x="126" y="12" width="4" height="44"/><rect x="158" y="2" width="4" height="42"/><path d="M126 12l36-10v8l-36 10z"/></g>
    <rect x="10" y="96" width="180" height="58" rx="10" fill="#FFFFFF" stroke="#0F5C63" stroke-width="3"/>
    ${[0,1,2,3,4,5,6,7].map(i=>`<path d="M${10+i*22.5} 96v58" stroke="#0F5C63" stroke-width="2"/>`).join("")}
    ${[1,2,4,5,6].map(i=>`<rect x="${10+i*22.5-7}" y="96" width="14" height="34" rx="3" fill="#1D1D1D"/>`).join("")}
    <rect x="${10+3*22.5+2}" y="130" width="18" height="22" rx="3" fill="#FF7A59"/>
  </svg>`,
};
