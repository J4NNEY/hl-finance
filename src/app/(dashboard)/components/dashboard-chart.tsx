"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatIDR } from "@/lib/utils/currency";

interface ChartData {
  month: string;
  omzet: number;
  laba: number;
}

export function DashboardChart({ data }: { data: ChartData[] }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const gridColor = isDark ? "#292524" : "#e7e2dc";
  const textColor = isDark ? "#a8a29e" : "#78716c";
  const tooltipBg = isDark ? "#1c1917" : "#fff";
  const tooltipBorder = isDark ? "#292524" : "#e0dcd7";
  const activeDotStroke = isDark ? "#1c1917" : "#fff";

  return (
    <div className="h-[260px] w-full min-w-0">
      {mounted && (
        <ResponsiveContainer width="100%" height={260} minWidth={0}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradOmzet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={isDark ? 0.2 : 0.12} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradLaba" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={isDark ? 0.2 : 0.12} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: textColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: textColor }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000000
                  ? `${(v / 1000000).toFixed(0)}jt`
                  : v >= 1000
                    ? `${(v / 1000).toFixed(0)}rb`
                    : v.toString()
              }
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                border: `1px solid ${tooltipBorder}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                background: tooltipBg,
                color: textColor,
              }}
              formatter={(value) => [
                formatIDR(Number(value)),
                "Omzet",
              ]}
              labelFormatter={(label) => `${label}`}
            />
            <Area
              type="monotone"
              dataKey="omzet"
              stroke={isDark ? "#818cf8" : "#4338ca"}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gradOmzet)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: activeDotStroke }}
            />
            <Area
              type="monotone"
              dataKey="laba"
              stroke={isDark ? "#34d399" : "#059669"}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gradLaba)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: activeDotStroke }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
