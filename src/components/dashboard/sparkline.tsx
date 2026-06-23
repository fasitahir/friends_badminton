"use client";

import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface SparklineProps {
  data: number[];
}

export function Sparkline({ data }: SparklineProps) {
  if (!data || data.length < 2) return <div className="w-16 h-6" />;

  const chartData = data.map((val, i) => ({ index: i, value: val }));
  
  // Calculate min and max for the Y axis to give the sparkline some dynamic range
  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = (max - min) * 0.1 || 10;

  return (
    <div className="w-16 h-8 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke="currentColor"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
