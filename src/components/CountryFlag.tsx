import React from 'react';
import { Shield } from 'lucide-react';

interface CountryFlagProps {
  teamName: string;
  className?: string;
}

// Map of display names from ESPN API to ISO 2-letter codes.
// This is comprehensive and supports both English display names (ESPN standard) and Spanish equivalents.
const TEAM_FLAG_MAP: { [key: string]: string } = {
  // CONMEBOL
  'argentina': 'ar',
  'bolivia': 'bo',
  'brazil': 'br',
  'brasil': 'br',
  'chile': 'cl',
  'colombia': 'co',
  'ecuador': 'ec',
  'paraguay': 'py',
  'peru': 'pe',
  'perú': 'pe',
  'uruguay': 'uy',
  'venezuela': 've',

  // CONCACAF
  'mexico': 'mx',
  'méxico': 'mx',
  'usa': 'us',
  'united states': 'us',
  'estados unidos': 'us',
  'canada': 'ca',
  'canadá': 'ca',
  'costa rica': 'cr',
  'honduras': 'hn',
  'jamaica': 'jm',
  'panama': 'pa',
  'panamá': 'pa',
  'el salvador': 'sv',
  'guatemala': 'gt',
  'trinidad & tobago': 'tt',
  'trinidad and tobago': 'tt',
  'haiti': 'ht',
  'haití': 'ht',
  'cuba': 'cu',

  // UEFA
  'england': 'gb-eng',
  'inglaterra': 'gb-eng',
  'scotland': 'gb-sct',
  'escocia': 'gb-sct',
  'wales': 'gb-wls',
  'gales': 'gb-wls',
  'northern ireland': 'gb-nir',
  'irlanda del norte': 'gb-nir',
  'spain': 'es',
  'españa': 'es',
  'france': 'fr',
  'francia': 'fr',
  'germany': 'de',
  'alemania': 'de',
  'italy': 'it',
  'italia': 'it',
  'netherlands': 'nl',
  'holanda': 'nl',
  'países bajos': 'nl',
  'portugal': 'pt',
  'belgium': 'be',
  'bélgica': 'be',
  'croatia': 'hr',
  'croacia': 'hr',
  'denmark': 'dk',
  'dinamarca': 'dk',
  'switzerland': 'ch',
  'suiza': 'ch',
  'sweden': 'se',
  'suecia': 'se',
  'norway': 'no',
  'noruega': 'no',
  'austria': 'at',
  'poland': 'pl',
  'polonia': 'pl',
  'ukraine': 'ua',
  'ucrania': 'ua',
  'turkey': 'tr',
  'turquía': 'tr',
  'czechia': 'cz',
  'república checa': 'cz',
  'czech republic': 'cz',
  'hungary': 'hu',
  'hungría': 'hu',
  'romania': 'ro',
  'rumania': 'ro',
  'slovakia': 'sk',
  'eslovaquia': 'sk',
  'slovenia': 'si',
  'eslovenia': 'si',
  'georgia': 'ge',
  'serbia': 'rs',
  'albania': 'al',
  'finland': 'fi',
  'finlandia': 'fi',
  'greece': 'gr',
  'grecia': 'gr',
  'ireland': 'ie',
  'irlanda': 'ie',
  'iceland': 'is',
  'islandia': 'is',

  // CAF
  'south africa': 'za',
  'sudáfrica': 'za',
  'nigeria': 'ng',
  'egypt': 'eg',
  'egipto': 'eg',
  'senegal': 'sn',
  'morocco': 'ma',
  'marruecos': 'ma',
  'tunisia': 'tn',
  'túnez': 'tn',
  'algeria': 'dz',
  'argelia': 'dz',
  'cameroon': 'cm',
  'camerún': 'cm',
  'ghana': 'gh',
  'ivory coast': 'ci',
  'cote d\'ivoire': 'ci',
  'cote d’ivoire': 'ci',
  'costa de marfil': 'ci',
  'mali': 'ml',
  'malí': 'ml',
  'dr congo': 'cd',
  'congo dr': 'cd',
  'angola': 'ao',
  'burkina faso': 'bf',
  'cape verde': 'cv',
  'guinea': 'gn',

  // AFC
  'japan': 'jp',
  'japón': 'jp',
  'south korea': 'kr',
  'corea del sur': 'kr',
  'korea republic': 'kr',
  'australia': 'au',
  'saudi arabia': 'sa',
  'arabia saudita': 'sa',
  'iran': 'ir',
  'irán': 'ir',
  'iraq': 'iq',
  'irak': 'iq',
  'qatar': 'qa',
  'catar': 'qa',
  'uae': 'ae',
  'united arab emirates': 'ae',
  'emiratos árabes': 'ae',
  'china': 'cn',
  'uzbekistan': 'uz',
  'uzbekistán': 'uz',
  'oman': 'om',
  'omán': 'om',
  'jordan': 'jo',
  'jordania': 'jo',

  // OFC
  'new zealand': 'nz',
  'nueva zelanda': 'nz',
};

export default function CountryFlag({ teamName, className = 'h-5 w-7' }: CountryFlagProps) {
  const normalized = (teamName || '').trim().toLowerCase();
  
  // Check if TBD or group winner placeholder
  const isTbd = !normalized || 
                normalized === 'tbd' || 
                normalized.includes('winner') || 
                normalized.includes('play-off') || 
                normalized.includes('grupo') || 
                normalized.includes('group') ||
                normalized.includes('ganador') ||
                normalized.includes('por definir');
                
  if (isTbd) {
    return (
      <div className={`flex items-center justify-center bg-slate-800 text-slate-400 rounded border border-slate-700 shadow-sm shrink-0 ${className}`}>
        <Shield className="h-3 w-3" />
      </div>
    );
  }
  
  const code = TEAM_FLAG_MAP[normalized];
  if (code) {
    return (
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
        alt={`Bandera de ${teamName}`}
        className={`object-cover rounded border border-slate-800/20 shadow-sm shrink-0 ${className}`}
        loading="lazy"
        onError={(e) => {
          // If image load fails, replace with fallback shield
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }
  
  // If not found in map, show fallback
  return (
    <div className={`flex items-center justify-center bg-slate-800 text-slate-500 rounded border border-slate-700 shadow-sm shrink-0 ${className}`}>
      <span className="text-[9px] font-bold uppercase">{normalized.substring(0, 3)}</span>
    </div>
  );
}
