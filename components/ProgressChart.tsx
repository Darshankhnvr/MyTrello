import React, { useMemo, useState, useRef } from 'react';
import { Column as ColumnType, Task as TaskType } from '../types';

interface ProgressChartProps {
  columns: ColumnType[];
  days?: number; // how many days to show
  onDayClick?: (day: string) => void;
}

const formatDay = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

const ProgressChart: React.FC<ProgressChartProps> = ({ columns, days = 14, onDayClick }) => {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    const today = new Date();
    const dayList: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = formatDay(d);
      dayList.push(key);
      counts[key] = 0;
    }

    columns.forEach((col) => {
      col.tasks.forEach((t: TaskType) => {
        if (t.completedAt) {
          const key = t.completedAt.slice(0, 10);
          if (key in counts) counts[key]++;
        }
      });
    });

    const values = dayList.map((d) => counts[d] || 0);

    const half = Math.floor(days / 2);
    const recent = values.slice(-half).reduce((s, v) => s + v, 0);
    const prev = values.slice(-half * 2, -half).reduce((s, v) => s + v, 0);
    const change = prev === 0 ? (recent === 0 ? 0 : 100) : Math.round(((recent - prev) / prev) * 100);

    return { dayList, values, recent, prev, change };
  }, [columns, days]);

  const max = Math.max(1, ...data.values);

  return (
    <div ref={containerRef} className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm relative">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100">Progress (completions)</h4>
        <div className="text-xs text-gray-600 dark:text-gray-300">
          {data.recent} in last {Math.floor(days / 2)} days · {data.change >= 0 ? '+' : ''}{data.change}%
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg width={Math.max(300, data.values.length * 14)} height={64} viewBox={`0 0 ${data.values.length * 14} 64`} preserveAspectRatio="none">
          {data.values.map((v, i) => {
            const x = i * 14;
            const h = Math.round((v / max) * 36);
            return (
              <g key={i}>
                <rect
                  x={x + 2}
                  y={64 - h - 12}
                  width={10}
                  height={h}
                  rx={2}
                  fill="#3b82f6"
                  opacity={v === 0 ? 0.25 : 1}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(ev) => setHover({ idx: i, x: ev.clientX, y: ev.clientY })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onDayClick && onDayClick(data.dayList[i])}
                />
                <text x={x + 7} y={64 - 2} fontSize={9} textAnchor="middle" fill="#6b7280">
                  {data.dayList[i].slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {hover && (
        <div
          className="absolute z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs px-2 py-1 rounded shadow"
          style={{ left: hover.x - (containerRef.current?.getBoundingClientRect().left || 0) + 8, top: hover.y - (containerRef.current?.getBoundingClientRect().top || 0) - 28 }}
        >
          {data.values[hover.idx]} completed
        </div>
      )}
    </div>
  );
};

export default ProgressChart;
