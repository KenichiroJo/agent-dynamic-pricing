import { Button } from '@/components/ui/button';
import { BarChart3, Search, Calendar, Sparkles, TrendingUp, Zap, MapPin, Building2, ChevronRight, ArrowRight, Star } from 'lucide-react';
import golfCourses from '@/constants/golf-courses.json';
import { useMemo } from 'react';

interface GolfCourse {
  cc_id: number;
  name: string;
  area: string;
  prefecture: string;
  avg_price: number;
}

const courses = golfCourses as GolfCourse[];

// エリアの定義
const AREAS = [
  { id: 'ハイエンドブランドエリア', name: 'ハイエンド', icon: '⭐', color: 'from-amber-500 to-orange-500', description: 'プレミアムコース' },
  { id: '関東東エリア', name: '関東東', icon: '🗾', color: 'from-blue-500 to-cyan-500', description: '千葉・茨城' },
  { id: '関東西エリア', name: '関東西', icon: '🗻', color: 'from-emerald-500 to-teal-500', description: '埼玉・群馬' },
  { id: '関東北エリア', name: '関東北', icon: '🌲', color: 'from-green-500 to-emerald-500', description: '栃木・群馬' },
  { id: '中部エリア', name: '中部', icon: '🏔️', color: 'from-indigo-500 to-purple-500', description: '静岡・岐阜' },
  { id: '関西エリア', name: '関西', icon: '⛩️', color: 'from-red-500 to-pink-500', description: '大阪・兵庫' },
  { id: '北海道・東北エリア', name: '北海道・東北', icon: '❄️', color: 'from-sky-400 to-blue-500', description: '北海道・宮城' },
  { id: '九州エリア', name: '九州', icon: '🌴', color: 'from-orange-500 to-red-500', description: '福岡・熊本' },
];

export function StartNewChat({ createChat }: { createChat: () => void }) {
  // エリア別コース数
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    courses.forEach(c => {
      counts[c.area] = (counts[c.area] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <section className="flex min-h-full flex-1 items-center justify-center px-4 py-8 overflow-auto">
      {/* Background decoration - Enhanced */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/8 via-primary/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-accent/8 to-primary/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-4xl mx-auto">
        {/* Header Card - Enhanced with glassmorphism */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent shadow-2xl shadow-primary/40 mb-5 relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
            <span className="text-primary-foreground text-2xl font-bold relative z-10">PGM</span>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            ダイナミックプライシング AI
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            AIが天候・曜日・季節・競合情報を分析し、<br className="hidden sm:block" />
            <span className="text-primary font-medium">最適なグリーンフィー</span>を提案します
          </p>
        </div>

        {/* Quick Stats - Enhanced with gradients */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="group relative flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-card/90 to-card/60 border border-white/10 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-foreground">{courses.length}</span>
            <span className="text-xs text-muted-foreground font-medium">対象コース</span>
          </div>
          <div className="group relative flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-card/90 to-card/60 border border-white/10 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-foreground">{AREAS.length}</span>
            <span className="text-xs text-muted-foreground font-medium">エリア</span>
          </div>
          <div className="group relative flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-card/90 to-card/60 border border-white/10 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-3 shadow-lg shadow-violet-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">AI</span>
            <span className="text-xs text-muted-foreground font-medium">価格最適化</span>
          </div>
        </div>

        {/* Area Grid - Enhanced cards */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            エリアから選択
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AREAS.map(area => (
              <button
                key={area.id}
                onClick={createChat}
                className="group relative flex flex-col items-start p-5 rounded-2xl bg-gradient-to-br from-card/90 to-card/60 border border-white/10 backdrop-blur-xl hover:border-primary/40 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 text-left overflow-hidden"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${area.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                {/* Icon with gradient background */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${area.color} flex items-center justify-center text-2xl mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {area.icon}
                </div>
                
                <span className="text-sm font-semibold text-foreground mb-0.5">{area.name}</span>
                <span className="text-[10px] text-muted-foreground/70">{area.description}</span>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs font-medium text-primary">{areaCounts[area.id] || 0}コース</span>
                  <ArrowRight className="w-3 h-3 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA - Enhanced button */}
        <Button
          size="lg"
          onClick={createChat}
          className="w-full h-16 rounded-2xl shadow-2xl shadow-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] font-bold text-lg group bg-gradient-to-r from-primary via-primary to-accent relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
          すべてのコースから選択する
          <Sparkles className="w-5 h-5 ml-2" />
        </Button>

        {/* Features - Enhanced with better styling */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20 hover:border-primary/30 hover:bg-muted/40 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">コース検索</span>
          </div>
          <div className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20 hover:border-primary/30 hover:bg-muted/40 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">価格分析</span>
          </div>
          <div className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20 hover:border-primary/30 hover:bg-muted/40 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">期間一括</span>
          </div>
        </div>
      </div>
    </section>
  );
}
