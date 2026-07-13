import React from 'react';
import WelcomeBanner from './dashboard/WelcomeBanner';
import StatCards from './dashboard/StatCards';
import BudgetSummary from './dashboard/BudgetSummary';
import NewsSection from './dashboard/NewsSection';
import RightSidebar from './dashboard/RightSidebar';

export default function Dashboard({ setPublicTab }: { setPublicTab?: (tab: string) => void }) {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      <WelcomeBanner onTabChange={setPublicTab} />
      <StatCards />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          <BudgetSummary />
          <NewsSection onTabChange={setPublicTab} />
        </div>
        <div className="xl:col-span-1 sticky top-24">
          <RightSidebar onTabChange={setPublicTab} />
        </div>
      </div>
    </div>
  );
}
