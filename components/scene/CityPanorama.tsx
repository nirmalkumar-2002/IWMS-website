import { useId } from 'react';
import { Truck } from './Truck';
import { House } from './House';
import { Bin } from './Bin';
import { Tree } from './Tree';
import { Worker } from './Worker';
import { experienceContent } from '@/content/experience';

/** Decorative continuous world. ScrollExperience owns camera and vehicle transforms. */
export function CityPanorama() {
  const id = `world-${useId().replaceAll(':', '')}`;
  const url = (name: string) => `url(#${id}-${name})`;
  return (
    <svg className="experience-world" viewBox="0 0 1200 760" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor="#081623" />
          <stop offset=".65" stopColor="#19392f" />
          <stop offset="1" stopColor="#788b66" />
        </linearGradient>
        <linearGradient id={`${id}-terrain`} x2="0" y2="1">
          <stop stopColor="#69805b" />
          <stop offset="1" stopColor="#183029" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x2="1" y2="1">
          <stop stopColor="#739ba0" />
          <stop offset="1" stopColor="#17343e" />
        </linearGradient>
        <radialGradient id={`${id}-haze`}>
          <stop stopColor="#c7e396" stopOpacity=".27" />
          <stop offset="1" stopColor="#c7e396" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-road`} width="180" height="80" patternUnits="userSpaceOnUse">
          <path d="M20 40h85" stroke="#c5d5c7" strokeWidth="3" strokeOpacity=".5" />
        </pattern>
        <pattern id={`${id}-windows`} width="34" height="36" patternUnits="userSpaceOnUse">
          <rect x="8" y="10" width="12" height="15" rx="1" fill="#c5dfba" opacity=".14" />
        </pattern>
        <g id={`${id}-homes`}>
          <svg x="55" y="290" width="270" height="270"><House /></svg>
          <svg x="415" y="330" width="220" height="220"><House /></svg>
          <svg x="315" y="460" width="60" height="78"><Bin tipProgress={0} showQr /></svg>
          <path d="M22 548h654" stroke="#bdc6ae" strokeWidth="5" />
        </g>
        <g id={`${id}-weighbridge`}>
          <path d="m85 420 30-25h430l45 25v20H85z" fill="#617c6b" />
          <path d="M108 438v111m455-111v111" stroke="#a3b3a1" strokeWidth="9" />
          <path d="M105 417h456" stroke="#c5d8a9" strokeWidth="4" />
          <path d="M80 551h520v19H80z" fill="#283e3b" />
          <path d="M85 551h510" stroke="#b7dc8e" strokeWidth="5" />
          <path d="M116 559h35m20 0h35m20 0h35m20 0h35m20 0h35m20 0h35m20 0h35m20 0h35" stroke="#879e8b" strokeWidth="3" />
          <path d="M603 550V412" stroke="#607e71" strokeWidth="6" />
          <rect x="564" y="390" width="81" height="42" rx="5" fill="#162d28" stroke="#90bd75" strokeWidth="2" />
          <path d="M580 410h10m6 0h10m6 0h10" stroke="#b8e785" strokeWidth="4" />
          <path d="m645 345 93 25v170h-93z" fill="#1e383c" />
          <path d="M558 345h87v195h-87z" fill="#537366" />
          <rect x="575" y="369" width="54" height="70" fill={url('glass')} />
        </g>
        <g id={`${id}-plant`}>
          <path d="M64 355 193 290v65l129-65v65l129-65v65h171v189H64z" fill="#4d6a60" />
          <path d="m622 355 75 38v151h-75z" fill="#263f3b" />
          <path d="M62 357h562" stroke="#98b390" strokeWidth="4" />
          {[110, 245, 380].map((x) => <g key={x}><rect x={x} y="392" width="86" height="60" fill={url('glass')} /><path d={`M${x + 28} 392v60m28-60v60`} stroke="#28483f" strokeWidth="3" /></g>)}
          <path d="M488 450h95v94h-95z" fill="#142e29" />
          <path d="M496 466h78m-78 17h78m-78 17h78m-78 17h78" stroke="#688570" strokeWidth="3" />
          <path d="M62 544h638" stroke="#b0c6a0" strokeWidth="5" />
          <path d="M75 330v-57h38v38M598 356V253h29v103" fill="#87a181" />
          <path d="M480 334h94l-22-25h-65z" fill="#273f40" />
          <path d="M487 318h65m-65 7h71" stroke="#688e99" strokeWidth="2" />
        </g>
        <g id={`${id}-landfill`}>
          <path d="M0 550 109 428l90-25 129-112 143 46 106 102 171 111z" fill="#46654a" />
          <path d="m199 403 129-112 143 46-159 22z" fill="#91ab71" />
          <path d="m312 359 159-22 106 102-89-15z" fill="#638458" />
          <path d="M105 471h475M60 514h612" fill="none" stroke="#b2c087" strokeWidth="5" opacity=".45" />
          <path d="M13 550h724" stroke="#ced1a5" strokeWidth="6" />
          <path d="M35 550V365h55" fill="none" stroke="#a0b6a1" strokeWidth="5" />
          <path d="M80 355h40v18H80z" fill="#ced8bb" /><circle cx="114" cy="364" r="6" fill="#123c36" />
        </g>
        <g id={`${id}-command`}>
          <path d="m120 273 130-48 342 0-120 48z" fill="#748f80" />
          <path d="M120 273h352v274H120z" fill="#3c5d57" />
          <path d="m472 273 120-48v322H472z" fill="#233e3b" />
          <path d="M141 296h309v148H141z" fill={url('glass')} />
          <path d="M190 296v148m55-148v148m55-148v148m55-148v148m55-148v148M141 345h309m-309 50h309" stroke="#a4bca4" strokeWidth="3" opacity=".4" />
          <path d="M268 468h68v79h-68z" fill="#8baaa2" />
          <path d="M139 458h311" stroke="#b8e785" strokeWidth="4" />
          <path d="M95 550h518" stroke="#a9c09b" strokeWidth="7" />
          <path d="M371 225v-58m-24 19 24-19 24 19" stroke="#9baea0" strokeWidth="4" fill="none" />
        </g>
      </defs>
      <rect width="1200" height="760" fill={url('sky')} />
      <ellipse cx="790" cy="310" rx="610" ry="370" fill={url('haze')} />
      <g data-world-distance opacity=".3">
        {[0, 1, 2, 3, 4, 5].map((n) => <g key={n} transform={`translate(${n * 670 - 200} 0)`}>
          <path d="M0 490V330h110v160h34V250h100v240h30V365h135v125h40V280h98v210h26V350h95v140z" fill="#577c72" />
          <path d="M0 490V330h110v160h34V250h100v240h30V365h135v125h40V280h98v210h26V350h95v140z" fill={url('windows')} />
        </g>)}
      </g>
      <path d="M0 487q410-32 1200 9v264H0z" fill={url('terrain')} />
      <g data-world-pan>
        {experienceContent.chapters.map((chapter, index) => <g key={chapter.id} transform={`translate(${index * 900 + 320} 0)`}>
          <ellipse cx="350" cy="548" rx="350" ry="18" fill="#0b1b33" opacity=".22" />
          <use href={`#${id}-${chapter.landmark}`} />
          <svg x="-160" y="315" width="130" height="240"><Tree /></svg>
          <svg x="720" y="370" width="100" height="175"><Tree /></svg>
        </g>)}
        <path d="M-1200 557h16000v10H-1200z" fill="#9bac97" />
        <path d="M-1200 567h16000v121H-1200z" fill="#233a35" />
        <path d="M-1200 573h16000M-1200 683h16000" stroke="#7f9587" strokeWidth="3" />
        <rect x="-1200" y="590" width="16000" height="80" fill={url('road')} />
      </g>
      <path d="M-20 666h1240" stroke="#a4dd65" strokeWidth="2" strokeDasharray="5 12" opacity=".4" />
      <g data-world-truck transform="translate(300 439)">
        <ellipse cx="171" cy="196" rx="164" ry="9" fill="#030c10" opacity=".3" />
        <svg width="350" height="204"><Truck progress={0} loadLevel={0.25} direction="right" showGps /></svg>
      </g>
      <g data-world-bin transform="translate(710 530)"><svg width="70" height="84"><Bin tipProgress={0} showQr /></svg></g>
      <g data-world-worker transform="translate(652 491)" opacity="0"><svg width="70" height="125"><Worker state="scanning" /></svg></g>
      <path data-world-scan d="m706 547 40-15v33z" fill="#b8e785" opacity="0" />
      <g data-world-network fill="none" stroke="#bbe78d" opacity="0">
        <path d="M170 400 560 250 890 360 1090 180M560 250v210M890 360v150" strokeWidth="1.5" strokeDasharray="6 9" />
        {[[170,400],[560,250],[890,360],[1090,180]].map(([x,y]) => <g key={x}><circle cx={x} cy={y} r="7" fill="#bbe78d" /><circle cx={x} cy={y} r="19" opacity=".3" /></g>)}
      </g>
      <path d="M0 715q600-25 1200 0v45H0z" fill="#10281f" />
    </svg>
  );
}
