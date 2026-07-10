/**
 * AIChatCharts — Visual chart renderer for AI chat responses
 *
 * Renders ChartConfig[] data (bar, horizontalBar, pie) using Recharts,
 * matching the app's orange/amber design language. Supports both
 * light and dark modes with consistent card sizing and overflow
 * containment to prevent chart elements from overlapping.
 */
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { ChartConfig, ChartDataPoint, TableColumn } from '../services/adminAiService';

// ─── Theme-aware colors ─────────────────────────────────────────────────────

function isDark(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

// ─── Shared Tooltip ─────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string;
  value: number;
  fill: string;
  dataKey: string;
  color: string;
  payload: ChartDataPoint & { secondaryValue?: number };
}

const ChartTooltip: React.FC<{ active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;
  const dark = isDark();
  return (
    <div
      className={`rounded-xl px-3 py-2 text-xs shadow-lg border backdrop-blur-sm ${
        dark
          ? 'bg-slate-800/95 border-slate-700 text-slate-200'
          : 'bg-white/95 border-slate-200 text-slate-800'
      }`}
    >
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((entry, idx) => (
        <p key={idx} className="flex items-center gap-2">
          {entry.color && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: entry.color }}
            />
          )}
          <span>
            {entry.name || entry.dataKey}: <strong>{Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(1)}</strong>
          </span>
        </p>
      ))}
    </div>
  );
};

// ─── Legend Renderer ────────────────────────────────────────────────────────

const legendDot = (color: string) => (
  <span
    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 shrink-0"
    style={{ backgroundColor: color }}
  />
);

