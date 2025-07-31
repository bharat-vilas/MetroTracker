import React from 'react';
import { Zap } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <div className="w-full bg-primary text-primary-foreground py-3 px-6 flex items-center gap-3 shadow-sm border-b">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-destructive flex items-center justify-center rounded">
          <div className="text-background font-bold text-lg transform -skew-x-12">M</div>
        </div>
        <div className="text-lg font-semibold">BAY Metro Transit</div>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        <Zap className="w-4 h-4" />
        <span className="text-sm font-medium">Live Tracker powered by QRYDE</span>
      </div>
    </div>
  );
};

export default Header;