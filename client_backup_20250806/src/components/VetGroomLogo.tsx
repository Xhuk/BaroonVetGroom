interface VetGroomLogoProps {
  className?: string;
}

export function VetGroomLogo({ className = "w-8 h-8" }: VetGroomLogoProps) {
  return (
    <div className={`${className} bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-200`}>
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full p-1"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dog head - main */}
        <ellipse cx="60" cy="55" rx="22" ry="20" fill="#8B4513" stroke="#654321" strokeWidth="2"/>
        
        {/* Dog ears */}
        <ellipse cx="42" cy="42" rx="10" ry="15" fill="#654321" transform="rotate(-25 42 42)"/>
        <ellipse cx="78" cy="42" rx="10" ry="15" fill="#654321" transform="rotate(25 78 42)"/>
        
        {/* Inner ears */}
        <ellipse cx="44" cy="44" rx="5" ry="8" fill="#DEB887" transform="rotate(-25 44 44)"/>
        <ellipse cx="76" cy="44" rx="5" ry="8" fill="#DEB887" transform="rotate(25 76 44)"/>
        
        {/* Dog snout */}
        <ellipse cx="60" cy="65" rx="10" ry="8" fill="#DEB887" stroke="#CD853F" strokeWidth="1"/>
        
        {/* Nose */}
        <ellipse cx="60" cy="62" rx="3" ry="2" fill="#000"/>
        
        {/* Eyes */}
        <circle cx="52" cy="50" r="3" fill="#000"/>
        <circle cx="68" cy="50" r="3" fill="#000"/>
        <circle cx="53" cy="49" r="1" fill="#FFF"/>
        <circle cx="69" cy="49" r="1" fill="#FFF"/>
        
        {/* Mouth */}
        <path d="M60 65 Q55 70 50 68" stroke="#000" strokeWidth="2" fill="none"/>
        <path d="M60 65 Q65 70 70 68" stroke="#000" strokeWidth="2" fill="none"/>
        
        {/* Stethoscope - earpieces */}
        <circle cx="30" cy="30" r="4" fill="#C0C0C0" stroke="#808080" strokeWidth="2"/>
        <circle cx="90" cy="30" r="4" fill="#C0C0C0" stroke="#808080" strokeWidth="2"/>
        
        {/* Stethoscope - tubes */}
        <path d="M30 34 Q35 45 45 55" stroke="#2E8B57" strokeWidth="4" fill="none"/>
        <path d="M90 34 Q85 45 75 55" stroke="#2E8B57" strokeWidth="4" fill="none"/>
        
        {/* Stethoscope - main tube connecting both sides */}
        <path d="M45 55 Q52 65 60 70 Q68 65 75 55" stroke="#2E8B57" strokeWidth="4" fill="none"/>
        
        {/* Stethoscope - chest piece */}
        <circle cx="60" cy="85" r="8" fill="#C0C0C0" stroke="#808080" strokeWidth="2"/>
        <circle cx="60" cy="85" r="6" fill="#E6E6E6"/>
        
        {/* Connection from main tube to chest piece */}
        <path d="M60 70 L60 77" stroke="#2E8B57" strokeWidth="4" fill="none"/>
        
        {/* Medical cross on chest piece */}
        <rect x="57" y="82" width="6" height="2" fill="#FF0000" rx="0.5"/>
        <rect x="59" y="80" width="2" height="6" fill="#FF0000" rx="0.5"/>
      </svg>
    </div>
  );
}