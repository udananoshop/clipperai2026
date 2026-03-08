import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Check, 
  Zap, 
  Crown, 
  Rocket,
  Shield,
  ArrowRight,
  Download,
  Receipt,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const Billing = () => {
  const [currentPlan, setCurrentPlan] = useState('pro');
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: { monthly: 0, yearly: 0 },
      description: 'Perfect for getting started',
      icon: Zap,
      color: 'gray',
      features: [
        '5 videos per month',
        '720p export quality',
        'Basic analytics',
        'Community support',
        'Watermark included'
      ],
      notIncluded: [
        'AI predictions',
        'Team collaboration',
        'Priority processing',
        'Custom branding'
      ]
    },
    {
      id: 'starter',
      name: 'Starter',
      price: { monthly: 29, yearly: 290 },
      description: 'For individual creators',
      icon: Shield,
      color: 'blue',
      popular: false,
      features: [
        '25 videos per month',
        '1080p export quality',
        'Advanced analytics',
        'Email support',
        'AI predictions',
        'No watermark'
      ],
      notIncluded: [
        'Team collaboration',
        'Priority processing',
        'Custom branding'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: { monthly: 79, yearly: 790 },
      description: 'For growing businesses',
      icon: Crown,
      color: 'purple',
      popular: true,
      features: [
        '100 videos per month',
        '4K export quality',
        'Full analytics suite',
        'Priority support',
        'AI predictions',
        'Team collaboration (5 seats)',
        'Priority processing',
        'Custom branding',
        'API access'
      ],
      notIncluded: []
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: { monthly: 299, yearly: 2990 },
      description: 'For large organizations',
      icon: Rocket,
      color: 'orange',
      popular: false,
      features: [
        'Unlimited videos',
        '8K export quality',
        'Custom analytics',
        'Dedicated support',
        'AI predictions',
        'Unlimited team seats',
        'Priority processing',
        'Custom branding',
        'Full API access',
        'SLA guarantee',
        'Custom integrations'
      ],
      notIncluded: []
    }
  ];

  const paymentHistory = [
    { id: 1, date: '2024-02-15', amount: 79, status: 'paid', invoice: 'INV-2024-0215' },
    { id: 2, date: '2024-01-15', amount: 79, status: 'paid', invoice: 'INV-2024-0115' },
    { id: 3, date: '2023-12-15', amount: 79, status: 'paid', invoice: 'INV-2023-1215' },
    { id: 4, date: '2023-11-15', amount: 29, status: 'paid', invoice: 'INV-2023-1115' },
  ];

  const getStoredSettings = () => {
    try {
      const stored = localStorage.getItem('clipperai_settings');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  useEffect(() => {
    const settings = getStoredSettings();
    if (settings.subscription) {
      setCurrentPlan(settings.subscription.plan || 'pro');
      setBillingCycle(settings.subscription.cycle || 'monthly');
    }
  }, []);

  const handlePlanChange = (planId) => {
    setCurrentPlan(planId);
    const settings = getStoredSettings();
    localStorage.setItem('clipperai_settings', JSON.stringify({
      ...settings,
      subscription: { plan: planId, cycle: billingCycle }
    }));
  };

  const handleCycleChange = (cycle) => {
    setBillingCycle(cycle);
    const settings = getStoredSettings();
    localStorage.setItem('clipperai_settings', JSON.stringify({
      ...settings,
      subscription: { plan: currentPlan, cycle }
    }));
  };

  const handleDownloadInvoice = (invoice) => {
    const content = `
INVOICE
=======
Invoice #: ${invoice.invoice}
Date: ${invoice.date}
Amount: $${invoice.amount}.00
Status: Paid

ClipperAi2026 - AI Video Platform
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice}.txt`;
    a.click();
  };

  const getPlanColor = (color) => {
    switch(color) {
      case 'purple': return 'from-purple-500 to-pink-500';
      case 'blue': return 'from-blue-500 to-cyan-500';
      case 'orange': return 'from-orange-500 to-red-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">Billing</h1>
          <p className="text-gray-400 mt-2">Manage your subscription and payment methods</p>
        </motion.div>

        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center bg-gray-800/50 rounded-xl border border-gray-700/50 p-1">
            <button
              onClick={() => handleCycleChange('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => handleCycleChange('yearly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-800/30 to-gray-900/80 border ${
                  plan.popular ? 'border-purple-500/50' : 'border-white/10'
                } backdrop-blur-xl ${isCurrent ? 'ring-2 ring-purple-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 py-1 text-center text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                
                <div className={`p-6 ${plan.popular ? 'pt-8' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${getPlanColor(plan.color)}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {isCurrent && (
                      <div className="flex items-center gap-1 text-sm text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        Current
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">${billingCycle === 'yearly' ? Math.round(plan.price.yearly / 12) : plan.price.monthly}</span>
                    <span className="text-gray-400">/month</span>
                    {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                      <div className="text-sm text-gray-500 mt-1">${plan.price.yearly} billed yearly</div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePlanChange(plan.id)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      isCurrent 
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : plan.popular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-gray-700/50 text-white hover:bg-gray-600/50'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : 'Upgrade'}
                    {!isCurrent && <ArrowRight className="w-4 h-4" />}
                  </motion.button>
                </div>

                <div className="px-6 pb-6">
                  <div className="border-t border-gray-700/50 pt-4">
                    <p className="text-xs text-gray-500 mb-3">What's included:</p>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {plan.notIncluded.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-800/30 to-gray-900/80 border border-white/10 backdrop-blur-xl p-6">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-400" />
                Payment History
              </h3>
              <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <Download className="w-4 h-4" />
                Download All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Invoice</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <span className="text-white font-medium">{payment.invoice}</span>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 text-white font-medium">${payment.amount}.00</td>
                      <td className="py-4 px-4">
                        <span className="flex items-center gap-1 text-sm text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Paid
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => handleDownloadInvoice(payment)}
                          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Billing;
