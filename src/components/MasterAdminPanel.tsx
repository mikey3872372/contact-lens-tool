import React, { useState, useEffect } from 'react';
import config from '../config';

interface GlobalBrand {
  id?: number;
  brand_name: string;
  boxes_per_annual: number;
  competitor_price_per_box: number;
  competitor_annual_rebate: number;
  competitor_semiannual_rebate: number;
  competitor_first_time_discount_percent: number;
  is_active: boolean;
}

interface MasterAdminPanelProps {
  token: string;
}

const MasterAdminPanel: React.FC<MasterAdminPanelProps> = ({ token }) => {
  const [brands, setBrands] = useState<GlobalBrand[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<GlobalBrand | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<GlobalBrand>({
    brand_name: '',
    boxes_per_annual: 12,
    competitor_price_per_box: 0,
    competitor_annual_rebate: 0,
    competitor_semiannual_rebate: 0,
    competitor_first_time_discount_percent: 0,
    is_active: true
  });

  useEffect(() => {
    fetchGlobalBrands();
  }, []);

  const fetchGlobalBrands = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/api/admin/global-brands`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      } else {
        setError('Failed to fetch global brands');
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

    try {
      const response = await fetch(`${config.apiUrl}/api/admin/global-brands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingBrand ? { ...formData, id: editingBrand.id } : formData)
      });

      if (response.ok) {
        await fetchGlobalBrands();
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save brand');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (brand: GlobalBrand) => {
    setEditingBrand(brand);
    setFormData(brand);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      brand_name: '',
      boxes_per_annual: 12,
      competitor_price_per_box: 0,
      competitor_annual_rebate: 0,
      competitor_semiannual_rebate: 0,
      competitor_first_time_discount_percent: 0,
      is_active: true
    });
    setEditingBrand(null);
    setShowForm(false);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['boxes_per_annual', 'competitor_price_per_box', 'competitor_annual_rebate', 'competitor_semiannual_rebate', 'competitor_first_time_discount_percent'];
    setFormData({ 
      ...formData, 
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value 
    });
  };

  return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h2 className="text-2xl font-bold text-red-900 mb-2">🔥 Master Admin Panel</h2>
        <p className="text-red-700">
          You are managing GLOBAL brand data that affects ALL practices using this system.
        </p>
        <p className="text-red-600 text-sm mt-2">
          <strong>Note:</strong> You manage global brand data and 1-800-CONTACTS offers. Individual practices will set their own manufacturer rebate amounts.
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Global Lens Brand Management</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Add/Update Global Brand
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingBrand ? 'Update Global Brand' : 'Add New Global Brand'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Brand Name</label>
                <input
                  type="text"
                  name="brand_name"
                  value={formData.brand_name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., Acuvue Oasys"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Boxes per Year</label>
                <input
                  type="number"
                  name="boxes_per_annual"
                  value={formData.boxes_per_annual}
                  onChange={handleInputChange}
                  min="1"
                  max="24"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., 12 for daily lenses"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">1-800 CONTACTS Price per Box</label>
                <input
                  type="number"
                  name="competitor_price_per_box"
                  value={formData.competitor_price_per_box}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Price per box at 1-800 CONTACTS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">1-800 CONTACTS Annual Rebate</label>
                <input
                  type="number"
                  name="competitor_annual_rebate"
                  value={formData.competitor_annual_rebate}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Annual rebate amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">1-800 CONTACTS Semi-Annual Rebate</label>
                <input
                  type="number"
                  name="competitor_semiannual_rebate"
                  value={formData.competitor_semiannual_rebate}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Semi-annual rebate amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">1-800 CONTACTS First-Time Customer Discount (%)</label>
                <input
                  type="number"
                  name="competitor_first_time_discount_percent"
                  value={formData.competitor_first_time_discount_percent}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="100"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Percentage discount for first-time customers"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingBrand ? 'Update Global Brand' : 'Add Global Brand')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && !showForm ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {brands.map((brand) => (
              <li key={brand.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">{brand.brand_name}</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(brand)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Edit Global Data
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-6 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Boxes/Year:</span> {brand.boxes_per_annual}
                      </div>
                      <div>
                        <span className="font-medium">Price/Box:</span> ${brand.competitor_price_per_box}
                      </div>
                      <div>
                        <span className="font-medium">Annual Rebate:</span> ${brand.competitor_annual_rebate}
                      </div>
                      <div>
                        <span className="font-medium">Semi-Annual Rebate:</span> ${brand.competitor_semiannual_rebate}
                      </div>
                      <div>
                        <span className="font-medium">First-Time Discount:</span> {brand.competitor_first_time_discount_percent}%
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> 
                        <span className={brand.is_active ? "text-green-600" : "text-red-600"}>
                          {brand.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                      <span className="font-medium">Note:</span> Individual practices set their own manufacturer rebate amounts for this brand.
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {brands.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No global brands added yet. Click "Add Global Brand" to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MasterAdminPanel;