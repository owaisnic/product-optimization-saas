import { cn, getScoreBgColor } from "../lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreRing({
  score,
  size = "md",
  showLabel = true,
}: ScoreRingProps) {
  const sizes = {
    sm: { width: 48, stroke: 4, text: "text-sm" },
    md: { width: 80, stroke: 6, text: "text-xl" },
    lg: { width: 120, stroke: 8, text: "text-3xl" },
  };

  const { width, stroke, text } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={width} height={width} className="-rotate-90">
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            getScoreBgColor(score),
            "transition-all duration-500 ease-out",
          )}
          style={{ color: "inherit" }}
        />
      </svg>
      {showLabel && (
        <div className={cn("absolute font-bold", text)}>{score}</div>
      )}
    </div>
  );
}
