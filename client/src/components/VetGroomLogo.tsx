interface VetGroomLogoProps {
  className?: string;
}

export function VetGroomLogo({ className = "w-8 h-8" }: VetGroomLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dog head */}
      <ellipse cx="50" cy="45" rx="20" ry="18" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
      
      {/* Dog ears */}
      <ellipse cx="35" cy="35" rx="8" ry="12" fill="#654321" transform="rotate(-30 35 35)"/>
      <ellipse cx="65" cy="35" rx="8" ry="12" fill="#654321" transform="rotate(30 65 35)"/>
      
      {/* Inner ears */}
      <ellipse cx="36" cy="36" rx="4" ry="7" fill="#D2691E" transform="rotate(-30 36 36)"/>
      <ellipse cx="64" cy="36" rx="4" ry="7" fill="#D2691E" transform="rotate(30 64 36)"/>
      
      {/* Dog snout */}
      <ellipse cx="50" cy="52" rx="8" ry="6" fill="#DEB887"/>
      
      {/* Nose */}
      <ellipse cx="50" cy="50" rx="2" ry="1.5" fill="#000"/>
      
      {/* Eyes */}
      <circle cx="44" cy="42" r="2.5" fill="#000"/>
      <circle cx="56" cy="42" r="2.5" fill="#000"/>
      <circle cx="45" cy="41" r="0.8" fill="#FFF"/>
      <circle cx="57" cy="41" r="0.8" fill="#FFF"/>
      
      {/* Mouth */}
      <path d="M50 52 Q45 56 42 54" stroke="#000" strokeWidth="1" fill="none"/>
      <path d="M50 52 Q55 56 58 54" stroke="#000" strokeWidth="1" fill="none"/>
      
      {/* Stethoscope - earpieces */}
      <circle cx="25" cy="25" r="3" fill="#C0C0C0" stroke="#808080" strokeWidth="1"/>
      <circle cx="75" cy="25" r="3" fill="#C0C0C0" stroke="#808080" strokeWidth="1"/>
      
      {/* Stethoscope - tubes from earpieces */}
      <path d="M25 28 Q30 35 35 45" stroke="#2E8B57" strokeWidth="2.5" fill="none"/>
      <path d="M75 28 Q70 35 65 45" stroke="#2E8B57" strokeWidth="2.5" fill="none"/>
      
      {/* Stethoscope - main tube */}
      <path d="M35 45 Q42 50 50 55 Q58 50 65 45" stroke="#2E8B57" strokeWidth="2.5" fill="none"/>
      
      {/* Stethoscope - chest piece */}
      <circle cx="50" cy="65" r="6" fill="#C0C0C0" stroke="#808080" strokeWidth="1.5"/>
      <circle cx="50" cy="65" r="4" fill="#E6E6E6"/>
      
      {/* Stethoscope - connecting tube to chest piece */}
      <path d="M50 55 Q50 58 50 59" stroke="#2E8B57" strokeWidth="2.5" fill="none"/>
      
      {/* Medical cross on chest piece */}
      <rect x="48" y="62" width="4" height="1.5" fill="#FF0000" rx="0.2"/>
      <rect x="49.25" y="60.75" width="1.5" height="4" fill="#FF0000" rx="0.2"/>
    </svg>
  );
}