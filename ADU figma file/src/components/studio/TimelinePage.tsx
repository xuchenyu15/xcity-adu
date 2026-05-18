import React, { useState, useRef, useMemo } from 'react';
import { 
  Check,
  Truck, 
  Hammer, 
  Flag,
  MessageSquare, 
  FileText,
  X,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { PageTitle, PageSubtitle } from './Typography';

// --- Types & Config ---

type TaskStatus = 'completed' | 'in-progress' | 'scheduled' | 'upcoming';

interface Owner {
  name: string;
  role: string;
  avatar: string;
}

interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  startMonthIndex: number; 
  durationMonths: number;
  dateRangeDisplay: string;
  progress: number; // 0 to 100
  owner: Owner;
}

const START_YEAR = 2025;
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ALL_MONTHS_FLAT = Array.from({ length: 36 }, (_, i) => {
  const year = START_YEAR + Math.floor(i / 12);
  const monthIdx = i % 12;
  return { name: MONTH_NAMES[monthIdx], year };
});

const CURRENT_MONTH_INDEX_ABS = 5.76; 
const BRAND_BLUE = '#2B7FFF';
const FUTURE_GREY = '#E2E8F0';

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case 'completed': return BRAND_BLUE;
    case 'in-progress': return BRAND_BLUE;
    case 'scheduled': return '#94a3b8';
    case 'upcoming': return '#cbd5e1';
    default: return '#cbd5e1';
  }
};

const macroStages = [
  { id: 'application', label: 'APPLICATION', icon: FileText, status: 'completed', shift: 16 }, 
  { id: 'permitting', label: 'PERMITTING', icon: Check, status: 'completed', shift: 0 }, 
  { id: 'logistics', label: 'LOGISTICS', icon: Truck, status: 'upcoming', shift: 0 },
  { id: 'assembly', label: 'ASSEMBLY', icon: Hammer, status: 'upcoming', shift: 0 },
  { id: 'handover', label: 'HANDOVER', icon: Flag, status: 'upcoming', shift: -16 },
];

const tasks: Task[] = [
  {
    id: '1',
    name: 'Permitting & Approvals',
    status: 'completed',
    startMonthIndex: 1.0, 
    durationMonths: 4.5, 
    progress: 100,
    dateRangeDisplay: 'Feb 01 – May 20, 2025',
    owner: { name: 'Sarah Jenkins', role: 'Permit Specialist', avatar: 'https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?auto=format&fit=crop&q=80&w=200' }
  },
  {
    id: '2',
    name: 'Factory Production',
    status: 'in-progress',
    startMonthIndex: 4.8, 
    durationMonths: 3.2, 
    progress: 60,
    dateRangeDisplay: 'May 25 – Aug 15, 2025',
    owner: { name: 'David Chen', role: 'Production Lead', avatar: 'https://images.unsplash.com/photo-1723537742563-15c3d351dbf2?auto=format&fit=crop&q=80&w=200' }
  },
  {
    id: '3',
    name: 'Site Preparation & Foundation',
    status: 'in-progress',
    startMonthIndex: 5.0, 
    durationMonths: 2.5, 
    progress: 40,
    dateRangeDisplay: 'Jun 12 – Mid Aug',
    owner: { name: 'Mike Ross', role: 'Site Supervisor', avatar: 'https://images.unsplash.com/photo-1768158988512-ad31657fe5b8?auto=format&fit=crop&q=80&w=200' }
  },
  {
    id: '4',
    name: 'Delivery & Logistics',
    status: 'scheduled',
    startMonthIndex: 8.0, 
    durationMonths: 1.2, 
    progress: 0,
    dateRangeDisplay: 'Early Sep – Late Sep',
    owner: { name: 'Lisa Wang', role: 'Logistics Coord', avatar: 'https://images.unsplash.com/photo-1701163802894-99fa45f1c83e?auto=format&fit=crop&q=80&w=200' }
  },
  {
    id: '5',
    name: 'Assembly & Install',
    status: 'upcoming',
    startMonthIndex: 8.5, 
    durationMonths: 1.5, 
    progress: 0,
    dateRangeDisplay: 'Mid Sep – Late Oct',
    owner: { name: 'Mike Ross', role: 'Site Supervisor', avatar: 'https://images.unsplash.com/photo-1768158988512-ad31657fe5b8?auto=format&fit=crop&q=80&w=200' }
  },
  {
    id: '6',
    name: 'Final Inspection & Handover',
    status: 'upcoming',
    startMonthIndex: 10.5, 
    durationMonths: 1.0, 
    progress: 0,
    dateRangeDisplay: 'Mid Nov – Mid Dec',
    owner: { name: 'Alex Thompson', role: 'Customer Success', avatar: 'https://images.unsplash.com/photo-1678230908652-dfeca2757bb2?auto=format&fit=crop&q=80&w=200' }
  }
];

