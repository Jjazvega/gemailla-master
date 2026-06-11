import { useQuery } from '@tanstack/react-query';
import { buildCompanyEntityQuery } from '@/lib/companyEntityQueries';

const getCompanyId = (companyOrId) => (
  typeof companyOrId === 'string' ? companyOrId : companyOrId?.id
);

const getQueryData = (query) => query.data || [];

export function useCompanyData(companyOrId, options = {}) {
  const companyId = getCompanyId(companyOrId);
  const enabled = !!companyId && (options.enabled ?? true);

  const sharedOptions = {
    enabled,
    staleTime: options.staleTime,
    gcTime: options.gcTime,
    query: options.query,
  };

  const transactionsQuery = useQuery(buildCompanyEntityQuery('transactions', companyId, sharedOptions));
  const documentsQuery = useQuery(buildCompanyEntityQuery('documents', companyId, sharedOptions));
  const kpisQuery = useQuery(buildCompanyEntityQuery('kpis', companyId, sharedOptions));
  const queries = [transactionsQuery, documentsQuery, kpisQuery];

  return {
    transactions: getQueryData(transactionsQuery),
    documents: getQueryData(documentsQuery),
    kpis: getQueryData(kpisQuery),
    isLoading: queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
    isError: queries.some((query) => query.isError),
    error: transactionsQuery.error || documentsQuery.error || kpisQuery.error,
    queries: {
      transactions: transactionsQuery,
      documents: documentsQuery,
      kpis: kpisQuery,
    },
  };
}

export default useCompanyData;
