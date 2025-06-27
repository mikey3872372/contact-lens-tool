import React, { useState, useEffect } from 'react';
import config from '../config';

interface PracticeSettingsData {
  new_wearer_rebate_q1: number;
  new_wearer_rebate_q2: number;
  new_wearer_rebate_q3: number;
  new_wearer_rebate_q4: number;
  existing_wearer_rebate_q1: number;
  existing_wearer_rebate_q2: number;
  existing_wearer_rebate_q3: number;
  existing_wearer_rebate_q4: number;
}

interface PracticeSettingsProps {
  token: string;
}

const PracticeSettings: React.FC<PracticeSettingsProps> = ({ token }) => {
  const [settings, setSettings] = useState<PracticeSettingsData>({
    new_wearer_rebate_q1: 0,
    new_wearer_rebate_q2: 0,
    new_wearer_rebate_q3: 0,
    new_wearer_rebate_q4: 0,
    existing_wearer_rebate_q1: 0,
    existing_wearer_rebate_q2: 0,
    existing_wearer_rebate_q3: 0,
    existing_wearer_rebate_q4: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/api/practice-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        setError('Failed to fetch practice settings');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${config.apiUrl}/api/practice-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSuccess('Practice settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update settings');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: parseFloat(value) || 0
    });
  };

  const getCurrentQuarter = () => {
    const month = new Date().getMonth() + 1;
    if (month <= 3) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
  };

  const currentQuarter = getCurrentQuarter();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Practice Settings</h2>
        <p className="text-gray-600">
          Set your practice's rebate amounts for each quarter. These are YOUR PRACTICE'S internal rebates, in addition to manufacturer rebates.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Practice rebates shown here are separate from manufacturer rebates (Alcon, J&J, B+L, CooperVision) which are EXCLUSIVE to private practices and not available through 1-800-CONTACTS.
          </p>
        </div>
        <div className="mt-2 p-3 bg-blue-50 rounded-md">
          <p className="text-blue-800 font-medium">Current Quarter: {currentQuarter}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* New Wearer Rebates */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Practice Rebates - New Wearer</h3>
          <p className="text-sm text-gray-600 mb-4">Your practice's internal rebates (separate from manufacturer rebates)</p>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Q1 (Jan-Mar) {currentQuarter === 'Q1' && '(Current)'}
              </label>
              <input
                type="number"
                name="new_wearer_rebate_q1"
                value={settings.new_wearer_rebate_q1}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  currentQuarter === 'Q1' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Q2 (Apr-Jun) {currentQuarter === 'Q2' && '(Current)'}
              </label>
              <input
                type="number"
                name="new_wearer_rebate_q2"
                value={settings.new_wearer_rebate_q2}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  currentQuarter === 'Q2' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Q3 (Jul-Sep) {currentQuarter === 'Q3' && '(Current)'}
              </label>
              <input
                type="number"
                name="new_wearer_rebate_q3"
                value={settings.new_wearer_rebate_q3}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  currentQuarter === 'Q3' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Q4 (Oct-Dec) {currentQuarter === 'Q4' && '(Current)'}
              </label>
              <input
                type="number"
                name="new_wearer_rebate_q4"
                value={settings.new_wearer_rebate_q4}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  currentQuarter === 'Q4' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Existing Wearer Rebates */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Practice Rebates - Existing Wearer</h3>
          <p className="text-sm text-gray-600 mb-4">Your practice's internal rebates (separate from manufacturer rebates)</p>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Q1 (Jan-Mar) {currentQuarter === 'Q1' && '(Current)'}
              </label>
              <input
                type="number"
                name="existing_wearer_rebate_q1"
                value={settings.existing_wearer_rebate_q1}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  currentQuarter === 'Q1' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Q2 (Apr-Jun) {currentQuarter === 'Q2' && '(Current)'}
              </label>
              <input
                type="number"
                name="existing_wearer_rebate_q2"
                value={settings.existing_wearer_rebate_q2}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  currentQuarter === 'Q2' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Q3 (Jul-Sep) {currentQuarter === 'Q3' && '(Current)'}
              </label>
              <input
                type="number"
                name="existing_wearer_rebate_q3"
                value={settings.existing_wearer_rebate_q3}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  currentQuarter === 'Q3' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Q4 (Oct-Dec) {currentQuarter === 'Q4' && '(Current)'}
              </label>
              <input
                type="number"
                name="existing_wearer_rebate_q4"
                value={settings.existing_wearer_rebate_q4}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  currentQuarter === 'Q4' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PracticeSettings;