// --- Floating Message Dialog ---
const ChatDialog = ({ onClose, owner }: { onClose: () => void, owner: Owner }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div 
      className="fixed inset-0 z-[200] pointer-events-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, x: position.x, y: position.y }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="pointer-events-auto bg-white border border-slate-200 rounded-2xl shadow-2xl w-[360px] overflow-hidden flex flex-col fixed left-[calc(50%-180px)] top-[20%]"
      >
        <div 
          className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white shadow-sm pointer-events-none">
              <ImageWithFallback src={owner.avatar} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">{owner.name}</div>
              <div className="text-xs text-slate-500">{owner.role}</div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="h-[280px] bg-white p-4 overflow-y-auto flex flex-col gap-3">
          <div className="self-center text-[10px] text-slate-400 font-medium uppercase tracking-wider my-2">Today</div>
          <div className="self-end bg-blue-600 text-white rounded-2xl rounded-tr-sm py-2 px-3 text-sm max-w-[80%] shadow-sm">
            Hi {owner.name.split(' ')[0]}, can we schedule a quick call?
          </div>
        </div>
        <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
          <input 
            type="text" 
            placeholder="Type a message..." 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export function TimelinePage() {
  const [activeChatOwner, setActiveChatOwner] = useState<Owner | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const displayMonths = useMemo(() => {
     return ALL_MONTHS_FLAT.slice(0, 12); // Show 1 year
  }, []);

  const totalMonthsCount = displayMonths.length;
  const currentPct = (CURRENT_MONTH_INDEX_ABS / totalMonthsCount) * 100;

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-slate-50 overflow-y-auto font-sans p-6 lg:p-10">
      <div className="max-w-7xl mx-auto w-full pb-20">
        
        {/* 1. HEADER SECTION (Split Layout) */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="flex-1">
              <PageTitle>Project Execution</PageTitle>
              <PageSubtitle className="mt-2 max-w-2xl">
                Live execution timeline showing system-managed and external-dependent phases.
                <br />
                Estimated handover in <span className="font-semibold text-[#2B7FFF]">3 months</span>
              </PageSubtitle>
           </div>
           
           <div className="flex flex-col items-end shrink-0 md:pb-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">EST. COMPLETION</div>
              <div className="flex items-center gap-2 text-[22px] font-bold tracking-tight leading-none">
                <span className="text-slate-900">August 2026</span>
                <span className="text-slate-300 mx-0.5">·</span>
                <span className="text-[#2B7FFF]">On Track</span>
              </div>
           </div>
        </div>

        {/* 2. MASTER TIMELINE (Absolute Mathematical Spacing) */}
        <div className="w-full mb-16 shrink-0 relative px-10 h-24">
            {/* Background Layer: Line Segments */}
            <div className="absolute inset-0 flex items-center px-10 pointer-events-none z-10">
                <div className="relative w-full h-[5px]">
                    
                    {/* Extension Lines (Outer) - Shifted another 8pt(12px) inward to 38.5px */}
                    <div 
                      className="absolute top-0 h-full bg-gradient-to-r from-transparent to-[#2B7FFF] rounded-full"
                      style={{ left: '-80px', width: '40px', transform: 'translateX(38.5px)' }}
                    />
                    <div 
                      className="absolute top-0 h-full bg-gradient-to-l from-transparent to-[#E2E8F0] rounded-full"
                      style={{ right: '-80px', width: '40px', transform: 'translateX(-38.5px)' }}
                    />

                    {/* Main Segments */}
                    {Array.from({ length: 4 }).map((_, i) => {
                        const startPct = (i / 4) * 100;
                        const endPct = ((i + 1) / 4) * 100;
                        
                        // Shift request: App-Perm right 18pt(24px), Ass-Han left 18pt(24px)
                        let manualShift = 0;
                        if (i === 0) manualShift = 24; // Translate right
                        if (i === 3) manualShift = -24; // Translate left

                        const leftProp = `calc(${startPct}% + ${macroStages[i].shift + 40 + manualShift}px)`;
                        const rightProp = `calc(${100 - endPct}% + ${40 - macroStages[i+1].shift - manualShift}px)`;

                        const isAppToPerm = i === 0;
                        const isPermToLog = i === 1;
                        const isFuture = i > 1;

                        return (
                            <div 
                              key={i}
                              className="absolute top-0 h-full flex overflow-visible"
                              style={{ 
                                left: leftProp,
                                right: rightProp
                              }}
                            >
                                {isAppToPerm && (
                                    <div className="w-full h-full bg-[#2B7FFF] rounded-full" />
                                )}
                                
                                {isPermToLog && (
                                    <div className="w-full h-full flex items-center">
                                        {/* Blue part up to dot center - NO GAP */}
                                        <div 
                                          className="h-full bg-[#2B7FFF] rounded-l-full"
                                          style={{ width: '33.3333%' }}
                                        />
                                        {/* Gray part from dot center to next node - NO GAP */}
                                        <div 
                                          className="flex-1 h-full bg-[#E2E8F0] rounded-r-full"
                                        />
                                    </div>
                                )}

                                {isFuture && (
                                    <div className="w-full h-full bg-[#E2E8F0] rounded-full" />
                                )}
                            </div>
                        );
                    })}

                    {/* CURRENT GLOW DOT (Permitting -> Logistics) */}
                    <div 
                        className="absolute top-1/2 -translate-y-1/2 w-[20px] h-[20px] bg-[#2B7FFF] rounded-full border-[3.5px] border-white shadow-[0_0_15px_rgba(43,127,255,1)] z-30 flex items-center justify-center"
                        style={{ left: `calc(25% + 40px + (calc(25% - 80px) * 0.3333))` }}
                    >
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                </div>
            </div>

            {/* Nodes Layer */}
            <div className="absolute inset-0 flex items-center justify-between px-10 pointer-events-none z-30">
                {macroStages.map((stage, idx) => {
                    const isCompleted = stage.status === 'completed';
                    const Icon = stage.icon;
                    
                    return (
                        <div key={stage.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${stage.shift}px)` }}>
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative border-[3.5px] pointer-events-auto z-40 ${
                                    isCompleted ? 'bg-[#2B7FFF] border-[#2B7FFF] text-white shadow-[0_8px_24px_rgba(43,127,255,0.4)]' : 'bg-white border-[#E2E8F0] text-[#CBD5E1]'
                                }`}
                            >
                                {stage.id === 'application' ? (
                                    <FileText className="w-5 h-5 stroke-[2.5]" />
                                ) : (
                                    isCompleted ? <Check className="w-5 h-5 stroke-[4]" /> : <Icon className="w-5 h-5 stroke-[2.5]" />
                                )}
                            </motion.div>
                            <div className={`absolute top-full mt-4 text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap ${
                                isCompleted ? 'text-[#2B7FFF]' : 'text-[#CBD5E1]'
                            }`}>
                                {stage.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* 3. GANTT CHART SECTION */}
        <div className="w-full bg-white rounded-[24px] border border-slate-200 flex flex-col overflow-hidden relative shadow-sm">
            <div className="flex overflow-hidden">
                {/* Left Task Column */}
                <div className="w-[300px] shrink-0 bg-white z-[80] border-r border-slate-100/50 flex flex-col">
                     <div className="h-24 shrink-0 border-b border-slate-100 flex items-end pb-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        TASK NAME
                     </div>
                     <div className="flex-1 py-4">
                        {tasks.map((task) => (
                            <div key={task.id} className="h-24 px-8 flex flex-col justify-center border-b border-slate-50 last:border-0">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-slate-900 text-[13px] tracking-tight">{task.name}</span>
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: getStatusColor(task.status) }}>
                                 {task.status.replace('-', ' ')}
                              </span>
                            </div>
                          ))}
                     </div>
                </div>

                {/* Main Gantt Grid */}
                <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-hidden relative bg-white scrollbar-hide">
                    <div className="h-full min-w-[1200px] relative flex flex-col">
                        
                        {/* Headers */}
                        <div className="h-24 shrink-0 border-b border-slate-100 flex items-end bg-white sticky top-0 z-[60]">
                            
                            {/* Today Tag */}
                            <div 
                                className="absolute top-4 z-[95] pointer-events-none flex flex-col items-center" 
                                style={{ 
                                    left: `${currentPct}%`,
                                    transform: 'translateX(-50%)' 
                                }}
                            >
                                <div className="bg-[#1e293b] text-white text-[9px] font-bold px-3 py-1.5 rounded-md shadow-xl whitespace-nowrap uppercase tracking-[0.1em] border border-white/10">
                                    Today JUN 23, 2025
                                </div>
                                <div className="w-[1.5px] h-[800px] mt-2" style={{ backgroundImage: `linear-gradient(to bottom, #cbd5e1 60%, transparent 40%)`, backgroundSize: '1.5px 12px', backgroundRepeat: 'repeat-y' }} />
                            </div>

                            {/* White Overlay on the right */}
                            <div 
                                className="absolute top-0 bottom-0 right-0 bg-white/50 z-[85] pointer-events-none"
                                style={{ left: `${currentPct}%` }}
                            />

                            {displayMonths.map((m, i) => (
                              <div key={i} className="flex-1 border-l border-slate-50 h-14 flex items-center justify-center min-w-[80px]">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {m.name.toUpperCase()} {m.name === 'Jan' ? m.year : ''}
                                </span>
                              </div>
                            ))}
                        </div>

                        {/* Rows */}
                        <div className="flex-1 py-4 relative">
                            <div 
                                className="absolute top-0 bottom-0 right-0 bg-white/50 z-[85] pointer-events-none"
                                style={{ left: `${currentPct}%` }}
                            />

                            <div className="absolute inset-0 flex pointer-events-none">
                                {displayMonths.map((_, i) => (
                                  <div key={i} className="flex-1 border-l border-slate-50 h-full" />
                                ))}
                            </div>

                            {tasks.map((task) => {
                               const isStripe = task.id === '4';
                               const barWidthPct = (task.durationMonths / totalMonthsCount) * 100;
                               const barLeftPct = (task.startMonthIndex / totalMonthsCount) * 100;
                               const isUpcoming = task.status === 'upcoming';
                               
                               return (
                                <div 
                                    key={task.id} 
                                    className="h-24 relative w-full flex items-center px-0 border-b border-slate-50 last:border-0"
                                >
                                    <div className="absolute left-2 right-2 h-10 bg-slate-100/40 rounded-full" />
                                    
                                    {!isUpcoming && (
                                        <div 
                                            className="absolute h-10" 
                                            style={{ left: `${barLeftPct}%`, width: `${barWidthPct}%` }}
                                            onMouseEnter={() => setHoveredTaskId(task.id)}
                                            onMouseLeave={() => setHoveredTaskId(null)}
                                        >
                                            {/* Bar Extension Drawer (Single Line) */}
                                            <AnimatePresence>
                                                {hoveredTaskId === task.id && (
                                                    <motion.div 
                                                        initial={{ x: -30, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        exit={{ x: -30, opacity: 0 }}
                                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                                        className="absolute left-full top-0 h-full flex items-center z-[70] -ml-6"
                                                    >
                                                        <div className="h-full pl-8 pr-6 bg-[#d7e4ff]/85 backdrop-blur-md rounded-full shadow-lg border border-white/50 flex items-center whitespace-nowrap">
                                                            <span className="text-[#4c84f4] font-bold text-[10px] uppercase tracking-widest">
                                                                {task.dateRangeDisplay}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Main Bar */}
                                            <motion.div 
                                                className={`absolute inset-0 rounded-full flex items-center px-4 cursor-pointer shadow-sm border border-black/5 z-[80] ${isStripe ? 'bg-blue-50' : ''}`}
                                                style={{
                                                    backgroundColor: !isStripe ? BRAND_BLUE : undefined,
                                                    backgroundImage: isStripe ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(76, 132, 244, 0.1) 10px, rgba(76, 132, 244, 0.1) 20px)' : undefined
                                                }}
                                            >
                                                {task.status === 'completed' ? (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 bg-white rounded-full shadow-sm z-10 flex items-center justify-center">
                                                        <Check className="w-2.5 h-2.5 text-[#4c84f4] stroke-[4]" />
                                                    </div>
                                                ) : task.status === 'in-progress' && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-sm z-10" />
                                                )}
                                            </motion.div>
                                        </div>
                                    )}
                                </div>
                               );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Owner Column */}
                <div className="w-[300px] shrink-0 bg-white z-[90] border-l border-slate-50 flex flex-col">
                     <div className="h-24 shrink-0 border-b border-slate-100 flex items-end pb-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        RESPONSIBILITY
                     </div>
                     <div className="flex-1 py-4">
                        {tasks.map((task) => (
                             <div 
                                key={task.id} 
                                className="h-24 px-8 flex items-center justify-between group/row border-b border-slate-50 last:border-0 opacity-70 hover:opacity-100 transition-opacity duration-300"
                             >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 shadow-sm transition-transform group-hover/row:scale-105">
                                       <ImageWithFallback src={task.owner.avatar} alt={task.owner.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                       <div className="text-[11px] font-bold text-slate-900">{task.owner.name}</div>
                                       <div className="text-[10px] text-slate-500 font-medium leading-tight">{task.owner.role}</div>
                                    </div>
                                </div>
                                <button 
                                  onClick={() => setActiveChatOwner(task.owner)} 
                                  className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </button>
                             </div>
                           ))}
                     </div>
                </div>
            </div>
        </div>

        <div className="mt-16 text-center border-t border-slate-200 pt-8">
            <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Timelines are estimated based on current project velocity. System updates occur daily at 00:00 UTC. 
                Construction schedule is synced with real-time site IoT sensors.
            </p>
        </div>
      </div>

      <AnimatePresence>
        {activeChatOwner && (
            <ChatDialog owner={activeChatOwner} onClose={() => setActiveChatOwner(null)} />
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}