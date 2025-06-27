import React, { useState, useEffect } from 'react';
import config from '../config';

interface AvailableBrand {
  id: number;
  brand_name: string;
  boxes_per_annual: number;
  competitor_annual_rebate: number;
  competitor_semiannual_rebate: number;
  competitor_first_time_discount_percent: number;
  practice_price_per_box?: number;
  practice_manufacturer_rebate_new?: number;
  practice_manufacturer_rebate_existing?: number;
  practice_active?: boolean;
}

interface PracticePricingProps {
  token: string;
}

const PracticePricing: React.FC<PracticePricingProps> = ({ token }) => {
  const [brands, setBrands] = useState<AvailableBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableBrands();
  }, []);

  const fetchAvailableBrands = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/api/available-brands`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      } else {
        setError('Failed to fetch available brands');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const updatePracticeData = async (globalBrandId: number, data: {
    practice_price_per_box?: number;
    practice_manufacturer_rebate_new?: number;
    practice_manufacturer_rebate_existing?: number;
  }) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/practice-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          global_brand_id: globalBrandId,
          ...data
        })
      });

      if (response.ok) {
        fetchAvailableBrands(); // Refresh the list
      } else {
        setError('Failed to update practice data');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleFieldChange = (brandId: number, field: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      updatePracticeData(brandId, { [field]: numValue });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-3">
              Practice Pricing & Rebate Setup
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Configure your practice's pricing and exclusive manufacturer rebate amounts for each lens brand.
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <div className="bg-white rounded-full p-2">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-white">Your Competitive Advantage</h3>
            </div>
            <p className="text-white text-center font-medium">
              Manufacturer rebates are <strong>EXCLUSIVE to private practices</strong> — 
              not available through 1-800-CONTACTS or other online retailers!
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg shadow-md">
            <div className="flex items-center">
              <span className="text-red-400 text-xl mr-2">⚠️</span>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <span className="ml-3 text-lg text-gray-600">Loading your brands...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header Row */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
              <div className="grid grid-cols-4 gap-6 text-sm font-semibold text-white">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👁️</span>
                  <span>Contact Lens Brand</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💰</span>
                  <span>Your Price per Box</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🆕</span>
                  <span>New Wearer Rebate</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔄</span>
                  <span>Existing Wearer Rebate</span>
                </div>
              </div>
            </div>
          
            {/* Data Rows */}
            <div className="divide-y divide-gray-100">
              {brands.map((brand, index) => (
                <div key={brand.id} className={`px-8 py-6 transition-all duration-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="grid grid-cols-4 gap-6 items-start">
                    {/* Column 1: Brand Name */}
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">{brand.brand_name}</h3>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center text-sm text-blue-700">
                          <span className="font-semibold mr-2">📦 Boxes/Year:</span> 
                          <span className="bg-blue-100 px-2 py-1 rounded-full font-medium">{brand.boxes_per_annual}</span>
                        </div>
                        <div className="text-xs text-blue-600 space-y-1">
                          <div><span className="font-medium">1-800 Annual:</span> ${brand.competitor_annual_rebate}</div>
                          <div><span className="font-medium">1-800 Semi-Annual:</span> ${brand.competitor_semiannual_rebate}</div>
                        </div>
                      </div>
                    </div>
                  
                    {/* Column 2: Practice Price */}
                    <div className="flex flex-col space-y-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          defaultValue={brand.practice_price_per_box || ''}
                          onBlur={(e) => handleFieldChange(brand.id, 'practice_price_per_box', e.target.value)}
                          className="w-full pl-7 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold transition-all duration-200"
                        />
                      </div>
                      {brand.practice_price_per_box && (
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <div className="text-sm text-green-700 font-medium">
                            💰 Annual Revenue
                          </div>
                          <div className="text-lg font-bold text-green-800">
                            ${(brand.practice_price_per_box * brand.boxes_per_annual).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  
                    {/* Column 3: New Wearer Rebate */}
                    <div className="flex flex-col space-y-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-medium">$</span>
                        <input
                          type="number"
                          step="1.00"
                          min="0"
                          placeholder="0.00"
                          defaultValue={brand.practice_manufacturer_rebate_new || ''}
                          onBlur={(e) => handleFieldChange(brand.id, 'practice_manufacturer_rebate_new', e.target.value)}
                          className="w-full pl-7 pr-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold transition-all duration-200"
                        />
                      </div>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-2 text-center">
                        <div className="text-xs text-green-700 font-bold flex items-center justify-center space-x-1">
                          <span>🔒</span>
                          <span>EXCLUSIVE</span>
                        </div>
                        <div className="text-xs text-green-600">Private practice only</div>
                      </div>
                    </div>
                  
                    {/* Column 4: Existing Wearer Rebate */}
                    <div className="flex flex-col space-y-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-medium">$</span>
                        <input
                          type="number"
                          step="1.00"
                          min="0"
                          placeholder="0.00"
                          defaultValue={brand.practice_manufacturer_rebate_existing || ''}
                          onBlur={(e) => handleFieldChange(brand.id, 'practice_manufacturer_rebate_existing', e.target.value)}
                          className="w-full pl-7 pr-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold transition-all duration-200"
                        />
                      </div>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-2 text-center">
                        <div className="text-xs text-green-700 font-bold flex items-center justify-center space-x-1">
                          <span>🔒</span>
                          <span>EXCLUSIVE</span>
                        </div>
                        <div className="text-xs text-green-600">Private practice only</div>
                      </div>
                    </div>
                  </div>
                
                  {/* Summary row if pricing is set */}
                  {brand.practice_price_per_box && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-sm font-semibold text-blue-700 mb-1">📈 Your Annual Revenue</div>
                          <div className="text-2xl font-bold text-blue-800">
                            ${(brand.practice_price_per_box * brand.boxes_per_annual).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-red-700 mb-1">🌐 1-800 Annual Rebate</div>
                          <div className="text-2xl font-bold text-red-800">
                            ${brand.competitor_annual_rebate}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
            
            {brands.length === 0 && (
              <div className="text-center py-16">
                <div className="mb-4">
                  <span className="text-6xl">📭</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Brands Available</h3>
                <p className="text-gray-500">Contact your administrator to add global brands to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticePricing;