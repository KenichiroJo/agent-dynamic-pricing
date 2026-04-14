import { useState, useMemo, ChangeEvent } from 'react';
import { MapPin, ChevronDown, Calendar, Zap, Building2, CheckCircle2, Sparkles, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import golfCourses from '@/constants/golf-courses.json';

export interface GolfCourse {
  cc_id: number;
  name: string;
  base_price: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  capacity: number;
  total_records: number;
  prefecture: string;
  brand: string;
  area: string;
  segment: string;
  model_group: string;
}

// エリアの定義（表示順）- グラデーションカラー追加
const AREAS = [
  { id: 'all', name: 'すべてのエリア', icon: '🌏', gradient: 'from-slate-500 to-slate-600' },
  { id: 'ハイエンドブランドエリア', name: 'ハイエンドブランド', icon: '⭐', gradient: 'from-amber-500 to-orange-500' },
  { id: '関東東エリア', name: '関東東', icon: '🗾', gradient: 'from-blue-500 to-cyan-500' },
  { id: '関東西エリア', name: '関東西', icon: '🗾', gradient: 'from-emerald-500 to-teal-500' },
  { id: '関東北エリア', name: '関東北', icon: '🗾', gradient: 'from-green-500 to-lime-500' },
  { id: '中部エリア', name: '中部', icon: '🏔️', gradient: 'from-indigo-500 to-purple-500' },
  { id: '関西エリア', name: '関西', icon: '⛩️', gradient: 'from-red-500 to-pink-500' },
  { id: '北海道・東北エリア', name: '北海道・東北', icon: '❄️', gradient: 'from-sky-400 to-blue-500' },
  { id: '九州エリア', name: '九州', icon: '🌴', gradient: 'from-orange-500 to-red-500' },
  { id: '中国・四国エリア', name: '中国・四国', icon: '🌊', gradient: 'from-cyan-500 to-blue-500' },
];

const courses: GolfCourse[] = golfCourses as GolfCourse[];

interface CourseSelectorProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}

