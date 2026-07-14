import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

const events = [
  {
    id: 1,
    title: 'Gotong Royong Bersih Desa',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 2),
    time: '07:30 - Selesai',
    location: 'Sepanjang Jalan Utama',
    type: 'warga',
    color: 'emerald'
  },
  {
    id: 2,
    title: 'Rapat Pleno RT/RW',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 5),
    time: '19:30 - 21:00',
    location: 'Balai Desa',
    type: 'rapat',
    color: 'blue'
  },
  {
    id: 3,
    title: 'Pengajian Rutin Bulanan',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7),
    time: '16:00 - 17:30',
    location: 'Masjid Jami',
    type: 'agama',
    color: 'amber'
  }
];

export default function KalenderDesa() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Find events for the current month
  const currentMonthEvents = events.filter(e => 
    e.date.getMonth() === currentDate.getMonth() && 
    e.date.getFullYear() === currentDate.getFullYear()
  ).sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarIcon className="text-emerald-700 w-5 h-5" />
          Kalender Desa
        </h4>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-5">
        <div className="text-center font-bold text-sm text-gray-800 dark:text-slate-100 mb-4">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((day, i) => (
            <div key={i} className="text-[10px] font-bold text-gray-400">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-6">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1.5" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasEvent = currentMonthEvents.some(e => e.date.getDate() === day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
            
            return (
              <div 
                key={day} 
                className={`
                  text-xs p-1.5 rounded-lg flex items-center justify-center relative
                  ${isToday ? 'bg-emerald-600 text-white font-bold' : 'text-gray-700 dark:text-slate-300'}
                  ${hasEvent && !isToday ? 'bg-emerald-50 text-emerald-800 font-bold' : ''}
                `}
              >
                {day}
                {hasEvent && !isToday && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jadwal Mendatang</h5>
          
          {currentMonthEvents.length > 0 ? (
            <div className="space-y-3">
              {currentMonthEvents.map(event => (
                <div key={event.id} className="group relative pl-3 border-l-2 border-gray-100 dark:border-slate-800 hover:border-emerald-500 transition-colors">
                  <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full border-2 border-white ${event.color === 'emerald' ? 'bg-emerald-500' : event.color === 'blue' ? 'bg-blue-500' : 'bg-amber-500'} group-hover:scale-125 transition-transform`} />
                  <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">{event.title}</p>
                  <div className="flex flex-col gap-1 text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {event.date.getDate()} {monthNames[event.date.getMonth()]} • {event.time}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {event.location}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-800 border-dashed">
              <p className="text-xs text-gray-500 dark:text-slate-400">Tidak ada jadwal di bulan ini.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
