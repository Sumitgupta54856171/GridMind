import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout';
import { getDashboardStats, type DashboardMetrics } from '@/api/dashboard';

import {
  Building2,
  Layers,
  AlertTriangle,
  AlertCircle,
  Activity,
  Clock,
  Cpu,
  ArrowRight,
  Plus,
  Shield,
  RotateCw,
  MapPin,
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    utilities: 0,
    projects: 0,
    conflicts: 0,
    highPriority: 0,
    estimatedAICost: 0,
  });
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getDashboardStats();
      if (res?.metrics) {
        setMetrics(res.metrics);
      }
      if (res?.latestAnalysis) {
        setLatestAnalysis(res.latestAnalysis);
      }
      if (res?.recentAudits) {
        setRecentAudits(res.recentAudits);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <AppShell title={greeting} subtitle="Infrastructure coordination overview">
      <div className="space-y-6">
        {/* Top Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Municipal Coordination Status</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-agency capital improvement program alignment & spatial overlap monitoring
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/analyses')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Analysis
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted transition text-foreground"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/utilities')}
            className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
              <span className="font-medium">Connected Utilities</span>
              <Building2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.utilities}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Municipal plan sources active</div>
          </div>

          <div
            onClick={() => navigate('/projects')}
            className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
              <span className="font-medium">Indexed Projects</span>
              <Layers className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.projects}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Capital construction corridors</div>
          </div>

          <div
            onClick={() => navigate('/conflicts')}
            className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-amber-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
              <span className="font-medium">Detected Conflicts</span>
              <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{metrics.conflicts}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Spatial & temporal overlaps</div>
          </div>

          <div
            onClick={() => navigate('/conflicts')}
            className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-red-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
              <span className="font-medium">High Priority</span>
              <AlertCircle className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-red-600">{metrics.highPriority}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Require joint co-location plan</div>
          </div>
        </div>

        {/* 2-Column Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Analysis & Recommendations (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Analysis Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <Activity className="w-4 h-4 text-primary" />
                  Latest Coordination Analysis Run
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">
                  {latestAnalysis ? 'Completed' : 'Ready'}
                </span>
              </div>

              {latestAnalysis ? (
                <div className="space-y-4">
                  <div className="p-3 bg-white border border-border rounded-lg flex items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {latestAnalysis.utilityIds?.map((u: any, idx: number) => (
                        <span key={u._id || idx} className="flex items-center gap-1 font-semibold text-foreground">
                          {idx > 0 && <span className="text-muted-foreground font-normal">↔</span>}
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: u.color || '#2563eb' }}
                          ></span>
                          {u.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {new Date(latestAnalysis.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white border border-border rounded-lg p-2.5 shadow-xs">
                      <div className="text-base font-bold text-foreground">
                        {metrics.projects}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Projects Compared</div>
                    </div>
                    <div className="bg-white border border-border rounded-lg p-2.5 shadow-xs">
                      <div className="text-base font-bold text-amber-600">
                        {metrics.conflicts}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Conflicts Detected</div>
                    </div>
                    <div className="bg-white border border-border rounded-lg p-2.5 shadow-xs">
                      <div className="text-base font-bold text-red-600">
                        {metrics.highPriority}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">High Priority</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => navigate('/conflicts')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                    >
                      View Conflict Opportunities
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate('/analyses')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition text-foreground"
                    >
                      Analysis Setup
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground mb-3">
                    No multi-utility analysis run completed yet. Select 2 or more utilities to calculate spatial overlaps.
                  </p>
                  <button
                    onClick={() => navigate('/analyses')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
                  >
                    Start First Analysis
                  </button>
                </div>
              )}
            </div>

            {/* Quick Map Access Banner */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Infrastructure Map Canvas</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Explore all {metrics.projects} mapped corridors, utility boundaries, and GIS symbologies.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/map')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition text-foreground shrink-0"
              >
                Open Map
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: AI Control Center Widget & Audit (1 col) */}
          <div className="space-y-6">
            {/* AI Control Center Widget */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <Cpu className="w-4 h-4 text-primary" />
                  AI Control Center
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Privacy Guard Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Control what GridMind sends to Gemini AI models — always visible, always yours to change.
              </p>
              <div className="space-y-2.5 text-xs mb-4">
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Model Engine</span>
                  <span className="font-medium text-foreground">Gemini 2.5 Flash</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Privacy Filter</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Public Data Only
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-mono font-bold text-foreground">
                    ${metrics.estimatedAICost.toFixed(4)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate('/ai')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-white hover:bg-slate-50 transition text-foreground shadow-xs"
              >
                Open AI Control Center
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Recent Activity Log */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Recent System Activity
              </div>
              {recentAudits.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  Analysis and coordination logs will appear here.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentAudits.slice(0, 5).map((a, idx) => (
                    <div key={a._id || idx} className="flex items-start gap-2 text-xs py-1 border-b border-border/40 last:border-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground truncate font-medium">{a.action || 'Analysis Run'}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
