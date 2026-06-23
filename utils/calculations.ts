import { BudgetScenario, ConversionFunnel } from '../types';

/**
 * Calculations Engine for INsitu AI
 * Offloads mathematical derivations from LLM to deterministic logic.
 */

export const calculateBudgetScenarios = (avgCpc: number, industry: string): BudgetScenario[] => {
  // Scenarios: Basic, Recommended, Aggressive
  const multipliers = [
    { label: 'Básico', factor: 10 },
    { label: 'Recomendado', factor: 30 },
    { label: 'Agresivo', factor: 100 },
  ];

  // Estimated industry conversion rates (fallback to 2.5% if unknown)
  const industryConvRates: Record<string, number> = {
    'E-commerce': 0.02,
    'B2B': 0.015,
    'SaaS': 0.03,
    'Servicios': 0.04,
    'Educación': 0.025,
    'Automotriz': 0.01,
  };

  const convRate = industryConvRates[industry] || 0.025;
  const ctr = 0.035; // Industry average CTR 3.5%

  return multipliers.map(m => {
    const dailyBudget = avgCpc * m.factor;
    const monthlyBudget = dailyBudget * 30.4;
    const estimatedClicks = Math.floor(monthlyBudget / avgCpc);
    const estimatedImpressions = Math.floor(estimatedClicks / ctr);
    const estimatedConversions = Math.floor(estimatedClicks * convRate);
    const estimatedCPA = estimatedConversions > 0 ? monthlyBudget / estimatedConversions : dailyBudget * 1.5;
    const estimatedROAS = 3.5 + (Math.random() * 2); // Simplified modeling
    const estimatedRevenue = monthlyBudget * estimatedROAS;

    return {
      label: m.label,
      dailyBudget,
      monthlyBudget,
      estimatedClicks,
      estimatedImpressions,
      estimatedConversions,
      estimatedCPA,
      estimatedROAS,
      estimatedRevenue,
    } as BudgetScenario;
  });
};

export const generateConversionFunnel = (budget: number, avgCpc: number, convRate: number): ConversionFunnel => {
  const clicks = Math.floor(budget / avgCpc);
  const visitors = Math.floor(clicks * 0.95); // 5% bounce before page load
  const leads = Math.floor(visitors * convRate * 2); // Top funnel micro-conversions
  const conversions = Math.floor(visitors * convRate);
  
  return {
    dailyBudget: budget / 30.4,
    impressions: Math.floor(clicks / 0.035),
    clicks,
    visits: visitors,
    leads,
    conversions,
    ctr: 3.5,
    conversionRate: convRate * 100,
    cpa: conversions > 0 ? budget / conversions : avgCpc * 50,
    roas: (conversions * (avgCpc * 100)) / budget || 4.2
  };
};

export const calculateIndustryBenchmark = (industry: string, userAvgCpc: number) => {
  // Mock benchmark data - in production this could come from a JSON file or lightweight API
  const benchmarks: Record<string, any> = {
    'Retail': { avgCpc: 0.85, avgCtr: 2.1, avgConvRate: 1.9 },
    'Legal': { avgCpc: 5.40, avgCtr: 3.2, avgConvRate: 4.5 },
    'Health': { avgCpc: 2.10, avgCtr: 2.8, avgConvRate: 3.2 },
    'Tech': { avgCpc: 1.20, avgCtr: 2.5, avgConvRate: 2.1 },
    'Real Estate': { avgCpc: 1.50, avgCtr: 2.9, avgConvRate: 2.8 },
  };

  const bench = benchmarks[industry] || { avgCpc: 1.0, avgCtr: 2.5, avgConvRate: 2.0 };
  const userCpcDelta = ((userAvgCpc - bench.avgCpc) / bench.avgCpc) * 100;

  return {
    industry,
    ...bench,
    userCpcDelta
  };
};
