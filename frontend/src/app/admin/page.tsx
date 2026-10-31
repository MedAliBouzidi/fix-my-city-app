'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RouteGuard } from '../../components/RouteGuard';
import { incidentsApi, usersApi, ApiError } from '../../lib/api';
import {
  Incident,
  IncidentCategory,
  IncidentListItem,
  IncidentStatus,
} from '../../types/incident';
import { UserSummary } from '../../types/user';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ROUTES,
  STATUS_LABELS,
  STATUSES,
} from '../../lib/constants';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { IncidentTimeline } from '../../components/IncidentTimeline';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  AlertOctagon,
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  HardHat,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import Image from 'next/image';

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Read filter params from URL searchParams
  const paramStatus = searchParams.get('status') as IncidentStatus | null;
  const paramCategory = searchParams.get('category') as IncidentCategory | null;
  const paramStreet = searchParams.get('streetAddress') || '';
  const paramPage = parseInt(searchParams.get('page') || '1', 10);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>(paramStatus || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(
    paramCategory || '',
  );
  const [streetSearch, setStreetSearch] = useState<string>(paramStreet);
  const [page, setPage] = useState<number>(isNaN(paramPage) ? 1 : paramPage);

  // Incidents Data State
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dispatch Modals State
  const [assignAgentIncident, setAssignAgentIncident] =
    useState<IncidentListItem | null>(null);
  const [assignTechIncident, setAssignTechIncident] =
    useState<IncidentListItem | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffList, setStaffList] = useState<UserSummary[]>([]);
  const [staffLoading, setStaffLoading] = useState<boolean>(false);
  const [submittingDispatch, setSubmittingDispatch] = useState<boolean>(false);

  // Detailed view modal state
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Synchronize state with URL parameters
  const updateQueryParams = useCallback(
    (newParams: {
      status?: string;
      category?: string;
      streetAddress?: string;
      page?: number;
    }) => {
      const q = new URLSearchParams();
      const s = newParams.status ?? statusFilter;
      const c = newParams.category ?? categoryFilter;
      const st = newParams.streetAddress ?? streetSearch;
      const p = newParams.page ?? page;

      if (s) q.set('status', s);
      if (c) q.set('category', c);
      if (st) q.set('streetAddress', st);
      if (p > 1) q.set('page', p.toString());

      router.push(`/admin${q.toString() ? `?${q.toString()}` : ''}`);
    },
    [statusFilter, categoryFilter, streetSearch, page, router],
  );

  // Fetch incident list with current filters
  const fetchIncidents = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await incidentsApi.list({
          status: (statusFilter as IncidentStatus) || undefined,
          category: (categoryFilter as IncidentCategory) || undefined,
          streetAddress: streetSearch.trim() || undefined,
          page,
          limit,
        });

        setIncidents(res.data);
        setTotal(res.total);
      } catch (err: unknown) {
        setError('Failed to load municipal incidents list.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, categoryFilter, streetSearch, page, limit],
  );

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Compute street frequency to detect high density streets (>10 incidents on same street)
  const highDensityStreets = useMemo(() => {
    const streetCounts: Record<string, number> = {};
    incidents.forEach((inc) => {
      if (inc.streetAddress) {
        const normalized = inc.streetAddress.trim();
        streetCounts[normalized] = (streetCounts[normalized] || 0) + 1;
      }
    });

    return Object.entries(streetCounts)
      .filter(([_, count]) => count > 10)
      .map(([street, count]) => ({ street, count }));
  }, [incidents]);

  // Handle opening Agent Assignment modal
  const handleOpenAssignAgent = async (incident: IncidentListItem) => {
    setAssignAgentIncident(incident);
    setSelectedStaffId('');
    setStaffLoading(true);
    try {
      const agents = await usersApi.getStaff('AGENT');
      setStaffList(agents);
    } catch {
      toast.error('Failed to load field agents list.');
    } finally {
      setStaffLoading(false);
    }
  };

  // Handle opening Technician Assignment modal
  const handleOpenAssignTech = async (incident: IncidentListItem) => {
    setAssignTechIncident(incident);
    setSelectedStaffId('');
    setStaffLoading(true);
    try {
      const techs = await usersApi.getStaff('TECHNICIAN');
      setStaffList(techs);
    } catch {
      toast.error('Failed to load repair technicians list.');
    } finally {
      setStaffLoading(false);
    }
  };

  // Submit Agent Assignment
  const handleConfirmAssignAgent = async () => {
    if (!assignAgentIncident || !selectedStaffId) return;
    setSubmittingDispatch(true);
    try {
      await incidentsApi.assignAgent(assignAgentIncident.id, {
        agentId: selectedStaffId,
      });
      toast.success(
        `Field agent dispatched to inspect Report #${assignAgentIncident.reportNumber}.`,
      );
      setAssignAgentIncident(null);
      fetchIncidents(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Failed to assign field agent.');
      } else {
        toast.error('Network error during dispatch.');
      }
    } finally {
      setSubmittingDispatch(false);
    }
  };

  // Submit Technician Assignment
  const handleConfirmAssignTech = async () => {
    if (!assignTechIncident || !selectedStaffId) return;
    setSubmittingDispatch(true);
    try {
      await incidentsApi.assignTechnician(assignTechIncident.id, {
        technicianId: selectedStaffId,
      });
      toast.success(
        `Technician crew assigned to repair Report #${assignTechIncident.reportNumber}.`,
      );
      setAssignTechIncident(null);
      fetchIncidents(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Failed to assign technician.');
      } else {
        toast.error('Network error during technician dispatch.');
      }
    } finally {
      setSubmittingDispatch(false);
    }
  };

  // Open Full Detail Modal
  const handleOpenDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const full = await incidentsApi.getById(id);
      setDetailIncident(full);
    } catch {
      toast.error('Unable to fetch detailed incident record.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filter form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateQueryParams({ page: 1, streetAddress: streetSearch });
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setCategoryFilter('');
    setStreetSearch('');
    setPage(1);
    updateQueryParams({ status: '', category: '', streetAddress: '', page: 1 });
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <RouteGuard allowedRoles={['ADMIN']}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Operations Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
              <Shield className="h-4 w-4" />
              <span>Municipal Operations Center</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Admin Incident Operations
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Supervise municipal incident lifecycle, inspect high-density streets, and dispatch field agents or technicians.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => fetchIncidents(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-purple-600' : ''}`}
              />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* High Density Street Alert Banner */}
        {highDensityStreets.length > 0 && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950 shadow-xs flex items-start gap-3 animate-in fade-in">
            <AlertOctagon className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h3 className="font-bold text-sm text-rose-900">
                High-Density Street Warning ({highDensityStreets.length} critical cluster detected)
              </h3>
              <p className="text-xs text-rose-800">
                The following streets have accumulated more than 10 incident reports, triggering municipal alerts:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {highDensityStreets.map((item) => (
                  <span
                    key={item.street}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200 shadow-2xs"
                  >
                    <MapPin className="h-3 w-3 text-rose-500" />
                    <span>{item.street}</span>
                    <span className="rounded-full bg-rose-600 text-white px-1.5 py-0.2 text-[10px]">
                      {item.count} reports
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters Toolbar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <form
            onSubmit={handleSearchSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                  updateQueryParams({ status: e.target.value, page: 1 });
                }}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              >
                <option value="">All Statuses ({total})</option>
                {Object.entries(STATUSES).map(([key, val]) => (
                  <option key={key} value={val}>
                    {STATUS_LABELS[val as IncidentStatus]}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                  updateQueryParams({ category: e.target.value, page: 1 });
                }}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORIES).map(([key, val]) => (
                  <option key={key} value={val}>
                    {CATEGORY_LABELS[val as IncidentCategory]}
                  </option>
                ))}
              </select>
            </div>

            {/* Street Search */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Street Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by street..."
                  value={streetSearch}
                  onChange={(e) => setStreetSearch(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-purple-700 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-800 transition"
              >
                Apply
              </button>
              {(statusFilter || categoryFilter || streetSearch) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  title="Clear all filters"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex min-h-[350px] items-center justify-center">
            <Spinner size="lg" label="Loading municipal incident queue..." />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <ErrorState
            title="Unable to load incident queue"
            message={error}
            onRetry={() => fetchIncidents()}
          />
        )}

        {/* Empty State */}
        {!loading && !error && incidents.length === 0 && (
          <EmptyState
            title="No incidents matched your query"
            description="Try loosening your category, status or street address filters to view more records."
            actionLabel="Reset Filters"
            onAction={handleClearFilters}
          />
        )}

        {/* Incidents Table */}
        {!loading && !error && incidents.length > 0 && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">
                      Report #
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Issue & Category
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Street Location
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Priority
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Operations Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {incidents.map((incident) => {
                    const isReceived = incident.status === 'RECEIVED';
                    const isValidated = incident.status === 'VALIDATED';

                    return (
                      <tr
                        key={incident.id}
                        className="hover:bg-slate-50/70 transition"
                      >
                        {/* Report Number */}
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-slate-900">
                          #{incident.reportNumber}
                        </td>

                        {/* Title & Category */}
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-semibold text-slate-900 truncate">
                            {incident.title}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mt-0.5">
                            {CATEGORY_LABELS[incident.category]}
                          </div>
                        </td>

                        {/* Street */}
                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {incident.streetAddress}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge status={incident.status} size="sm" />
                        </td>

                        {/* Priority Badge */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <PriorityBadge priority={incident.priority} size="sm" />
                        </td>

                        {/* Operations Actions */}
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Assign Agent button for RECEIVED */}
                            {isReceived && (
                              <button
                                onClick={() => handleOpenAssignAgent(incident)}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>Assign Agent</span>
                              </button>
                            )}

                            {/* Assign Technician button for VALIDATED */}
                            {isValidated && (
                              <button
                                onClick={() => handleOpenAssignTech(incident)}
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
                              >
                                <HardHat className="h-3.5 w-3.5" />
                                <span>Assign Tech</span>
                              </button>
                            )}

                            {/* View Detail button */}
                            <button
                              onClick={() => handleOpenDetail(incident.id)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2">
              <span className="text-xs text-slate-500">
                Showing {incidents.length} of {total} incidents (Page {page} of{' '}
                {totalPages})
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    setPage(prev);
                    updateQueryParams({ page: prev });
                  }}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    updateQueryParams({ page: next });
                  }}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Assign Field Agent */}
        {assignAgentIncident && (
          <Modal
            isOpen={!!assignAgentIncident}
            onClose={() => setAssignAgentIncident(null)}
            title={`Dispatch Field Agent — Report #${assignAgentIncident.reportNumber}`}
            description={`Assign an on-site inspection agent to verify ${assignAgentIncident.streetAddress}`}
            footer={
              <>
                <button
                  onClick={() => setAssignAgentIncident(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignAgent}
                  disabled={!selectedStaffId || submittingDispatch}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingDispatch ? 'Dispatching...' : 'Confirm Agent Dispatch'}
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
                <p className="font-bold text-slate-800">
                  {assignAgentIncident.title}
                </p>
                <p className="text-slate-500 mt-1">
                  {assignAgentIncident.streetAddress}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Select Field Agent *
                </label>
                {staffLoading ? (
                  <div className="py-4 text-center">
                    <Spinner size="sm" label="Loading available field agents..." />
                  </div>
                ) : (
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Choose an agent...</option>
                    {staffList.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName} ({agent.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Modal: Assign Repair Technician */}
        {assignTechIncident && (
          <Modal
            isOpen={!!assignTechIncident}
            onClose={() => setAssignTechIncident(null)}
            title={`Assign Repair Crew — Report #${assignTechIncident.reportNumber}`}
            description={`Dispatch a technician to execute field repairs at ${assignTechIncident.streetAddress}`}
            footer={
              <>
                <button
                  onClick={() => setAssignTechIncident(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignTech}
                  disabled={!selectedStaffId || submittingDispatch}
                  className="rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-800 disabled:opacity-50"
                >
                  {submittingDispatch ? 'Assigning...' : 'Confirm Technician Assignment'}
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
                <p className="font-bold text-slate-800">
                  {assignTechIncident.title}
                </p>
                <p className="text-slate-500 mt-1">
                  {assignTechIncident.streetAddress}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Select Repair Technician *
                </label>
                {staffLoading ? (
                  <div className="py-4 text-center">
                    <Spinner size="sm" label="Loading available technicians..." />
                  </div>
                ) : (
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="">Choose a technician...</option>
                    {staffList.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.firstName} {tech.lastName} ({tech.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Modal: Full Incident Detail Inspection */}
        {detailIncident && (
          <Modal
            isOpen={!!detailIncident}
            onClose={() => setDetailIncident(null)}
            title={`Report #${detailIncident.reportNumber}: ${detailIncident.title}`}
            description={`Municipal record details for ${detailIncident.streetAddress}`}
            maxWidth="xl"
            footer={
              <button
                onClick={() => setDetailIncident(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close Record
              </button>
            }
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {CATEGORY_LABELS[detailIncident.category]}
                  </span>
                  <StatusBadge status={detailIncident.status} />
                </div>
                {detailIncident.priority && (
                  <PriorityBadge priority={detailIncident.priority} />
                )}
              </div>

              {/* Photos */}
              {detailIncident.photos && detailIncident.photos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Evidence Photos ({detailIncident.photos.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {detailIncident.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative h-44 overflow-hidden rounded-xl bg-slate-100 border border-slate-200"
                      >
                        {photo.url ? (
                          <Image
                            src={photo.url}
                            alt="Incident photo"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            Photo link expired
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Description
                </h4>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {detailIncident.description}
                </p>
              </div>

              {/* Location info */}
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-800">
                  Address: {detailIncident.streetAddress}
                </div>
                <div>
                  Coordinates: {detailIncident.latitude}, {detailIncident.longitude}
                </div>
              </div>

              {/* Workflow timeline */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Workflow Lifecycle
                </h4>
                <IncidentTimeline status={detailIncident.status} />
              </div>

              {/* Notes log */}
              {detailIncident.notes && detailIncident.notes.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Staff Notes History
                  </h4>
                  {detailIncident.notes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg bg-slate-50 p-2.5 text-xs border border-slate-200"
                    >
                      <p className="font-medium text-slate-800">{n.content}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </RouteGuard>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner size="lg" label="Loading admin operations center..." />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
