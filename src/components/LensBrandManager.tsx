import React, { useState, useEffect } from 'react';

interface LensBrand {
  id?: number;
  brand_name: string;
  replacement_schedule: string;
  practice_price_per_box: number;
  competitor_price_per_box: number;
  new_wearer_rebate: number;
  existing_wearer_rebate: number;
  boxes_per_annual: number;
}

interface LensBrandManagerProps {
  token: string;
}

const LensBrandManager: React.FC<LensBrandManagerProps> = ({ token }) => {
  const [brands, setBrands] = useState<LensBrand[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<LensBrand | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<LensBrand>({
    brand_name: '',
    replacement_schedule: 'daily',
    practice_price_per_box: 0,
    competitor_price_per_box: 0,
    new_wearer_rebate: 0,
    existing_wearer_rebate: 0,
    boxes_per_annual: 12
  });

  const replacementSchedules = [
    { value: 'daily', label: 'Daily', boxes: 12 },
    { value: 'weekly', label: 'Weekly', boxes: 9 },
    { value: 'biweekly', label: 'Bi-weekly', boxes: 4 },
    { value: 'monthly', label: 'Monthly', boxes: 4 }
  ];

  const fetchBrands = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/lens-brands', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      } else {
        setError('Failed to fetch lens brands');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingBrand 
        ? `http://localhost:3001/api/lens-brands/${editingBrand.id}`
        : 'http://localhost:3001/api/lens-brands';
      
      const method = editingBrand ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchBrands();
        resetForm();
      } else {
        const data = await response.json();
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (brand: LensBrand) => {
    setEditingBrand(brand);
    setFormData({ ...brand });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this lens brand?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/lens-brands/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchBrands();
      } else {
        setError('Failed to delete lens brand');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const resetForm = () => {
    setFormData({
      brand_name: '',
      replacement_schedule: 'daily',
      practice_price_per_box: 0,
      competitor_price_per_box: 0,
      new_wearer_rebate: 0,
      existing_wearer_rebate: 0,
      boxes_per_annual: 12
    });
    setEditingBrand(null);
    setShowForm(false);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: value };

    // Auto-update boxes per annual when replacement schedule changes
    if (name === 'replacement_schedule') {
      const schedule = replacementSchedules.find(s => s.value === value);
      if (schedule) {
        updatedData.boxes_per_annual = schedule.boxes;
      }
    }

    setFormData(updatedData);
  };

  const calculateAnnualSavings = (brand: LensBrand) => {
    const practiceTotal = brand.practice_price_per_box * brand.boxes_per_annual;
    const competitorTotal = brand.competitor_price_per_box * brand.boxes_per_annual;
    return competitorTotal - practiceTotal;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Lens Brand Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md"
        >
          Add New Brand
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingBrand ? 'Edit Lens Brand' : 'Add New Lens Brand'}
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Acuvue Oasys"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Replacement Schedule</label>
                <select
                  name="replacement_schedule"
                  value={formData.replacement_schedule}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {replacementSchedules.map(schedule => (
                    <option key={schedule.value} value={schedule.value}>
                      {schedule.label} ({schedule.boxes} boxes/year)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Practice Price/Box</label>
                  <input
                    type="number"
                    name="practice_price_per_box"
                    value={formData.practice_price_per_box}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">1-800 Contacts Price/Box</label>
                  <input
                    type="number"
                    name="competitor_price_per_box"
                    value={formData.competitor_price_per_box}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Wearer Rebate</label>
                  <input
                    type="number"
                    name="new_wearer_rebate"
                    value={formData.new_wearer_rebate}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Existing Wearer Rebate</label>
                  <input
                    type="number"
                    name="existing_wearer_rebate"
                    value={formData.existing_wearer_rebate}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
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
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingBrand ? 'Update' : 'Add')}
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
                          className="text-primary-600 hover:text-primary-900 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(brand.id!)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Schedule:</span> {brand.replacement_schedule}
                      </div>
                      <div>
                        <span className="font-medium">Practice:</span> ${brand.practice_price_per_box}/box
                      </div>
                      <div>
                        <span className="font-medium">1-800 Contacts:</span> ${brand.competitor_price_per_box}/box
                      </div>
                      <div>
                        <span className="font-medium">Annual Savings:</span> 
                        <span className="text-green-600 font-semibold">
                          ${calculateAnnualSavings(brand).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">New Wearer Rebate:</span> ${brand.new_wearer_rebate}
                      </div>
                      <div>
                        <span className="font-medium">Existing Wearer Rebate:</span> ${brand.existing_wearer_rebate}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {brands.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No lens brands added yet. Click "Add New Brand" to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LensBrandManager;