export const vendorApi = {
  async approve(id: string): Promise<{ success: boolean }> {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    
    try {
      const response = await fetch(`${apiUrl}/api/vendors/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      return { success: response.ok };
    } catch (error) {
      return { success: false };
    }
  },

  async reject(id: string, reason: string): Promise<{ success: boolean }> {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    
    try {
      const response = await fetch(`${apiUrl}/api/vendors/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ reason }),
      });
      
      return { success: response.ok };
    } catch (error) {
      return { success: false };
    }
  },

  async requestDocuments(id: string, documents: string[]): Promise<{ success: boolean }> {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    
    try {
      const response = await fetch(`${apiUrl}/api/vendors/${id}/request-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ documents }),
      });
      
      return { success: response.ok };
    } catch (error) {
      return { success: false };
    }
  },
  
  async update(data: { 
    id: string; 
    status?: string;
    commissionRate?: number;
    [key: string]: any;
  }): Promise<{ success: boolean }> {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    
    try {
      const response = await fetch(`${apiUrl}/api/vendors/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(data),
      });
      
      return { success: response.ok };
    } catch (error) {
      return { success: false };
    }
  },
  
  async delete(id: string): Promise<{ success: boolean }> {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    
    try {
      const response = await fetch(`${apiUrl}/api/vendors/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      return { success: response.ok };
    } catch (error) {
      return { success: false };
    }
  }
};