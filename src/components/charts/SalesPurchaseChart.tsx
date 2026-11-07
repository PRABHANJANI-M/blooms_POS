import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { palette } from '../../config/palette';
import { formatINR } from '../../utils/money';

export interface MonthPoint { month: string; sales: number; purchases: number }

/** Interactive sales vs purchase chart. Toggle between bars and trend line. */
export function SalesPurchaseChart({ data }: { data: MonthPoint[] }) {
  const [mode, setMode] = useState<'bar' | 'line'>('bar');
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e8dcc4" vertical={false} />
      <XAxis dataKey="month" tick={{ fill: '#4a5d68', fontSize: 12 }} axisLine={false} tickLine={false} />
      <YAxis tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} tick={{ fill: '#4a5d68', fontSize: 12 }} axisLine={false} tickLine={false} width={58} />
      <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid #e3d6bd' }} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
    </>
  );
  return (
    <div>
      <div className="no-print mb-2 flex justify-end gap-1">
        {(['bar', 'line'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`btn btn-sm ${mode === m ? 'btn-navy' : 'btn-outline'}`}>
            {m === 'bar' ? 'Bars' : 'Trend'}
          </button>
        ))}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'bar' ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {common}
              <Bar dataKey="sales" name="Sales" fill={palette.navy} radius={[6, 6, 0, 0]} />
              <Bar dataKey="purchases" name="Purchases" fill={palette.steel} radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {common}
              <Line type="monotone" dataKey="sales" name="Sales" stroke={palette.fiery} strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="purchases" name="Purchases" stroke={palette.steel} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
