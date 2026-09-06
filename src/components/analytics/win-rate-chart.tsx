"use client";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
} from "recharts";

interface WinRateChartProps {
  data: { name: string; winRate: number; played: number }[];
  height?: number;
}

export default function WinRateChart({ data, height }: WinRateChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer
      width="100%"
      height={height ?? "100%"}
      minWidth={0}
      minHeight={height ?? 260}
      initialDimension={{ width: 500, height: height ?? 260 }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={60}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          interval={0}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0px",
            color: "var(--foreground)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
          formatter={(value: any) => [`${value}%`, "WIN RATE"]}
        />
        <Bar dataKey="winRate" radius={0}>
          {data.map((entry, index) => {
            const isTop = index === 0;
            return (
              <Cell
                key={`cell-${index}`}
                fill={isTop ? "var(--aviation-red)" : "var(--foreground)"}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
