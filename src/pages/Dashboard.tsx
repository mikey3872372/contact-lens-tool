import React, { useState, useEffect } from 'react';
import MasterAdminPanel from '../components/MasterAdminPanel';
import PracticePricing from '../components/PracticePricing';
import PracticeSettings from '../components/PracticeSettings';
import PriceComparison from '../components/PriceComparison';

interface DashboardProps {
  practice: any;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ practice, onLogout }) => {
  const [activeTab, setActiveTab] = useState('brands');
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    // Check if user is master admin based on email
    const isAdmin = practice?.email === 'admin@contactlenstool.com';
    setIsMasterAdmin(isAdmin);
    
    // Set default tab based on user type
    if (isAdmin) {
      setActiveTab('admin');
    } else {
      setActiveTab('brands');
    }
  }, [practice]);

  const masterAdminTabs = [
    { id: 'admin', name: 'Global Brand Management', icon: '🔥' },
    { id: 'comparison', name: 'Price Comparison', icon: '💰' }
  ];

  const practiceTabs = [
    { id: 'brands', name: 'Your Pricing', icon: '💲' },
    { id: 'comparison', name: 'Price Comparison', icon: '💰' },
    { id: 'settings', name: 'Practice Settings', icon: '⚙️' }
  ];

  const tabs = isMasterAdmin ? masterAdminTabs : practiceTabs;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Contact Lens Cost Comparison Tool
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {practice.name}</span>
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {/* Master Admin Views */}
          {isMasterAdmin && activeTab === 'admin' && (
            <MasterAdminPanel token={token} />
          )}
          
          {/* Practice Views */}
          {!isMasterAdmin && activeTab === 'brands' && (
            <PracticePricing token={token} />
          )}
          
          {!isMasterAdmin && activeTab === 'settings' && (
            <PracticeSettings token={token} />
          )}
          
          {/* Shared Views */}
          {activeTab === 'comparison' && (
            <PriceComparison token={token} practice={practice} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;