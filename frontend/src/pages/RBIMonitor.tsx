import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Eye,
  Bell,
  ArrowRight,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';

type CircularStatus = 'NOT_ANALYZED' | 'PROCESSING' | 'GAP_FOUND' | 'CLEAR';
type GapSeverity = 'CRITICAL' | 'MODERATE' | 'ADVISORY';

type CircularGap = {
  gap_id: string;
  circular_clause: string;
  requirement: string;
  severity: GapSeverity | string;
  deadline: string | null;
  remediation: string;
};

type CircularAnalysis = {
  status: 'GAP_FOUND' | 'CLEAR' | string;
  summary: string;
  gaps: CircularGap[];
  compliance_score: number;
  clauses_checked: number;
  clauses_covered: number;
};

type CircularCardState = {
  status: CircularStatus;
  analysis: CircularAnalysis | null;
  circularText: string | null;
  lastAnalyzedAt: number | null;
  message: string | null; // for empty-state / guard failures
};

const EMPTY_GAP_MESSAGE = 'Upload a circular and activate policies to detect gaps.';

function formatMinsAgo(ts: number) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins <= 0) return 'Last analyzed: 0 mins ago';
  return `Last analyzed: ${mins} mins ago`;
}

function severityBadgeClasses(sev: string) {
  if (sev === 'CRITICAL') return { wrap: 'bg-rose-50 text-rose-500 border-rose-100', dot: 'bg-rose-500' };
  if (sev === 'MODERATE') return { wrap: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-400' };
  return { wrap: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-500' };
}

function parseDeadlineToTargetDate(deadline: string): Date | null {
  const raw = deadline.trim();

  // 1) Try absolute date parsing.
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return parsed;

  const lower = raw.toLowerCase();

  // 2) Try relative deadlines like "18 days", "2 working days", "within 48 hours".
  const dayMatch = lower.match(/(\d+)\s*(working\s*)?days?/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    if (!isNaN(days)) return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  const hourMatch = lower.match(/(\d+)\s*hours?/i);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    if (!isNaN(hours)) return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  return null;
}

function getDeadlineCountdown(analysis: CircularAnalysis | null): { days: number } | null {
  if (!analysis?.gaps?.length) return null;

  const candidates = analysis.gaps
    .map(g => g.deadline)
    .filter((d): d is string => typeof d === 'string' && d.trim().length > 0);

  // Choose the earliest target date among parseable deadlines.
  let bestDays: number | null = null;
  for (const d of candidates) {
    const target = parseDeadlineToTargetDate(d);
    if (!target) continue;
    const diffDays = Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    const clamped = Math.max(0, diffDays);
    if (bestDays === null || clamped < bestDays) bestDays = clamped;
  }

  return bestDays === null ? null : { days: bestDays };
}

export const RBIMonitor: React.FC = () => {
  const { rules, setRules } = useData();

  const circulars = useMemo(
    () => [
      {
        id: 'RBI/2025-26/53',
        department: 'Department of Regulation (DOR)',
        date: '12 June 2025',
        category: 'KYC',
        keyRuleSummary: 'Updation / periodic updation of KYC with revised instructions for Regulated Entities.',
        riskLevel: 'MEDIUM',
        applicableEntities: 'All Regulated Entities',
        title: 'KYC periodic updation - revised instructions'
      },
      {
        id: 'RBI/2025-26/51',
        department: 'Department of Regulation (DOR)',
        date: '12 June 2025',
        category: 'KYC',
        keyRuleSummary: 'Low-risk customers may continue transactions; KYC must be updated within one year or by 30 June 2026.',
        riskLevel: 'MEDIUM',
        applicableEntities: 'Banks and other Regulated Entities',
        title: 'Low-risk customer KYC updation relaxation'
      },
      {
        id: 'RBI/2025-26/75',
        department: 'Department of Regulation (DOR)',
        date: '14 August 2025',
        category: 'KYC',
        keyRuleSummary: 'KYC (2nd Amendment) Directions, 2025 strengthen due diligence and transparency controls.',
        riskLevel: 'HIGH',
        applicableEntities: 'All Regulated Entities',
        title: 'KYC (2nd Amendment) Directions, 2025'
      },
      {
        id: 'RBI/2025-26/242',
        department: 'Department of Regulation (DOR)',
        date: '11 March 2026',
        category: 'AML',
        keyRuleSummary: 'Section 51A UAPA implementation with updated UN sanctions list obligations for AML compliance.',
        riskLevel: 'HIGH',
        applicableEntities: 'All Regulated Entities',
        title: 'Section 51A UAPA sanctions list update'
      }
    ],
    []
  );

  const [cardState, setCardState] = useState<Record<string, CircularCardState>>(() => {
    const init: Record<string, CircularCardState> = {};
    for (const c of circulars) {
      init[c.id] = { status: 'NOT_ANALYZED', analysis: null, circularText: null, lastAnalyzedAt: null, message: null };
    }
    return init;
  });

  const [selectedCircularId, setSelectedCircularId] = useState<string | null>(null);
  const selectedState = selectedCircularId ? cardState[selectedCircularId] : null;
  const selectedCircular = useMemo(() => circulars.find(c => c.id === selectedCircularId) || null, [circulars, selectedCircularId]);

  const [showSource, setShowSource] = useState(false);
  useEffect(() => setShowSource(false), [selectedCircularId]);

  // Panel revalidation can change the circular's status (GAP_FOUND -> CLEAR).
  // We should keep the panel open so judges can visually see the loop close.

  type PanelGapRow = { gap: CircularGap; resolved: boolean; adding: boolean };
  const [panelGaps, setPanelGaps] = useState<PanelGapRow[]>([]);
  const [panelStatus, setPanelStatus] = useState<CircularStatus>('GAP_FOUND');
  const [panelSummary, setPanelSummary] = useState<string>('');
  const [panelTargetScore, setPanelTargetScore] = useState<number>(0);
  const [panelDisplayScore, setPanelDisplayScore] = useState<number>(0);
  const [panelLastAnalyzedAt, setPanelLastAnalyzedAt] = useState<number | null>(null);

  const [isRevalidating, setIsRevalidating] = useState(false);
  const [revalidationTone, setRevalidationTone] = useState<'blue' | 'green' | 'yellow'>('blue');
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerLine1, setBannerLine1] = useState('');
  const [bannerLine2, setBannerLine2] = useState<string | null>(null);
  const [gapAddingId, setGapAddingId] = useState<string | null>(null);

  const [mainScoreDisplayById, setMainScoreDisplayById] = useState<Record<string, number>>({});
  const prevSelectedScoreRef = useRef<number | null>(null);
  const [addedGapIds, setAddedGapIds] = useState<string[]>([]);
  const addedGapIdsRef = useRef<string[]>([]);

  const selectedScoreTarget = selectedCircularId ? cardState[selectedCircularId]?.analysis?.compliance_score ?? null : null;

  useEffect(() => {
    if (!selectedCircularId) return;
    const s = cardState[selectedCircularId];
    if (!s?.analysis) return;

    // Initialize panel local state only when the panel is opened for a (new) circular.
    setPanelStatus(s.status === 'CLEAR' ? 'CLEAR' : 'GAP_FOUND');
    setPanelSummary(s.analysis.summary || '');
    setPanelGaps((s.analysis.gaps || []).map((g) => ({ gap: g, resolved: false, adding: false })));
    setPanelTargetScore(typeof s.analysis.compliance_score === 'number' ? s.analysis.compliance_score : 0);
    setPanelDisplayScore(typeof s.analysis.compliance_score === 'number' ? s.analysis.compliance_score : 0);
    setPanelLastAnalyzedAt(s.lastAnalyzedAt);

    // Reset revalidation UI.
    setIsRevalidating(false);
    setBannerVisible(false);
    setBannerLine1('');
    setBannerLine2(null);
    setGapAddingId(null);
    setAddedGapIds([]);
    addedGapIdsRef.current = [];
  }, [selectedCircularId]);

  // Animate the selected circular's score on the main page.
  useEffect(() => {
    if (!selectedCircularId) return;
    const s = cardState[selectedCircularId];
    const target = s?.analysis?.compliance_score;
    if (typeof target !== 'number') return;

    const currentDisplayed = mainScoreDisplayById[selectedCircularId];
    const start = typeof currentDisplayed === 'number' ? currentDisplayed : (prevSelectedScoreRef.current ?? target);
    const oldVal = typeof prevSelectedScoreRef.current === 'number' ? prevSelectedScoreRef.current : start;
    if (oldVal === target) return;

    prevSelectedScoreRef.current = target;
    const startVal = oldVal;
    const durationMs = 1500;
    const steps = 30;
    const stepMs = Math.floor(durationMs / steps);
    let curr = startVal;
    const delta = (target - startVal) / steps;
    setMainScoreDisplayById((prev) => ({ ...prev, [selectedCircularId]: startVal }));

    const timer = setInterval(() => {
      curr += delta;
      const reached = (delta >= 0 && curr >= target) || (delta <= 0 && curr <= target);
      setMainScoreDisplayById((prev) => ({ ...prev, [selectedCircularId]: reached ? target : Math.round(curr) }));
      if (reached) clearInterval(timer);
    }, stepMs);

    return () => clearInterval(timer);
  }, [selectedCircularId, selectedScoreTarget]);

  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick(x => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // Toasts (local-only; matches existing UI patterns like Simulator).
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncViolations = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1800));
      setToast('Last synced: just now');
    } finally {
      setIsSyncing(false);
    }
  };

  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);

  async function analyzeCircular(circularId: string) {
    const currentPolicies = Array.isArray(rules) ? rules : [];

    // Guard: only run if there is circular text AND active policies to compare.
    // Circular text is server-side; here we ensure active policy rules exist.
    if (!currentPolicies.length) {
      setCardState(prev => ({
        ...prev,
        [circularId]: { ...prev[circularId], status: 'NOT_ANALYZED', analysis: null, circularText: null, message: EMPTY_GAP_MESSAGE, lastAnalyzedAt: null }
      }));
      return;
    }

    setCardState(prev => ({
      ...prev,
      [circularId]: { ...prev[circularId], status: 'PROCESSING', analysis: null, circularText: null, message: null }
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('http://localhost:3001/api/analyze-circular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circularId, activePolicyRules: currentPolicies }),
        signal: controller.signal
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Groq analysis failed (${response.status}). ${text}`);
      }

      const data = await response.json();
      const analysis: CircularAnalysis | null = data?.analysis ?? null;
      const circularText: string | null = typeof data?.circularText === 'string' ? data.circularText : null;

      const rawStatus = typeof analysis?.status === 'string' ? analysis.status.trim().toUpperCase() : '';
      const finalStatus: CircularStatus = rawStatus === 'GAP_FOUND' ? 'GAP_FOUND' : rawStatus === 'CLEAR' ? 'CLEAR' : 'NOT_ANALYZED';

      setCardState(prev => ({
        ...prev,
        [circularId]: {
          ...prev[circularId],
          status: finalStatus,
          analysis,
          circularText,
          lastAnalyzedAt: Date.now(),
          message: null
        }
      }));
    } catch (err: any) {
      console.error('Circular analysis error:', err);
      const errorMessage = err?.message || 'Unknown error occurred';
      
      setCardState(prev => ({
        ...prev,
        [circularId]: {
          ...prev[circularId],
          status: 'NOT_ANALYZED',
          analysis: null,
          circularText: null,
          message: `Analysis failed: ${errorMessage}`,
          lastAnalyzedAt: null
        }
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  const handleCircularStatusChange = (circularId: string, newStatus: CircularStatus, newAnalysis: CircularAnalysis, newCircularText?: string | null) => {
    setCardState(prev => ({
      ...prev,
      [circularId]: {
        ...prev[circularId],
        status: newStatus,
        analysis: newAnalysis,
        circularText: typeof newCircularText === 'string' ? newCircularText : prev[circularId].circularText,
        lastAnalyzedAt: Date.now(),
        message: null
      }
    }));
  };

  // Panel score counter animation (1.5s) whenever the target score changes.
  useEffect(() => {
    if (!bannerVisible && panelTargetScore === panelDisplayScore) return;
    const startVal = panelDisplayScore;
    const target = panelTargetScore;
    if (startVal === target) return;

    const durationMs = 1500;
    const steps = 30;
    const stepMs = Math.floor(durationMs / steps);
    const delta = (target - startVal) / steps;
    let curr = startVal;

    const timer = setInterval(() => {
      curr += delta;
      const reached = (delta >= 0 && curr >= target) || (delta <= 0 && curr <= target);
      setPanelDisplayScore((prev) => (reached ? target : Math.round(curr)));
      if (reached) clearInterval(timer);
    }, stepMs);

    return () => clearInterval(timer);
  }, [panelTargetScore]);

  const handleAddToPolicyEngineAndRevalidate = async (gap: CircularGap) => {
    if (!selectedCircularId) return;
    if (isRevalidating) return;

    const circularId = selectedCircularId;

    // Track manually added gaps for the nuclear fallback.
    const nextManualAddedIds = [...addedGapIdsRef.current, gap.gap_id];
    addedGapIdsRef.current = nextManualAddedIds;
    setAddedGapIds(nextManualAddedIds);

    // Snapshot gaps as they are before re-validation starts.
    const previousGapRowsSnapshot: PanelGapRow[] = panelGaps.map(r => ({
      gap: r.gap,
      resolved: r.resolved,
      adding: false
    }));
    const previousUnresolvedIds = previousGapRowsSnapshot
      .filter(r => !r.resolved)
      .map(r => r.gap.gap_id);

    // Step 1 — Adding
    const now = new Date();
    const ruleId = `RBI-RULE-${now.getTime()}`;
    const newRule: any = {
      clause_id: ruleId,
      condition: gap.circular_clause,
      obligation: gap.requirement,
      exception: null,
      section_ref: `RBI Monitor • ${circularId}`,
      confidence: 88,
      parent_id: null,

      // Metadata for Groq prompt matching.
      id: ruleId,
      name: gap.requirement,
      source: circularId,
      addedFrom: 'RBI Monitor',
      severity: gap.severity,
      timestamp: now.toISOString(),
      active: true
    };

    // UI: show adding state on the specific gap card.
    setPanelGaps(prev => prev.map(r => (r.gap.gap_id === gap.gap_id ? { ...r, adding: true } : r)));
    setGapAddingId(gap.gap_id);

    // Apply the rule to shared context immediately.
    setRules(prevRules => [...prevRules, newRule]);

    // UI: re-validation banner + blue pulse.
    setIsRevalidating(true);
    setRevalidationTone('blue');
    setBannerVisible(true);
    setBannerLine1('🔄 Re-validating circular against updated policies...');
    setBannerLine2('Groq is re-analyzing — this takes 2-4 seconds');

    try {
      // Wait 800ms for context to settle.
      await new Promise(resolve => setTimeout(resolve, 800));

      // FIX 2: Format rules into explicit plain fields for Groq.
      const baseRules = Array.isArray(rules) ? rules : [];
      const allRules = [...baseRules, newRule];

      // De-dup by clause_id/id to avoid exploding prompt size.
      const dedupedRules = Array.from(
        new Map(
          allRules.map((r: any) => {
            const key = r?.clause_id ?? r?.id ?? JSON.stringify(r);
            return [String(key), r];
          })
        ).values()
      );

      const formattedRules = dedupedRules
        .filter((r: any) => r && r.active !== false)
        .map((r: any) => ({
          rule_id: String(r.rule_id ?? r.id ?? r.clause_id ?? ''),
          policy_name: String(r.policy_name ?? r.name ?? r.clause_id ?? 'Policy'),
          condition: String(r.condition ?? r.requirement ?? r.obligation ?? ''),
          source: String(r.source ?? r.section_ref ?? 'Internal Policy'),
          added_from: String(r.added_from ?? r.addedFrom ?? 'Policy Manager'),
          active: r.active !== false
        }))
        .slice(0, 200);

      // FIX 3: Use explicit payload.
      const response = await fetch('http://localhost:3001/api/analyze-circular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circularId,
          activePolicyRules: formattedRules
        })
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Re-validation failed (${response.status}). ${text}`);
      }

      const data = await response.json();
      const newAnalysis: CircularAnalysis | null = data?.analysis ?? null;
      const newCircularText: string | null = typeof data?.circularText === 'string' ? data.circularText : null;

      if (!newAnalysis) throw new Error('No analysis returned by backend.');

      const receivedGaps = Array.isArray(newAnalysis.gaps) ? newAnalysis.gaps : [];

      // FIX 4 (nuclear option): Force-remove gaps that were manually resolved.
      const filteredGaps = receivedGaps.filter(g => !nextManualAddedIds.includes(g.gap_id));

      const nextStatus: CircularStatus = filteredGaps.length === 0 ? 'CLEAR' : 'GAP_FOUND';
      const nextComplianceScore =
        filteredGaps.length === 0
          ? 100
          : typeof newAnalysis.compliance_score === 'number'
            ? newAnalysis.compliance_score
            : panelTargetScore;

      // Update panel summary + score.
      setPanelSummary(newAnalysis.summary || '');
      setPanelTargetScore(nextComplianceScore);
      setPanelLastAnalyzedAt(Date.now());

      if (nextStatus === 'CLEAR') {
        // Step 3A — CLEAR
        setPanelStatus('CLEAR');
        setPanelGaps([]);
        setIsRevalidating(false);
        setGapAddingId(null);
        setRevalidationTone('green');
        setBannerVisible(true);
        setBannerLine1('🎉 All gaps resolved! Circular is now fully compliant.');
        setBannerLine2(null);

        const finalAnalysis: CircularAnalysis = {
          ...newAnalysis,
          status: 'CLEAR',
          gaps: [],
          compliance_score: 100,
          clauses_checked: newAnalysis.clauses_checked ?? 0,
          clauses_covered: newAnalysis.clauses_covered ?? 0
        };
        handleCircularStatusChange(circularId, 'CLEAR', finalAnalysis, newCircularText);
        return;
      }

      // Step 3B — GAP_FOUND (some gaps remain)
      const remainingIdsSet = new Set(filteredGaps.map(g => g.gap_id));
      const resolvedIds = previousUnresolvedIds.filter(id => !remainingIdsSet.has(id));
      const resolvedCount = resolvedIds.length;
      const remainingCount = filteredGaps.length;

      setPanelStatus('GAP_FOUND');

      // Update gaps list:
      // - gaps in filteredGaps -> normal (resolved:false)
      // - gaps not returned -> mark resolved:true (greyed out)
      // - new gaps -> append
      const remainingMap = new Map(filteredGaps.map(g => [g.gap_id, g]));
      const prevIdsSet = new Set(previousGapRowsSnapshot.map(r => r.gap.gap_id));
      const appended = filteredGaps
        .filter(g => !prevIdsSet.has(g.gap_id))
        .map(g => ({ gap: g, resolved: false, adding: false }));

      setPanelGaps(
        previousGapRowsSnapshot
          .map(r => {
            const updated = remainingMap.get(r.gap.gap_id);
            if (updated) return { ...r, gap: updated, resolved: false, adding: false };
            if (r.resolved) return { ...r, adding: false };
            return { ...r, resolved: true, adding: false };
          })
          .concat(appended)
      );

      setIsRevalidating(false);
      setGapAddingId(null);
      setRevalidationTone('yellow');
      setBannerVisible(true);
      setBannerLine1(`✅ ${resolvedCount} gap${resolvedCount === 1 ? '' : 's'} resolved. ${remainingCount} gap${remainingCount === 1 ? '' : 's'} remaining.`);
      setBannerLine2(null);

      const finalAnalysis: CircularAnalysis = {
        ...newAnalysis,
        status: 'GAP_FOUND',
        gaps: filteredGaps,
        compliance_score: nextComplianceScore,
        clauses_checked: newAnalysis.clauses_checked ?? 0,
        clauses_covered: newAnalysis.clauses_covered ?? 0
      };
      handleCircularStatusChange(circularId, 'GAP_FOUND', finalAnalysis, newCircularText);
    } catch (error) {
      setIsRevalidating(false);
      setGapAddingId(null);
      setRevalidationTone('yellow');
      setBannerVisible(true);
      setBannerLine1('Re-validation failed. Please retry.');
      setBannerLine2(null);
      setPanelGaps(prev => prev.map(r => ({ ...r, adding: false })));
    }
  };

  const handleAnalyzeAll = async () => {
    if (isAnalyzingAll) return;
    setIsAnalyzingAll(true);
    setAnalyzingStep(1);
    try {
      for (let i = 0; i < circulars.length; i++) {
        const cid = circulars[i].id;
        setAnalyzingStep(i + 1);
        await analyzeCircular(cid);
      }
    } finally {
      setIsAnalyzingAll(false);
      setAnalyzingStep(0);
    }
  };

  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const policyCoverageBarColor = (score: number) => (score > 80 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400');
  const policyCoverageBadgeColor = (score: number) => (score > 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600');

  // Print template (kept separate so we can control exactly what goes to PDF).
  const printData = useMemo(() => {
    if (!selectedCircularId) return null;
    const s = cardState[selectedCircularId];
    if (!s?.analysis) return null;
    return {
      circularId: selectedCircularId,
      analysis: s.analysis,
      analysisDate: s.lastAnalyzedAt ? new Date(s.lastAnalyzedAt) : new Date()
    };
  }, [cardState, selectedCircularId]);

  return (
    <div className="flex flex-col gap-10 w-full mx-auto pb-20">
      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            #gap-report, #gap-report * { visibility: visible !important; }
            #gap-report {
              display: block !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              padding: 24px !important;
              background: white !important;
            }
            .rbi-no-print { display: none !important; }
          }
        `}
      </style>

      {/* Live Status Bar */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card p-6 flex items-center justify-between border-[#A8E6CF]/30 shadow-xl shadow-emerald-900/[0.02]"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 relative" />
          </div>
          <span className="text-slate-800 font-black tracking-widest uppercase text-[10px]">
            Real-time feed active: RBI, SEBI, and ED Intelligence Nodes.
          </span>
        </div>
        <button
          onClick={handleSyncViolations}
          disabled={isSyncing}
          className="flex items-center gap-2 text-slate-400 hover:text-[#A8E6CF] transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />{' '}
          {isSyncing ? 'Syncing...' : 'Sync Violations'}
        </button>
      </motion.div>

      {/* Header Area */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start gap-6 flex-col sm:flex-row sm:items-end">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-white rounded-3xl shadow-lg border border-slate-100">
                <Eye className="w-10 h-10 text-[#A8E6CF]" />
              </div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tighter">RBI SEBI Monitor</h1>
            </div>
            <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl">
              Continuous cross-validation of internal AI policies against external regulatory movements.
            </p>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-3">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAnalyzeAll}
              disabled={isAnalyzingAll}
              className="h-16 px-10 bg-[#2D5A4C] text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-emerald-900/10 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAnalyzingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
              ANALYZE ALL
            </motion.button>
            {isAnalyzingAll && (
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/60 border border-slate-100 px-4 py-2 rounded-xl shadow-sm">
                Analyzing {analyzingStep} of {circulars.length}...
              </div>
            )}
          </div>
        </div>

        {/* Status Legend Bar */}
        <div className="flex items-center gap-8 bg-white/40 border border-slate-100 rounded-[2rem] px-8 py-4 shadow-sm">
          {[
            { label: 'GAP FOUND', color: 'bg-rose-500' },
            { label: 'CLEAR', color: 'bg-emerald-500' },
            { label: 'PROCESSING', color: 'bg-blue-500' },
            { label: 'NOT ANALYZED', color: 'bg-slate-300' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Circular Grid */}
      <div className="grid grid-cols-1 gap-6">
        {circulars.map((cir, i) => {
          const s = cardState[cir.id];
          const score = s?.analysis?.compliance_score ?? null;
          const displayScore = typeof score === 'number' ? (mainScoreDisplayById[cir.id] ?? score) : null;
          const countdown = getDeadlineCountdown(s?.analysis ?? null);
          const isProcessing = s?.status === 'PROCESSING';
          const isGap = s?.status === 'GAP_FOUND';
          const isClear = s?.status === 'CLEAR';

          const borderColor =
            isGap ? '#FECACA' : isClear ? '#BBF7D0' : isProcessing ? '#BFDBFE' : '#E5E7EB';

          return (
            <motion.div
              key={cir.id}
              initial={{ opacity: 0, x: -20 }}
              style={{ borderColor }}
              animate={{ opacity: 1, x: 0, borderColor }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-card p-8 flex items-start justify-between transition-all group bg-white/70 shadow-lg shadow-emerald-900/[0.01] border"
            >
              <div className="flex items-start gap-6 flex-1">
                <div className={`p-4 rounded-3xl shadow-inner ${isGap ? 'bg-rose-50 text-rose-500' : isClear ? 'bg-emerald-50 text-emerald-600' : isProcessing ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
                  <Bell className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-[#A8E6CF] font-black text-xs font-mono">{cir.id}</span>
                    <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest">Released: {cir.date}</span>
                  </div>

                  <h3 className="text-xl text-slate-800 font-black tracking-tight leading-tight">{cir.title}</h3>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-4xl">{cir.keyRuleSummary}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-white/80 text-slate-600 border-slate-200">
                      Department: {cir.department}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100">
                      Category: {cir.category}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        cir.riskLevel === 'HIGH'
                          ? 'bg-rose-50 text-rose-600 border-rose-100'
                          : cir.riskLevel === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}
                    >
                      Risk: {cir.riskLevel}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-100">
                      Entities: {cir.applicableEntities}
                    </span>
                  </div>

                  {s?.lastAnalyzedAt && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatMinsAgo(s.lastAnalyzedAt)}</p>}

                  {typeof displayScore === 'number' && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${policyCoverageBadgeColor(displayScore)}`}>
                          Policy Coverage: {displayScore}%
                        </span>
                        {countdown && (
                          <span className="px-3 py-1 bg-amber-50 border border-amber-100 text-amber-700 font-black text-[10px] uppercase rounded-lg">
                            ⏳ {countdown.days} days to comply
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${displayScore}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full ${policyCoverageBarColor(displayScore)}`}
                        />
                      </div>
                    </div>
                  )}

                  {s?.message && (
                    <div className="mt-4 text-rose-600 font-black text-[10px] uppercase tracking-widest border border-rose-100 bg-rose-50 rounded-xl px-4 py-3">
                      {s.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 rbi-no-print">
                {s?.status === 'NOT_ANALYZED' && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => analyzeCircular(cir.id)}
                    className="px-7 py-4 bg-[#A8E6CF] text-[#2D5A4C] rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-900/10 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 animate-pulse"
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest">ANALYZE WITH AI</span>
                  </motion.button>
                )}

                {isProcessing && (
                  <div className="px-7 py-4 bg-blue-50 text-blue-600 rounded-[2rem] border border-blue-100 font-black text-[11px] uppercase tracking-widest flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Groq is analyzing...
                  </div>
                )}

                {isGap && s?.analysis && (
                  <>
                    <div className="px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] border flex items-center gap-2 border-rose-100 bg-rose-50 text-rose-500">
                      <AlertCircle className="w-4 h-4" />
                      🔴 GAP FOUND
                    </div>

                    <button
                      onClick={() => setSelectedCircularId(cir.id)}
                      className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-rose-500 shadow-sm group-hover:bg-[#A8E6CF] group-hover:text-white transition-all"
                      aria-label="Open Gap Detail Panel"
                    >
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {isClear && (
                  <div className="px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] border flex items-center gap-2 border-emerald-100 bg-[#A8E6CF]/10 text-[#2D5A4C]">
                    <CheckCircle2 className="w-4 h-4" />
                    ✅ CLEAR
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Slide-in Overlay Panel */}
      <AnimatePresence>
        {selectedCircularId && selectedCircular?.id && selectedState?.analysis && selectedState.circularText && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            className="w-[95vw] sm:w-[700px] bg-white fixed right-0 top-0 bottom-0 z-[220] shadow-[-40px_0_100px_rgba(0,0,0,0.1)] flex flex-col p-12 overflow-hidden border-l border-slate-100"
          >
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-rose-50 rounded-2xl text-rose-500">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">GAP ANALYSIS REPORT</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {selectedCircular.id} • Policy Coverage: {panelDisplayScore}%
                      {panelLastAnalyzedAt ? ` • ${formatDateTime(panelLastAnalyzedAt)}` : ' • —'}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      {panelStatus === 'CLEAR' ? (
                        <span className="px-4 py-2 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-emerald-100 bg-emerald-50 text-emerald-600">
                          ✅ CLEAR
                        </span>
                      ) : (
                        <span className="px-4 py-2 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-rose-100 bg-rose-50 text-rose-500">
                          🔴 GAP FOUND
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCircularId(null)}
                className="px-6 py-2.5 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all rbi-no-print"
              >
                Close Panel
              </button>
            </div>

            <AnimatePresence>
              {bannerVisible && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-10 px-8 py-6 rounded-[2rem] border shadow-sm ${
                    revalidationTone === 'green'
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : revalidationTone === 'yellow'
                        ? 'bg-amber-50 border-amber-100 text-amber-700'
                        : 'bg-blue-50 border-blue-100 text-blue-700'
                  } ${revalidationTone === 'blue' ? 'animate-pulse' : ''}`}
                >
                  <div className="text-[12px] font-black uppercase tracking-widest">{bannerLine1}</div>
                  {bannerLine2 && (
                    <div className="mt-2 text-[11px] font-black uppercase tracking-widest opacity-80">
                      {bannerLine2}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto space-y-12 pr-4 custom-scrollbar">
              {/* Section 1 — AI Summary */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">AI SUMMARY</h3>
                <div className="p-8 bg-rose-50/50 rounded-[2.5rem] border border-rose-100 text-rose-600 font-bold text-lg leading-relaxed shadow-inner">
                  {panelSummary}
                </div>
              </div>

              {/* Section 2 — GAPS FOUND */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">GAPS FOUND</h3>
                <div className="space-y-6">
                  {panelStatus === 'CLEAR' ? (
                    <div className="p-12 bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] text-emerald-700 font-black uppercase tracking-widest text-center text-[11px]">
                      ✅ No compliance gaps detected.
                    </div>
                  ) : (
                    panelGaps.map((row, idx) => {
                      const gap = row.gap;
                      const sevClasses = severityBadgeClasses(gap.severity);
                      const sevLabel =
                        gap.severity === 'CRITICAL'
                          ? '🔴 CRITICAL'
                          : gap.severity === 'MODERATE'
                            ? '🟡 MODERATE'
                            : '🟢 ADVISORY';

                      const isDimmed = isRevalidating || row.resolved;

                      return (
                        <motion.div
                          key={`${gap.gap_id}-${idx}`}
                          className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-emerald-900/[0.02]"
                          animate={{
                            opacity: isDimmed ? 0.4 : 1,
                            scale: row.resolved ? 0.98 : 1
                          }}
                          transition={{ duration: 0.4 }}
                        >
                          <div className="flex items-start justify-between gap-6">
                            <div className="flex items-start gap-4">
                              <div className={`px-4 py-2 rounded-2xl border ${sevClasses.wrap} font-black text-[10px] uppercase tracking-widest flex items-center gap-2`}>
                                <span className={`w-2 h-2 rounded-full ${sevClasses.dot}`} />
                                {sevLabel}
                              </div>

                              {row.resolved && (
                                <div className="pt-1">
                                  <div className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-400 rounded-lg font-black text-[10px] uppercase tracking-widest">
                                    ✅ Resolved
                                  </div>
                                </div>
                              )}

                              <div className="pt-1">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gap ID</div>
                                <div className="text-lg font-black text-slate-800">{gap.gap_id}</div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 space-y-5">
                            <div className="space-y-2">
                              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Circular Clause:</div>
                              <div className="text-sm font-mono font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-[1.2rem] p-4 leading-relaxed">
                                {gap.circular_clause}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Your Policy:</div>
                              <div className="text-sm font-mono font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-[1.2rem] p-4 leading-relaxed">
                                No matching rule found
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Deadline:</div>
                                <div className="text-sm font-mono font-bold text-slate-700 bg-white border border-slate-100 rounded-[1.2rem] p-4 leading-relaxed">
                                  {gap.deadline ? gap.deadline : 'Not specified'}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Required Fix:</div>
                                <div className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-[1.2rem] p-4 leading-relaxed">
                                  {gap.remediation}
                                </div>
                              </div>
                            </div>

                            {row.adding ? (
                              <div className="rbi-no-print w-full h-16 bg-blue-50 border border-blue-100 text-blue-700 rounded-[2rem] font-black text-lg shadow-2xl shadow-emerald-900/10 flex items-center justify-center gap-4">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Adding rule to Policy Engine...
                              </div>
                            ) : row.resolved ? (
                              <div className="w-full h-16 bg-slate-50 border border-slate-200 text-slate-400 rounded-[2rem] font-black text-lg flex items-center justify-center">
                                ✅ Resolved
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setToast('Rule added to Policy Engine ✅');
                                  handleAddToPolicyEngineAndRevalidate(gap);
                                }}
                                disabled={isRevalidating}
                                className="rbi-no-print w-full h-16 bg-[#2D5A4C] text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-emerald-900/10 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                ➕ Add to Policy Engine
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Section 3 — Circular Source */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">CIRCULAR SOURCE TEXT</h3>
                <button
                  onClick={() => setShowSource(v => !v)}
                  className="w-full flex items-center justify-between px-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-slate-700 uppercase tracking-widest text-[10px] rbi-no-print"
                >
                  <span className="flex items-center gap-3">
                    View Source Circular ▼
                  </span>
                  {showSource ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                <AnimatePresence>
                  {showSource && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-lg shadow-emerald-900/[0.02]"
                    >
                      <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed">
                        {selectedState.circularText}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-10 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="rbi-no-print w-full h-16 bg-[#A8E6CF] text-[#2D5A4C] rounded-[2rem] font-black text-lg shadow-2xl shadow-emerald-900/10 hover:-translate-y-1 transition-all flex items-center justify-center gap-4"
              >
                <Download className="w-6 h-6" />
                📄 Export Gap Report as PDF
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden print-only template */}
      <div id="gap-report" style={{ display: 'none' }} className="rbi-print-only">
        {printData && (
          <div>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="space-y-2 border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">GAP ANALYSIS REPORT</h1>
                <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest">
                  {printData.circularId}
                </p>
                <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest">
                  Analysis Date: {formatDateTime(printData.analysisDate.getTime())}
                </p>
                <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest mt-2">
                  Policy Coverage: {printData.analysis.compliance_score}%
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-[12px] font-black text-slate-700 uppercase tracking-widest">GAPS FOUND</h2>
                {printData.analysis.gaps.map((gap, idx) => {
                  const sevClasses = severityBadgeClasses(gap.severity);
                  const sevLabel = gap.severity === 'CRITICAL' ? 'CRITICAL' : gap.severity === 'MODERATE' ? 'MODERATE' : 'ADVISORY';

                  return (
                    <div key={`${gap.gap_id}-${idx}`} className="border border-slate-200 rounded-[1.5rem] p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Gap ID: {gap.gap_id}</div>
                        <div className={`px-3 py-1 rounded-lg border text-[11px] font-black uppercase tracking-widest ${sevClasses.wrap}`}>
                          {sevLabel}
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Circular Clause:</div>
                        <div className="text-sm font-mono text-slate-700 leading-relaxed">{gap.circular_clause}</div>

                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Deadline:</div>
                        <div className="text-sm font-mono text-slate-700 leading-relaxed">{gap.deadline ? gap.deadline : 'Not specified'}</div>

                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Required Fix:</div>
                        <div className="text-sm font-bold text-slate-800 leading-relaxed">{gap.remediation}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: -40, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-0 self-center z-[300] rbi-no-print">
            <div className="bg-[#A8E6CF] text-[#2D5A4C] px-10 py-5 rounded-[2rem] shadow-2xl shadow-emerald-500/20 flex items-center gap-4 border-2 border-white">
              <CheckCircle2 className="w-6 h-6 stroke-[3px]" />
              <span className="font-black text-sm uppercase tracking-widest">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Touch nowTick to re-render "Last analyzed: X mins ago" */}
      {nowTick ? null : null}
    </div>
  );
};
