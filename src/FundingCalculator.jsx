import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Users, Clock, PoundSterling, TrendingUp, AlertCircle, CheckCircle, Calculator, Trash2, Edit2, X, ChevronDown, ChevronUp, Settings, Calendar } from 'lucide-react';

// UK Funding Constants
const FUNDING_SCHEMES = {
  universal_15: {
    name: '15 Hours Universal',
    description: 'All 3-4 year olds',
    hoursPerYear: 570,
    weeksTermTime: 38,
    ageMin: 3,
    ageMax: 4,
    color: '#3B82F6'
  },
  eligible_2yr: {
    name: '15 Hours (Eligible 2yr)',
    description: 'Eligible 2 year olds',
    hoursPerYear: 570,
    weeksTermTime: 38,
    ageMin: 2,
    ageMax: 2,
    color: '#8B5CF6'
  },
  extended_30: {
    name: '30 Hours Extended',
    description: 'Working parents 3-4yr olds',
    hoursPerYear: 1140,
    weeksTermTime: 38,
    ageMin: 3,
    ageMax: 4,
    color: '#10B981'
  },
  expanded_under2: {
    name: '15 Hours Expanded',
    description: 'Working parents 9mo-2yr',
    hoursPerYear: 570,
    weeksTermTime: 38,
    ageMin: 0.75,
    ageMax: 2,
    color: '#F59E0B'
  }
};

const SAMPLE_CHILDREN = [
  {
    id: 1,
    name: 'Emma Thompson',
    dob: '2022-03-15',
    entitlement: 'extended_30',
    weeklyPattern: { mon: 6, tue: 6, wed: 6, thu: 6, fri: 6 },
    hoursUsed: 456,
    stretchedOption: false
  },
  {
    id: 2,
    name: 'Oliver Smith',
    dob: '2023-06-20',
    entitlement: 'eligible_2yr',
    weeklyPattern: { mon: 5, tue: 5, wed: 5, thu: 0, fri: 0 },
    hoursUsed: 180,
    stretchedOption: true
  },
  {
    id: 3,
    name: 'Sophia Williams',
    dob: '2024-01-10',
    entitlement: 'expanded_under2',
    weeklyPattern: { mon: 4, tue: 4, wed: 4, thu: 4, fri: 0 },
    hoursUsed: 96,
    stretchedOption: false
  }
];

// Helper functions
const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const calculateAgeInMonths = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  return (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
};

const getWeeklyHours = (pattern) => {
  return Object.values(pattern).reduce((sum, hours) => sum + hours, 0);
};

const calculateFundedWeeklyHours = (scheme, stretched, operatingWeeks = 51) => {
  const funding = FUNDING_SCHEMES[scheme];
  if (stretched) {
    return Math.round((funding.hoursPerYear / operatingWeeks) * 100) / 100;
  }
  return Math.round((funding.hoursPerYear / funding.weeksTermTime) * 100) / 100;
};

const getCurrentTermWeek = () => {
  // Simplified - assumes we're in term
  const termStart = new Date('2025-01-06');
  const today = new Date();
  const weeksDiff = Math.floor((today - termStart) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(weeksDiff + 1, 38));
};