const CustomLegend: React.FC<{ payload?: { value: string; color: string }[] }> = ({ payload }) => {
  if (!payload?.length) return null;
  const dark = isDark();
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 pt-0.5">
      {payload.map((entry, idx) => (
        <span
          key={idx}
          className={`flex items-center text-[10px] leading-tight ${
            dark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {legendDot(entry.color)}
          {entry.value}
        </span>
      ))}
    </div>
  );
};

// ─── Helper: determine if labels are long enough to need rotation ────────────

function labelsNeedRotation(labels: string[]): boolean {
  if (labels.length < 3) return false;
  return labels.some((l) => l.length > 6) || labels.length > 6;
}

// ─── Individual Chart Types ─────────────────────────────────────────────────

function BarChartCard({ config }: { config: ChartConfig }) {
  const dark = isDark();
  const gridColor = dark ? '#334155' : '#e2e8f0';
  const textColor = dark ? '#94a3b8' : '#64748b';

  const mergedData = useMemo(() => {
    return config.data.map((d, i) => ({
      label: d.label,
      value: d.value,
      secondaryValue: config.secondaryData?.[i]?.value || 0,
      fill: d.color || '#f97316',
    }));
  }, [config]);

  const rotateLabels = labelsNeedRotation(config.data.map((d) => d.label));
  // Taller base height to ensure labels and bars don't clip
  const chartHeight = Math.max(200, config.data.length * 38 + (rotateLabels ? 60 : 40));

  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={mergedData}
          margin={{ top: 8, right: 12, left: 0, bottom: rotateLabels ? 28 : 8 }}
          barCategoryGap="20%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: textColor, fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
            angle={rotateLabels ? -30 : 0}
            textAnchor={rotateLabels ? 'end' : 'middle'}
            height={rotateLabels ? 60 : 30}
            interval={0}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 'auto']}
            allowDecimals={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: dark ? '#1e293b55' : '#f1f5f955' }} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          >
            {mergedData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
          {config.secondaryData && config.secondaryData.length > 0 && (
            <Bar
              dataKey="secondaryValue"
              name="Last Week"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
              fill={CHART_BLUE}
              isAnimationActive={false}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizontalBarChartCard({ config }: { config: ChartConfig }) {
  const dark = isDark();
  const gridColor = dark ? '#334155' : '#e2e8f0';
  const textColor = dark ? '#94a3b8' : '#64748b';

  const sortedData = useMemo(() => {
    return [...config.data]
      .sort((a, b) => b.value - a.value)
      .map((d) => ({
        ...d,
        fill: d.color || '#f97316',
      }));
  }, [config]);

  // Ensure Y-axis has enough width for labels
  const maxLabelLen = Math.max(...sortedData.map((d) => d.label.length));
  const yAxisWidth = Math.min(110, maxLabelLen * 8 + 12);
  const chartHeight = Math.max(180, sortedData.length * 34 + 24);

  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: textColor, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 5.5]}
            ticks={[0, 1, 2, 3, 4, 5]}
          />
          <YAxis
            dataKey="label"
            type="category"
            tick={{ fill: textColor, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={yAxisWidth}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: dark ? '#1e293b55' : '#f1f5f955' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {sortedData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartCard({ config }: { config: ChartConfig }) {
  const dark = isDark();

  const pieData = useMemo(() => {
    return config.data.map((d) => ({
      name: d.label,
      value: d.value,
      fill: d.color || '#f97316',
    }));
  }, [config]);

  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="w-full overflow-hidden flex flex-col items-center">
      {/* Fixed-height container prevents legend from pushing chart out */}
      <div className="relative w-full" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={66}
              paddingAngle={2}
              dataKey="value"
              isAnimationActive={false}
            >
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center total — positioned inside the Pie container */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: -4 }}>
          <div className="text-center">
            <span className={`block text-lg font-bold leading-none ${dark ? 'text-white' : 'text-slate-800'}`}>
              {total}
            </span>
            <span className={`block text-[9px] leading-tight mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total
            </span>
          </div>
        </div>
      </div>
      {/* Legend sits cleanly below the fixed-height chart area */}
      <div className="-mt-1">
        <CustomLegend
          payload={pieData.map((d) => ({
            value: `${d.name} (${d.value})`,
            color: d.fill,
          }))}
        />
      </div>
    </div>
  );
}

// ─── Chart Title ────────────────────────────────────────────────────────────

function ChartIcon({ kind }: { kind: string }) {
  if (kind === 'pie') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

// ─── Table Chart ────────────────────────────────────────────────────────────

function TableChartCard({ config }: { config: ChartConfig }) {
  const dark = isDark();
  const cols = config.columns || [];
  const rows = config.rows || [];

  if (!cols.length || !rows.length) return null;

  return (
    <div className="w-full overflow-x-auto overflow-y-auto" style={{ maxHeight: '580px', minHeight: 0 }}>
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10">
          <tr>
            {cols.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 text-left font-semibold border-b-2 ${
                  dark
                    ? 'text-slate-300 border-slate-600 bg-slate-800'
                    : 'text-slate-700 border-slate-300 bg-slate-50'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={
                dark
                  ? idx % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-800/10'
                  : idx % 2 === 0 ? 'bg-slate-100/60' : 'bg-white/40'
              }
            >
              {cols.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 border-b ${
                    dark ? 'border-slate-700/50' : 'border-slate-200/60'
                  } ${
                    dark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {row[col.key] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {config.rows && config.rows.length > 50 && (
        <p className={`text-[10px] mt-1.5 text-center ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          Showing 50 of {config.rows.length} entries
        </p>
      )}
    </div>
  );
}

// ─── Chart Container — consistent card for every chart ──────────────────────

function SingleChart({ config }: { config: ChartConfig }) {
  const dark = isDark();
  return (
    <div
      className={`rounded-xl p-4 overflow-hidden h-full ${
        dark
          ? 'bg-slate-800/60 border border-slate-700/60'
          : 'bg-slate-50/80 border border-slate-200/80'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={dark ? 'text-orange-400' : 'text-orange-500'}>
          <ChartIcon kind={config.kind} />
        </span>
        <span
          className={`text-xs font-semibold tracking-tight ${
            dark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {config.title}
        </span>
      </div>

      {/* Chart body */}
      {config.kind === 'table' ? (
        <TableChartCard config={config} />
      ) : config.kind === 'pie' ? (
        <PieChartCard config={config} />
      ) : config.kind === 'horizontalBar' ? (
        <HorizontalBarChartCard config={config} />
      ) : (
        <BarChartCard config={config} />
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface AIChatChartsProps {
  charts?: ChartConfig[];
}

const AIChatCharts: React.FC<AIChatChartsProps> = ({ charts }) => {
  if (!charts || charts.length === 0) return null;

  const isOddCount = charts.length % 2 !== 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
      {charts.map((chart, idx) => {
        // Make the last chart full-width when odd count
        const fullWidth = isOddCount && idx === charts.length - 1;
        return (
          <div key={idx} className={`${fullWidth ? 'md:col-span-2 ' : ''}h-full min-h-0`}>
            <SingleChart config={chart} />
          </div>
        );
      })}
    </div>
  );
};

export default AIChatCharts;

// Color constants
const CHART_ORANGE = '#f97316';
const CHART_BLUE = '#3b82f6';
