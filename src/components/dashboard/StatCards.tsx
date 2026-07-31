import { fetchResidentsCached } from '../../utils/apiCache';
import React, { useState, useEffect } from 'react';
import { getCurrentMonthYear } from '../../utils/dateHelper';
import { Users, User, UserCheck, CreditCard, TrendingUp } from 'lucide-react';

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
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
          <Users className="w-5 h-5 text-emerald-600" />
          Statistik Kependudukan
        </h3>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Update: {getCurrentMonthYear()}
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Penduduk" 
          value={stats.total.toLocaleString('id-ID')} 
          subtext="Jiwa tercatat di database" 
          subtextColor="text-emerald-700 dark:text-emerald-400 font-bold" 
          valueColor="text-emerald-800 dark:text-emerald-300"
          icon={<Users className="w-6 h-6 text-white" />}
          iconBg="bg-gradient-to-tr from-emerald-600 to-teal-500"
        />
        <StatCard 
          title="Laki-laki" 
          value={stats.male.toLocaleString('id-ID')} 
          subtext={`${malePercentage}% dari populasi`} 
          icon={<User className="w-6 h-6 text-white" />}
          iconBg="bg-gradient-to-tr from-sky-600 to-blue-500"
        />
        <StatCard 
          title="Perempuan" 
          value={stats.female.toLocaleString('id-ID')} 
          subtext={`${femalePercentage}% dari populasi`} 
          icon={<UserCheck className="w-6 h-6 text-white" />}
          iconBg="bg-gradient-to-tr from-rose-500 to-pink-500"
        />
        <StatCard 
          title="Kartu Keluarga" 
          value={stats.kk.toLocaleString('id-ID')} 
          subtext={`Rasio ${ratioKK} jiwa/KK`} 
          valueColor="text-amber-700 dark:text-amber-300" 
          icon={<CreditCard className="w-6 h-6 text-white" />}
          iconBg="bg-gradient-to-tr from-amber-500 to-orange-500"
        />
      </div>
    </section>
  );
}

function StatCard({ 
  title, 
  value, 
  subtext, 
  subtextColor = "text-slate-500 dark:text-slate-400", 
  valueColor = "text-slate-900 dark:text-white",
  icon,
  iconBg = "bg-emerald-600"
}: { 
  title: string, 
  value: string, 
  subtext: string, 
  subtextColor?: string, 
  valueColor?: string,
  icon?: React.ReactNode,
  iconBg?: string
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none hover:shadow-2xl hover:border-emerald-200 dark:hover:border-slate-700 transition-all group relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</p>
        {icon && (
          <div className={`p-3 rounded-2xl ${iconBg} shadow-md shadow-slate-200/50 dark:shadow-none group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
        )}
      </div>
      <h3 className={`text-4xl font-black mb-1.5 tracking-tight ${valueColor}`}>{value}</h3>
      <p className={`text-xs font-semibold ${subtextColor}`}>{subtext}</p>
    </div>
  );
}