export default function FundingCalculator() {
  const [children, setChildren] = useState(SAMPLE_CHILDREN);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [providerSettings, setProviderSettings] = useState({
    hourlyRate: 7.50,
    operatingWeeks: 51,
    mealCharge: 3.50,
    consumablesCharge: 1.50
  });
  const [showSettings, setShowSettings] = useState(false);

  // New child form state
  const [newChild, setNewChild] = useState({
    name: '',
    dob: '',
    entitlement: 'universal_15',
    weeklyPattern: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 },
    hoursUsed: 0,
    stretchedOption: false
  });

  // Quotation state
  const [quotation, setQuotation] = useState({
    childId: null,
    weeksToQuote: 4,
    includeMeals: true,
    mealsPerWeek: 5,
    includeConsumables: true
  });

  // Calculate summary statistics
  const summary = useMemo(() => {
    let totalFundedHours = 0;
    let totalUsedHours = 0;
    let totalRemainingHours = 0;

    children.forEach(child => {
      const scheme = FUNDING_SCHEMES[child.entitlement];
      totalFundedHours += scheme.hoursPerYear;
      totalUsedHours += child.hoursUsed;
      totalRemainingHours += scheme.hoursPerYear - child.hoursUsed;
    });

    return {
      totalChildren: children.length,
      totalFundedHours,
      totalUsedHours,
      totalRemainingHours,
      averageUtilisation: totalFundedHours > 0 ? Math.round((totalUsedHours / totalFundedHours) * 100) : 0
    };
  }, [children]);

  // Calculate optimisation suggestions
  const optimisations = useMemo(() => {
    const suggestions = [];
    const currentWeek = getCurrentTermWeek();
    const weeksRemaining = 38 - currentWeek;

    children.forEach(child => {
      const scheme = FUNDING_SCHEMES[child.entitlement];
      const weeklyBooked = getWeeklyHours(child.weeklyPattern);
      const fundedWeekly = calculateFundedWeeklyHours(child.entitlement, child.stretchedOption, providerSettings.operatingWeeks);
      const remaining = scheme.hoursPerYear - child.hoursUsed;
      const projectedUsage = child.hoursUsed + (weeklyBooked * weeksRemaining);

      // Under-utilisation warning
      if (projectedUsage < scheme.hoursPerYear * 0.85) {
        const shortfall = scheme.hoursPerYear - projectedUsage;
        suggestions.push({
          type: 'warning',
          child: child.name,
          title: 'Under-utilisation projected',
          message: `${child.name} is on track to use only ${Math.round(projectedUsage)} of ${scheme.hoursPerYear} funded hours (${Math.round(shortfall)} hours unused).`,
          recommendation: `Consider increasing weekly hours by ${Math.ceil(shortfall / weeksRemaining)} hours to maximise funding.`
        });
      }

      // Over-booking warning
      if (weeklyBooked > fundedWeekly + 2) {
        suggestions.push({
          type: 'info',
          child: child.name,
          title: 'Additional hours being used',
          message: `${child.name} is booked for ${weeklyBooked}hrs/week but only ${fundedWeekly.toFixed(1)}hrs/week are funded.`,
          recommendation: `Parent will be charged for ${(weeklyBooked - fundedWeekly).toFixed(1)} additional hours per week.`
        });
      }

      // Stretching recommendation
      if (!child.stretchedOption && weeklyBooked > fundedWeekly) {
        const stretchedWeekly = calculateFundedWeeklyHours(child.entitlement, true, providerSettings.operatingWeeks);
        if (stretchedWeekly >= weeklyBooked * 0.9) {
          suggestions.push({
            type: 'success',
            child: child.name,
            title: 'Stretching recommended',
            message: `Switching ${child.name} to stretched funding would provide ${stretchedWeekly.toFixed(1)}hrs/week over ${providerSettings.operatingWeeks} weeks.`,
            recommendation: `This could reduce parent charges while maintaining the same booking pattern.`
          });
        }
      }
    });

    return suggestions;
  }, [children, providerSettings]);

  // Add child handler
  const handleAddChild = () => {
    if (!newChild.name || !newChild.dob) return;

    setChildren([...children, {
      ...newChild,
      id: Date.now()
    }]);
    setNewChild({
      name: '',
      dob: '',
      entitlement: 'universal_15',
      weeklyPattern: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 },
      hoursUsed: 0,
      stretchedOption: false
    });
    setShowAddChild(false);
  };

  // Delete child handler
  const handleDeleteChild = (id) => {
    setChildren(children.filter(c => c.id !== id));
  };

  // Update child hours
  const updateChildHours = (id, hours) => {
    setChildren(children.map(c =>
      c.id === id ? { ...c, hoursUsed: Math.max(0, hours) } : c
    ));
  };

  // Generate quotation
  const generateQuotation = () => {
    if (!quotation.childId) return null;

    const child = children.find(c => c.id === quotation.childId);
    if (!child) return null;

    const weeklyBooked = getWeeklyHours(child.weeklyPattern);
    const fundedWeekly = calculateFundedWeeklyHours(child.entitlement, child.stretchedOption, providerSettings.operatingWeeks);
    const chargeableHours = Math.max(0, weeklyBooked - fundedWeekly);

    const weeklySessionCost = weeklyBooked * providerSettings.hourlyRate;
    const weeklyFundedValue = Math.min(weeklyBooked, fundedWeekly) * providerSettings.hourlyRate;
    const weeklyChargeableHours = chargeableHours * providerSettings.hourlyRate;
    const weeklyMeals = quotation.includeMeals ? quotation.mealsPerWeek * providerSettings.mealCharge : 0;
    const weeklyConsumables = quotation.includeConsumables ? providerSettings.consumablesCharge * 5 : 0;

    const weeklyTotal = weeklyChargeableHours + weeklyMeals + weeklyConsumables;
    const periodTotal = weeklyTotal * quotation.weeksToQuote;

    return {
      child,
      weeklyBooked,
      fundedWeekly,
      chargeableHours,
      weeklySessionCost,
      weeklyFundedValue,
      weeklyChargeableHours,
      weeklyMeals,
      weeklyConsumables,
      weeklyTotal,
      periodTotal,
      weeks: quotation.weeksToQuote
    };
  };

  const quote = generateQuotation();

  // Chart data for usage overview
  const usageChartData = children.map(child => {
    const scheme = FUNDING_SCHEMES[child.entitlement];
    return {
      name: child.name.split(' ')[0],
      used: child.hoursUsed,
      remaining: scheme.hoursPerYear - child.hoursUsed,
      total: scheme.hoursPerYear
    };
  });

  const pieData = [
    { name: 'Used', value: summary.totalUsedHours, color: '#10B981' },
    { name: 'Remaining', value: summary.totalRemainingHours, color: '#E5E7EB' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Funded Hours Calculator</h1>
              <p className="text-sm text-gray-500">UK Childcare Provider Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Spring Term 2025</span>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded">
                Week {getCurrentTermWeek()} of 38
              </span>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showSettings
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Settings size={16} />
                {providerSettings.operatingWeeks} weeks
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 mt-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'children', label: 'Children', icon: Users },
              { id: 'quotation', label: 'Quotation', icon: Calculator },
              { id: 'optimise', label: 'Optimise', icon: CheckCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Stretched Weeks Settings Panel */}
      {showSettings && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex items-start gap-6">
              {/* Slider Section */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="text-purple-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Stretched Funding Weeks</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Set how many weeks your setting operates per year for stretched funding calculations.
                </p>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-500 w-8">39</span>
                  <input
                    type="range"
                    min="39"
                    max="52"
                    value={providerSettings.operatingWeeks}
                    onChange={(e) => setProviderSettings({...providerSettings, operatingWeeks: parseInt(e.target.value)})}
                    className="flex-1 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <span className="text-sm font-medium text-gray-500 w-8">52</span>
                </div>

                <div className="flex items-center justify-center mt-3">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-purple-200">
                    <span className="text-3xl font-bold text-purple-700">{providerSettings.operatingWeeks}</span>
                    <span className="text-sm text-gray-500 ml-1">weeks/year</span>
                  </div>
                </div>
              </div>

              {/* Impact Preview */}
              <div className="w-80 bg-white rounded-xl p-4 shadow-sm border border-purple-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Weekly Hours Impact</h4>
                <div className="space-y-2">
                  {Object.entries(FUNDING_SCHEMES).map(([key, scheme]) => {
                    const termTime = (scheme.hoursPerYear / 38).toFixed(1);
                    const stretched = (scheme.hoursPerYear / providerSettings.operatingWeeks).toFixed(1);
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scheme.color }} />
                          <span className="text-gray-600">{scheme.name.replace(' Hours', 'hr')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 line-through">{termTime}</span>
                          <span className="text-purple-700 font-medium">{stretched} hrs/wk</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                  Compared to 38-week term-time
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Children</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalChildren}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Hours Used</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalUsedHours.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="text-amber-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Hours Remaining</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalRemainingHours.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg Utilisation</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.averageUtilisation}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Usage by Child */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours Usage by Child</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={usageChartData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="used" stackId="a" fill="#10B981" name="Used" />
                    <Bar dataKey="remaining" stackId="a" fill="#E5E7EB" name="Remaining" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Overall Pie Chart */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Funded Hours</h3>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-2">
                  <p className="text-3xl font-bold text-gray-900">{summary.averageUtilisation}%</p>
                  <p className="text-sm text-gray-500">Overall Utilisation</p>
                </div>
              </div>
            </div>

            {/* Quick Alerts */}
            {optimisations.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Alerts</h3>
                <div className="space-y-3">
                  {optimisations.slice(0, 3).map((opt, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                      opt.type === 'warning' ? 'bg-amber-50' :
                      opt.type === 'success' ? 'bg-green-50' : 'bg-blue-50'
                    }`}>
                      <AlertCircle className={`mt-0.5 ${
                        opt.type === 'warning' ? 'text-amber-600' :
                        opt.type === 'success' ? 'text-green-600' : 'text-blue-600'
                      }`} size={18} />
                      <div>
                        <p className="font-medium text-gray-900">{opt.title}</p>
                        <p className="text-sm text-gray-600">{opt.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Children Tab */}
        {activeTab === 'children' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Manage Children</h2>
              <button
                onClick={() => setShowAddChild(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Add Child
              </button>
            </div>

            {/* Add Child Modal */}
            {showAddChild && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Add New Child</h3>
                    <button onClick={() => setShowAddChild(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Child's Name</label>
                      <input
                        type="text"
                        value={newChild.name}
                        onChange={(e) => setNewChild({...newChild, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={newChild.dob}
                        onChange={(e) => setNewChild({...newChild, dob: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Funding Entitlement</label>
                      <select
                        value={newChild.entitlement}
                        onChange={(e) => setNewChild({...newChild, entitlement: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Object.entries(FUNDING_SCHEMES).map(([key, scheme]) => (
                          <option key={key} value={key}>{scheme.name} - {scheme.description}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Attendance Pattern (hours)</label>
                      <div className="grid grid-cols-5 gap-2">
                        {['mon', 'tue', 'wed', 'thu', 'fri'].map(day => (
                          <div key={day}>
                            <label className="block text-xs text-gray-500 text-center mb-1">{day.toUpperCase()}</label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={newChild.weeklyPattern[day]}
                              onChange={(e) => setNewChild({
                                ...newChild,
                                weeklyPattern: {...newChild.weeklyPattern, [day]: parseFloat(e.target.value) || 0}
                              })}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Total: {getWeeklyHours(newChild.weeklyPattern)} hours/week
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="stretched"
                        checked={newChild.stretchedOption}
                        onChange={(e) => setNewChild({...newChild, stretchedOption: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="stretched" className="text-sm text-gray-700">
                        Use stretched funding (spread over {providerSettings.operatingWeeks} weeks)
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAddChild(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddChild}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Child
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Children List */}
            <div className="space-y-4">
              {children.map(child => {
                const scheme = FUNDING_SCHEMES[child.entitlement];
                const weeklyBooked = getWeeklyHours(child.weeklyPattern);
                const fundedWeekly = calculateFundedWeeklyHours(child.entitlement, child.stretchedOption, providerSettings.operatingWeeks);
                const usagePercent = Math.round((child.hoursUsed / scheme.hoursPerYear) * 100);
                const expanded = selectedChild === child.id;

                return (
                  <div key={child.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div
                      className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setSelectedChild(expanded ? null : child.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: scheme.color }}
                          >
                            {child.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{child.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="text-xs px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: scheme.color }}
                              >
                                {scheme.name}
                              </span>
                              <span className="text-sm text-gray-500">
                                Age: {calculateAge(child.dob)}
                              </span>
                              {child.stretchedOption && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  Stretched
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Hours Used</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {child.hoursUsed} / {scheme.hoursPerYear}
                            </p>
                          </div>
                          <div className="w-32">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Usage</span>
                              <span>{usagePercent}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, usagePercent)}%`,
                                  backgroundColor: usagePercent > 90 ? '#EF4444' : usagePercent > 70 ? '#F59E0B' : '#10B981'
                                }}
                              />
                            </div>
                          </div>
                          {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                        </div>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-gray-100 p-5 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Weekly Pattern</h4>
                            <div className="grid grid-cols-5 gap-1">
                              {Object.entries(child.weeklyPattern).map(([day, hours]) => (
                                <div key={day} className="text-center">
                                  <div className="text-xs text-gray-500 uppercase">{day}</div>
                                  <div className={`text-sm font-medium ${hours > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                    {hours}h
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              Total: <span className="font-medium">{weeklyBooked} hrs/week</span>
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Funding Details</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Funded weekly:</span>
                                <span className="font-medium">{fundedWeekly.toFixed(1)} hrs</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Chargeable weekly:</span>
                                <span className="font-medium">{Math.max(0, weeklyBooked - fundedWeekly).toFixed(1)} hrs</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Annual allocation:</span>
                                <span className="font-medium">{scheme.hoursPerYear} hrs</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Record Hours</h4>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={child.hoursUsed}
                                onChange={(e) => updateChildHours(child.id, parseFloat(e.target.value) || 0)}
                                className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-center"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-sm text-gray-500">hours used to date</span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateChildHours(child.id, child.hoursUsed + weeklyBooked);
                                }}
                                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                + Add Week ({weeklyBooked}h)
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChild(child.id);
                                }}
                                className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quotation Tab */}
        {activeTab === 'quotation' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Parent Fee Quotation</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quotation Form */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Quote</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Child</label>
                    <select
                      value={quotation.childId || ''}
                      onChange={(e) => setQuotation({...quotation, childId: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Choose a child...</option>
                      {children.map(child => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weeks to Quote</label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={quotation.weeksToQuote}
                      onChange={(e) => setQuotation({...quotation, weeksToQuote: parseInt(e.target.value) || 1})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="meals"
                        checked={quotation.includeMeals}
                        onChange={(e) => setQuotation({...quotation, includeMeals: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="meals" className="text-sm text-gray-700">
                        Include meals (£{providerSettings.mealCharge.toFixed(2)}/meal)
                      </label>
                    </div>

                    {quotation.includeMeals && (
                      <div className="ml-6">
                        <label className="block text-xs text-gray-500 mb-1">Meals per week</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={quotation.mealsPerWeek}
                          onChange={(e) => setQuotation({...quotation, mealsPerWeek: parseInt(e.target.value) || 0})}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-center"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="consumables"
                        checked={quotation.includeConsumables}
                        onChange={(e) => setQuotation({...quotation, includeConsumables: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="consumables" className="text-sm text-gray-700">
                        Include consumables (£{providerSettings.consumablesCharge.toFixed(2)}/day)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Provider Settings */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Provider Settings</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Hourly Rate (£)</label>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={providerSettings.hourlyRate}
                        onChange={(e) => setProviderSettings({...providerSettings, hourlyRate: parseFloat(e.target.value) || 0})}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Meal Charge (£)</label>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={providerSettings.mealCharge}
                        onChange={(e) => setProviderSettings({...providerSettings, mealCharge: parseFloat(e.target.value) || 0})}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="mt-3 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Settings size={14} />
                    Stretched weeks: {providerSettings.operatingWeeks} (click to change)
                  </button>
                </div>
              </div>

              {/* Quote Output */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Breakdown</h3>

                {quote ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">{quote.child.name}</p>
                      <p className="text-xs text-blue-600">
                        {FUNDING_SCHEMES[quote.child.entitlement].name}
                        {quote.child.stretchedOption ? ' (Stretched)' : ' (Term-time)'}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Weekly hours booked</span>
                        <span className="font-medium">{quote.weeklyBooked} hrs</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Funded hours per week</span>
                        <span className="font-medium text-green-600">-{quote.fundedWeekly.toFixed(1)} hrs</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Chargeable hours per week</span>
                        <span className="font-medium">{quote.chargeableHours.toFixed(1)} hrs</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Weekly Charges</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Additional hours ({quote.chargeableHours.toFixed(1)} × £{providerSettings.hourlyRate.toFixed(2)})</span>
                          <span>£{quote.weeklyChargeableHours.toFixed(2)}</span>
                        </div>
                        {quotation.includeMeals && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Meals ({quotation.mealsPerWeek} × £{providerSettings.mealCharge.toFixed(2)})</span>
                            <span>£{quote.weeklyMeals.toFixed(2)}</span>
                          </div>
                        )}
                        {quotation.includeConsumables && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Consumables</span>
                            <span>£{quote.weeklyConsumables.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium pt-2 border-t border-gray-100">
                          <span>Weekly Total</span>
                          <span>£{quote.weeklyTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-900 text-white rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-400">Total for {quote.weeks} weeks</p>
                          <p className="text-2xl font-bold">£{quote.periodTotal.toFixed(2)}</p>
                        </div>
                        <PoundSterling size={32} className="text-gray-600" />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      This is an estimate. Actual charges may vary based on attendance.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Calculator size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Select a child to generate a fee quote</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Optimise Tab */}
        {activeTab === 'optimise' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Optimisation Recommendations</h2>
              <p className="text-sm text-gray-500 mt-1">
                Suggestions to help maximise funded hours and reduce parent costs
              </p>
            </div>

            {optimisations.length > 0 ? (
              <div className="space-y-4">
                {optimisations.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${
                      opt.type === 'warning' ? 'border-amber-500' :
                      opt.type === 'success' ? 'border-green-500' : 'border-blue-500'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${
                        opt.type === 'warning' ? 'bg-amber-100' :
                        opt.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {opt.type === 'warning' ? (
                          <AlertCircle className="text-amber-600" size={20} />
                        ) : opt.type === 'success' ? (
                          <CheckCircle className="text-green-600" size={20} />
                        ) : (
                          <TrendingUp className="text-blue-600" size={20} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{opt.title}</h3>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                            {opt.child}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{opt.message}</p>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                          <span className="font-medium">Recommendation:</span> {opt.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Looking Good!</h3>
                <p className="text-sm text-gray-500">
                  No optimisation suggestions at this time. All children are on track with their funded hours.
                </p>
              </div>
            )}

            {/* Stretching Comparison */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Term-Time vs Stretched Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Scheme</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Annual Hours</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Term-Time (38wks)</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Stretched ({providerSettings.operatingWeeks}wks)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(FUNDING_SCHEMES).map(([key, scheme]) => (
                      <tr key={key} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scheme.color }} />
                            <span className="font-medium">{scheme.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">{scheme.hoursPerYear} hrs</td>
                        <td className="text-center py-3 px-4">
                          {calculateFundedWeeklyHours(key, false, providerSettings.operatingWeeks).toFixed(1)} hrs/wk
                        </td>
                        <td className="text-center py-3 px-4">
                          {calculateFundedWeeklyHours(key, true, providerSettings.operatingWeeks).toFixed(1)} hrs/wk
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Stretching allows the same annual hours to be spread across more weeks, reducing weekly funded hours
                but providing consistent funding throughout the year including school holidays.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>UK Childcare Funded Hours Calculator - Prototype</p>
          <p className="text-xs mt-1">Calculations based on 2024/25 funding entitlements. Always verify with your local authority.</p>
        </div>
      </footer>
    </div>
  );
}