export function CourseSelector({ onSubmit, disabled }: CourseSelectorProps) {
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // エリアでフィルタしたコース
  const filteredCourses = useMemo(() => {
    if (selectedArea === 'all') return courses;
    return courses.filter((c: GolfCourse) => c.area === selectedArea);
  }, [selectedArea]);

  // 選択中のエリア名
  const selectedAreaData = AREAS.find(a => a.id === selectedArea);
  const selectedAreaName = selectedAreaData?.name || 'エリアを選択';

  // コース選択のトグル
  const toggleCourse = (ccId: number) => {
    setSelectedCourses((prev: number[]) => 
      prev.includes(ccId) 
        ? prev.filter((id: number) => id !== ccId)
        : [...prev, ccId]
    );
  };

  // エリア全選択
  const selectAllInArea = () => {
    const courseIds = filteredCourses.map((c: GolfCourse) => c.cc_id);
    setSelectedCourses((prev: number[]) => {
      const newSelection = [...prev];
      courseIds.forEach((id: number) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  // 選択をクリア
  const clearSelection = () => {
    setSelectedCourses([]);
  };

  // クエリを送信
  const handleSubmit = () => {
    if (selectedCourses.length === 0) return;
    
    const selectedCourseNames = courses
      .filter((c: GolfCourse) => selectedCourses.includes(c.cc_id))
      .map((c: GolfCourse) => `${c.name}(GC${c.cc_id})`);
    
    let query = '';
    if (selectedCourses.length === 1) {
      query = `${selectedCourseNames[0]} ${selectedDate || '来週土曜'}の推奨価格を教えてください`;
    } else if (selectedCourses.length <= 5) {
      query = `以下のゴルフ場の${selectedDate || '来週土曜'}の推奨価格を教えてください：\n${selectedCourseNames.join('\n')}`;
    } else {
      const areaName = selectedArea === 'all' ? '選択した' : AREAS.find(a => a.id === selectedArea)?.name;
      query = `${areaName}エリア（${selectedCourses.length}コース）の${selectedDate || '来週土曜'}の推奨価格を一括で教えてください。対象: ${selectedCourseNames.slice(0, 3).join('、')}など`;
    }
    
    onSubmit(query);
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  return (
    <div className="w-full space-y-5">
      {/* Glass Card Container */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card/90 via-card/70 to-card/90 border border-white/10 shadow-2xl shadow-black/10 backdrop-blur-xl">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-accent/10 to-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-base">コース選択</h3>
                <p className="text-xs text-muted-foreground">エリアとコースを選んで査定</p>
              </div>
            </div>
            {selectedCourses.length > 0 && (
              <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 px-3 py-1 shadow-lg shadow-primary/20">
                <Sparkles className="w-3 h-3 mr-1" />
                {selectedCourses.length}件選択
              </Badge>
            )}
          </div>

          {/* Area & Date Selection - Horizontal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Area Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'group relative flex items-center gap-3 w-full p-4 rounded-2xl border-2 transition-all duration-300',
                    'bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm',
                    'border-border/30 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={disabled}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-110',
                    `bg-gradient-to-br ${selectedAreaData?.gradient || 'from-slate-500 to-slate-600'}`
                  )}>
                    {selectedAreaData?.icon || '🌏'}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">エリア</p>
                    <p className="font-semibold text-sm">{selectedAreaName}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2 rounded-2xl border-border/50 shadow-2xl">
                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 pb-2">エリアを選択</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/30" />
                <div className="space-y-1 pt-1">
                  {AREAS.map(area => (
                    <DropdownMenuItem
                      key={area.id}
                      onClick={() => setSelectedArea(area.id)}
                      className={cn(
                        'cursor-pointer rounded-xl px-3 py-2.5 transition-all',
                        selectedArea === area.id 
                          ? 'bg-primary/15 text-primary' 
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <span className="mr-3 text-base">{area.icon}</span>
                      <span className="flex-1 font-medium text-sm">{area.name}</span>
                      {selectedArea === area.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date Input */}
            <div className={cn(
              'relative flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300',
              'bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm',
              'border-border/30 focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10'
            )}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">プレー日</p>
                <input
                  type="text"
                  placeholder="4/20、来週土曜..."
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full bg-transparent font-semibold text-sm placeholder:text-muted-foreground/40 focus:outline-none"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* Course Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {filteredCourses.length}件のコース
                </span>
                {selectedArea !== 'all' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {selectedAreaName}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={selectAllInArea}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  disabled={disabled}
                >
                  すべて選択
                </button>
                <button
                  onClick={clearSelection}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  disabled={disabled}
                >
                  クリア
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {filteredCourses.map((course: GolfCourse) => {
                const isSelected = selectedCourses.includes(course.cc_id);
                const isHighEnd = course.brand === 'GRAND PGM' || course.segment === 'GARAND';
                
                return (
                  <button
                    key={course.cc_id}
                    onClick={() => toggleCourse(course.cc_id)}
                    disabled={disabled}
                    className={cn(
                      'group relative flex flex-col p-3.5 rounded-2xl border-2 text-left transition-all duration-300',
                      isSelected
                        ? 'border-primary bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 shadow-lg shadow-primary/15'
                        : 'border-border/30 bg-gradient-to-br from-muted/30 to-transparent hover:border-primary/40 hover:bg-muted/40 hover:shadow-md'
                    )}
                  >
                    {/* Selection indicator */}
                    <div className={cn(
                      'absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300',
                      isSelected
                        ? 'bg-primary text-primary-foreground scale-100'
                        : 'bg-muted/50 text-transparent group-hover:bg-muted group-hover:text-muted-foreground scale-90 group-hover:scale-100'
                    )}>
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[9px] font-bold">{course.cc_id.toString().slice(-2)}</span>
                      )}
                    </div>

                    {/* Course name with high-end badge */}
                    <div className="flex items-start gap-2 pr-6">
                      {isHighEnd && (
                        <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm font-semibold leading-tight">{course.name}</span>
                    </div>
                    
                    {/* Course details */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted/50">
                        {course.prefecture}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        ¥{course.avg_price.toLocaleString()}〜
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button - Outside the card for emphasis */}
      <Button
        onClick={handleSubmit}
        disabled={disabled || selectedCourses.length === 0}
        size="lg"
        className={cn(
          'w-full h-14 rounded-2xl font-bold text-base transition-all duration-300',
          'bg-gradient-to-r from-primary via-primary to-accent',
          'shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40',
          'hover:scale-[1.02] active:scale-[0.98]',
          'disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none'
        )}
      >
        <Zap className="w-5 h-5 mr-2" />
        {selectedCourses.length > 0 
          ? `${selectedCourses.length}件のコースを査定`
          : 'コースを選択してください'
        }
      </Button>
    </div>
  );
}
