import React, { useState } from 'react';
import LensBrandManager from '../components/LensBrandManager';

interface DashboardProps {
  practice: any;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ practice, onLogout }) => {
  const [activeTab, setActiveTab] = useState('brands');
  const token = localStorage.getItem('token') || '';

  const tabs = [
    { id: 'brands', name: 'Lens Brands', icon: '👓' },
    { id: 'comparison', name: 'Price Comparison', icon: '💰' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

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
          {activeTab === 'brands' && (
            <LensBrandManager token={token} />
          )}
          
          {activeTab === 'comparison' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Price Comparison Tool</h2>
              <div className="border-4 border-dashed border-gray-200 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600">
                    Price comparison interface coming in Day 3!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Practice Settings</h2>
              <div className="border-4 border-dashed border-gray-200 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600">
                    Practice settings coming soon!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;