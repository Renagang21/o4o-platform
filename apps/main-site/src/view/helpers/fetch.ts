import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FetchConfig } from '../types';

export function useFetch(fetchConfig: FetchConfig) {
  const { queryKey, url, method = 'GET', params, body } = fetchConfig;

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await axios({
        method,
        url,
        params,
        data: body,
      });
      return response.data;
    },
  });
}
