import { fetchResidentsCached } from '../../utils/apiCache';
import React, { useState, useEffect } from 'react';
import { getCurrentMonthYear } from '../../utils/dateHelper';

export default function StatCards() {
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    kk: 0
  });

  useEffect(() => {
    fetchResidentsCached()
      .then(res => res.json())
      .then((data: any[]) => {
        const total = data.length;
        const male = data.filter(r => r.gender === 'Laki-laki').length;
        const female = data.filter(r => r.gender === 'Perempuan').length;
        
        // Count unique KK numbers
        const kkSet = new Set();
        data.forEach(r => {
          if (r.noKk) kkSet.add(r.noKk);
        });
        const kk = kkSet.size;

        setStats({ total, male, female, kk });
      })
      .catch(err => console.error("Error fetching stats:", err));
  }, []);

  const malePercentage = stats.total > 0 ? ((stats.male / stats.total) * 100).toFixed(1) : '0';
  const femalePercentage = stats.total > 0 ? ((stats.female / stats.total) * 100).toFixed(1) : '0';
  const ratioKK = stats.kk > 0 ? (stats.total / stats.kk).toFixed(1) : '0';

  return (
    <section>
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          Statistik Kependudukan
        </h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">Update: {getCurrentMonthYear()}</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Penduduk" value={stats.total.toLocaleString('id-ID')} subtext="Tercatat di sistem" subtextColor="text-emerald-600 font-bold" valueColor="text-emerald-700" />
        <StatCard title="Laki-laki" value={stats.male.toLocaleString('id-ID')} subtext={`${malePercentage}% dari total`} />
        <StatCard title="Perempuan" value={stats.female.toLocaleString('id-ID')} subtext={`${femalePercentage}% dari total`} />
        <StatCard title="Kartu Keluarga" value={stats.kk.toLocaleString('id-ID')} subtext={`Rasio ${ratioKK} jiwa/KK`} valueColor="text-amber-600" />
      </div>
    </section>
  );
}

function StatCard({ title, value, subtext, subtextColor = "text-gray-500", valueColor = "text-gray-900" }: { title: string, value: string, subtext: string, subtextColor?: string, valueColor?: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
      <p className="text-sm font-semibold text-gray-500 mb-2">{title}</p>
      <h3 className={`text-4xl font-bold mb-2 tracking-tight group-hover:scale-105 transform origin-left transition-transform ${valueColor}`}>{value}</h3>
      <p className={`text-xs font-medium ${subtextColor}`}>{subtext}</p>
    </div>
  );
}
