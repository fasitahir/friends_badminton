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
}

export default function WinRateChart({ data }: WinRateChartProps) {
  return (
    <ResponsiveContainer width="99%" height="100%" minHeight={1}>
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
            const isElite = entry.winRate >= 65;
            return (
              <Cell
                key={`cell-${index}`}
                fill={isElite ? "#E61919" : "currentColor"}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
