import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

interface RainfallChartProps {
  data: any[];
  threshold?: number;
  triggerType?: 'below' | 'above';
}

export const RainfallChart: React.FC<RainfallChartProps> = ({
  data,
  threshold = 100,
  triggerType = 'below',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
        No precipitation readings recorded yet
      </div>
    );
  }

  return (
    <div className="w-full h-56 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} unit=" mm" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />

          {/* Trigger Threshold Reference Line */}
          <ReferenceLine
            y={threshold}
            label={{
              value: `Threshold: ${threshold} mm (${triggerType})`,
              fill: '#e11d48',
              fontSize: 11,
              position: 'top',
            }}
            stroke="#e11d48"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />

          <Area
            type="monotone"
            dataKey="verified_rainfall"
            name="Verified Median (mm)"
            fill="url(#rainGradient)"
            stroke="#059669"
            strokeWidth={2.5}
          />
          <Line
            type="monotone"
            dataKey="source_1"
            name="Oracle 1 (IMD)"
            stroke="#3b82f6"
            strokeWidth={1}
            dot={false}
            strokeDasharray="2 2"
          />
          <Line
            type="monotone"
            dataKey="source_2"
            name="Oracle 2 (Skymet)"
            stroke="#8b5cf6"
            strokeWidth={1}
            dot={false}
            strokeDasharray="2 2"
          />
          <Line
            type="monotone"
            dataKey="source_3"
            name="Oracle 3 (ECMWF)"
            stroke="#f59e0b"
            strokeWidth={1}
            dot={false}
            strokeDasharray="2 2"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
