import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import config from '../config';

interface ComparisonBrand {
  id: number;
  brand_name: string;
  boxes_per_annual: number;
  competitor_price_per_box: number;
  competitor_annual_rebate: number;
  competitor_semiannual_rebate: number;
  competitor_first_time_discount_percent: number;
  practice_price_per_box: number;
  practice_manufacturer_rebate_new: number;
  practice_manufacturer_rebate_existing: number;
}

interface Comparison {
  brand: {
    id: number;
    name: string;
    boxes_per_annual: number;
  };
  practice: {
    price_per_box: number;
    subtotal: number;
    practice_rebate: number;
    manufacturer_rebate: number;
    insurance_applied: number;
    in_office_today: number;
    final_amount_after_rebates: number;
  };
  competitor: {
    name: string;
    price_per_box: number;
    subtotal: number;
    annual_rebate: number;
    note: string;
    final_amount: number;
  };
  savings: {
    total_savings: number;
    percentage_savings: number;
  };
  wearer_status: string;
  current_quarter: string;
  insurance_benefit: number;
}

interface PriceComparisonProps {
  token: string;
  practice?: {
    name: string;
    email?: string;
  };
}

const PriceComparison: React.FC<PriceComparisonProps> = ({ token }) => {
  console.log('PriceComparison component initializing with token:', token ? 'present' : 'missing');
  
  const [brands, setBrands] = useState<ComparisonBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [insuranceBenefit, setInsuranceBenefit] = useState<number>(0);
  const [isNewWearer, setIsNewWearer] = useState<boolean>(true);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatePdfLoading, setGeneratePdfLoading] = useState(false);
  const comparisonRef = useRef<HTMLDivElement>(null);

  // Error boundary-like behavior
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('JavaScript error caught:', event.error);
      setHasError(true);
      setError(`JavaScript error: ${event.error?.message || 'Unknown error'}`);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      console.log('Fetching brands from:', `${config.apiUrl}/api/comparison-brands`);
      const response = await fetch(`${config.apiUrl}/api/comparison-brands`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Brands data received:', data);
        setBrands(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch brands:', response.status, errorText);
        setError('Failed to fetch brands for comparison');
      }
    } catch (err) {
      console.error('Network error fetching brands:', err);
      setError('Network error');
    }
  };

  const calculateComparison = async () => {
    if (!selectedBrandId) {
      setError('Please select a lens brand');
      return;
    }

    console.log('Starting comparison calculation...');
    console.log('Selected brand ID:', selectedBrandId);
    console.log('Insurance benefit:', insuranceBenefit);
    console.log('Is new wearer:', isNewWearer);

    setLoading(true);
    setError('');

    try {
      const requestBody = {
        global_brand_id: selectedBrandId,
        insurance_benefit: insuranceBenefit,
        is_new_wearer: isNewWearer
      };
      
      console.log('Request body:', requestBody);
      
      const response = await fetch(`${config.apiUrl}/api/calculate-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Comparison response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Comparison data received:', data);
        setComparison(data);
      } else {
        const errorText = await response.text();
        console.error('Calculation failed:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.error || 'Calculation failed');
        } catch {
          setError(`Calculation failed: ${response.status}`);
        }
      }
    } catch (err) {
      console.error('Network error during calculation:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const resetComparison = () => {
    setComparison(null);
    setSelectedBrandId(null);
    setInsuranceBenefit(0);
    setIsNewWearer(true);
    setError('');
  };

  const generatePDF = async () => {
    if (!comparisonRef.current || !comparison) return;

    setGeneratePdfLoading(true);
    try {
      // Create canvas from the comparison section
      const canvas = await html2canvas(comparisonRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: comparisonRef.current.scrollWidth,
        height: comparisonRef.current.scrollHeight,
      });

      // Calculate dimensions to fit on a single page
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate scale to fit the content on one page with margins
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      const scaleX = availableWidth / (imgWidth * 0.264583); // Convert px to mm
      const scaleY = availableHeight / (imgHeight * 0.264583);
      const scale = Math.min(scaleX, scaleY);
      
      const finalWidth = (imgWidth * 0.264583) * scale;
      const finalHeight = (imgHeight * 0.264583) * scale;
      
      // Center the content
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      
      // Generate filename with brand name and date
      const brandName = comparison.brand.name.replace(/[^a-zA-Z0-9]/g, '_');
      const date = new Date().toISOString().split('T')[0];
      const filename = `Contact_Lens_Comparison_${brandName}_${date}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratePdfLoading(false);
    }
  };

  console.log('PriceComparison render - brands:', brands);
  console.log('PriceComparison render - comparison:', comparison);
  console.log('PriceComparison render - error:', error);

  if (hasError) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error in Price Comparison</h2>
        <p className="text-red-600">An error occurred: {error}</p>
        <button 
          onClick={() => {setHasError(false); setError(''); window.location.reload();}} 
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Price Comparison Tool</h2>
        <p className="text-gray-600">No brands available for comparison.</p>
        {error && <p className="text-red-600 mt-2">Error: {error}</p>}
      </div>
    );
  }

  try {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">💰 Price Comparison Tool</h2>
          <p className="text-gray-600">Compare your practice pricing with 1-800 CONTACTS</p>
          <p className="text-sm text-gray-500 mt-2">Debug: Component rendering successfully</p>
        </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {!comparison ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 shadow-xl rounded-xl p-8 border border-blue-200">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">🔍 Create New Comparison</h3>
            <p className="text-gray-600">Set up your comparison parameters below</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🏷️ Select Lens Brand
              </label>
              <select
                value={selectedBrandId || ''}
                onChange={(e) => setSelectedBrandId(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Choose a brand...</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.brand_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                👤 Wearer Status
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="wearerStatus"
                    checked={isNewWearer}
                    onChange={() => setIsNewWearer(true)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="font-medium">✨ New Wearer</span>
                </label>
                <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="wearerStatus"
                    checked={!isNewWearer}
                    onChange={() => setIsNewWearer(false)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="font-medium">🔄 Existing Wearer</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🏥 Insurance Benefit ($)
              </label>
              <input
                type="number"
                value={insuranceBenefit}
                onChange={(e) => setInsuranceBenefit(Number(e.target.value))}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={calculateComparison}
              disabled={loading || !selectedBrandId}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
            >
              {loading ? '⏳ Calculating...' : '📊 Generate Comparison'}
            </button>
          </div>
        </div>
      ) : (
        <div ref={comparisonRef} className="space-y-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl rounded-xl p-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-center md:text-left mb-4 md:mb-0">
                <h3 className="text-2xl font-bold mb-2">
                  🏷️ {comparison.brand.name}
                </h3>
                <p className="text-indigo-100 text-lg">
                  {comparison.wearer_status === 'new' ? '✨ New' : '🔄 Existing'} wearer • {comparison.current_quarter.toUpperCase()} pricing
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={generatePDF}
                  disabled={generatePdfLoading}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium backdrop-blur-sm transition-all duration-200 disabled:opacity-50"
                >
                  {generatePdfLoading ? '⏳ Generating...' : '📄 Generate PDF'}
                </button>
                <button
                  onClick={resetComparison}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium backdrop-blur-sm transition-all duration-200"
                >
                  🔄 New Comparison
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 shadow-xl rounded-xl p-8 border-2 border-blue-200">
              <div className="text-center mb-6">
                <h4 className="text-2xl font-bold text-blue-900 mb-2">🏢 Your Practice</h4>
                <p className="text-blue-700">Private practice benefits</p>
              </div>
              <div className="space-y-4">
                {/* Price per box */}
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-gray-700">💰 Price per box:</span>
                  <span className="font-bold text-gray-900">${comparison.practice.price_per_box.toFixed(2)}</span>
                </div>
                
                {/* Annual subtotal */}
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-gray-700">📅 Annual subtotal:</span>
                  <span className="font-bold text-gray-900">${comparison.practice.subtotal.toFixed(2)}</span>
                </div>
                
                {/* Insurance benefit */}
                <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg shadow-sm border-l-4 border-green-400">
                  <span className="text-green-700">🏥 Insurance benefit:</span>
                  <span className="font-bold text-green-600">
                    {comparison.practice.insurance_applied > 0 ? `-$${comparison.practice.insurance_applied.toFixed(2)}` : '$0.00'}
                  </span>
                </div>
                
                <div className="border-t-2 border-blue-200 pt-4">
                  <div className="flex justify-between items-center p-4 bg-blue-100 rounded-lg shadow-sm">
                    <span className="font-bold text-blue-900">💳 In Office Today:</span>
                    <span className="text-xl font-bold text-blue-900">${comparison.practice.in_office_today.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Manufacturer rebate (after today total) */}
                {comparison.practice.manufacturer_rebate > 0 && (
                  <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg shadow-sm border-l-4 border-green-400">
                    <span className="text-green-700">🎁 Manufacturer rebate (later):</span>
                    <span className="font-bold text-green-600">-${comparison.practice.manufacturer_rebate.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t-2 border-blue-300 pt-4">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg text-white">
                    <span className="font-bold">🏆 Your Final Total:</span>
                    <span className="text-xl font-bold">${comparison.practice.final_amount_after_rebates.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-orange-50 shadow-xl rounded-xl p-8 border-2 border-red-200">
              <div className="text-center mb-6">
                <h4 className="text-2xl font-bold text-red-900 mb-2">📞 {comparison.competitor.name}</h4>
                <p className="text-red-700">Online retailer</p>
              </div>
              <div className="space-y-4">
                {/* Price per box */}
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-gray-700">💰 Price per box:</span>
                  <span className="font-bold text-gray-900">${comparison.competitor.price_per_box.toFixed(2)}</span>
                </div>
                
                {/* Annual subtotal */}
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-gray-700">📅 Annual subtotal:</span>
                  <span className="font-bold text-gray-900">${comparison.competitor.subtotal.toFixed(2)}</span>
                </div>
                
                {/* Insurance benefit */}
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg shadow-sm">
                  <span className="text-gray-500">🏥 Insurance benefit:</span>
                  <span className="font-bold text-gray-500">$0.00</span>
                </div>
                
                <div className="border-t-2 border-red-200 pt-4">
                  <div className="flex justify-between items-center p-4 bg-red-100 rounded-lg shadow-sm">
                    <span className="font-bold text-red-900">💳 You Pay Today:</span>
                    <span className="text-xl font-bold text-red-900">${comparison.competitor.subtotal.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* 1-800 Contacts annual rebate (after today total) */}
                {comparison.competitor.annual_rebate > 0 && (
                  <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg shadow-sm border-l-4 border-orange-400">
                    <span className="text-orange-700">💰 1-800 CONTACTS rebate (later):</span>
                    <span className="font-bold text-orange-600">-${comparison.competitor.annual_rebate.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t-2 border-red-300 pt-4">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-lg text-white">
                    <span className="font-bold">💳 Their Final Total:</span>
                    <span className="text-xl font-bold">${comparison.competitor.final_amount.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="text-center text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  ⚠️ Out of network - no insurance benefits apply
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-400 to-emerald-500 shadow-xl rounded-xl p-8 text-white">
            <div className="text-center">
              <h4 className="text-2xl font-bold mb-4">
                🎉 Your Annual Savings
              </h4>
              <div className="bg-white/20 rounded-lg p-6 backdrop-blur-sm">
                <div className="text-5xl font-bold mb-2">
                  ${comparison.savings.total_savings.toFixed(2)}
                </div>
                <div className="text-xl font-medium">
                  ({comparison.savings.percentage_savings.toFixed(1)}% savings)
                </div>
                <div className="text-green-100 mt-4">
                  💡 This shows how much patients save by choosing your practice!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  } catch (renderError) {
    console.error('Render error in PriceComparison:', renderError);
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Render Error</h2>
        <p className="text-red-600">Failed to render component: {String(renderError)}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Reload Page
        </button>
      </div>
    );
  }
};

export default PriceComparison;