"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/store/auth-store";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckSquare,
  Database,
  TrendingUp,
  Calendar,
  FileText,
  Download,
  Eye,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import type { ACCUApplication, QueryOptions } from "@accu/shared";

interface ACCUApplicationFilters extends QueryOptions {
  search?: string;
  status?: string;
  projectId?: string;
}

export default function ACCUApplicationsPage() {
  const { hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<ACCUApplication[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);

  const canReadACCU = hasPermission("accu_applications.read");
  const canWriteACCU = hasPermission("accu_applications.write");
  const canDeleteACCU = hasPermission("accu_applications.delete");

  useEffect(() => {
    if (canReadACCU) {
      loadApplications();
    }
  }, [currentPage, searchQuery, statusFilter, projectFilter, canReadACCU]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      
      const params: ACCUApplicationFilters = {
        page: currentPage,
        limit: pageSize,
        sort: 'updatedAt',
        order: 'desc',
      };

      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.projectId = projectFilter;

      const response = await apiClient.get<{ applications: ACCUApplication[], total: number }>('/accu-applications', { 
        params 
      });

      if (response.success && response.data) {
        setApplications(response.data.applications || []);
        setTotalApplications(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load ACCU applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadApplications();
  };

  const handleApplicationAction = async (applicationId: string, action: 'submit' | 'approve' | 'reject' | 'delete') => {
    try {
      switch (action) {
        case 'submit':
          await apiClient.patch(`/accu-applications/${applicationId}`, { status: 'submitted' });
          break;
        case 'approve':
          await apiClient.patch(`/accu-applications/${applicationId}`, { status: 'approved' });
          break;
        case 'reject':
          await apiClient.patch(`/accu-applications/${applicationId}`, { status: 'rejected' });
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this ACCU application? This action cannot be undone.')) {
            await apiClient.delete(`/accu-applications/${applicationId}`);
          }
          break;
      }
      
      // Reload applications after action
      loadApplications();
    } catch (error) {
      console.error(`Failed to ${action} application:`, error);
      alert(`Failed to ${action} application. Please try again.`);
    }
  };

  const handleSelectApplication = (applicationId: string) => {
    setSelectedApplications(prev =>
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedApplications.length === applications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(applications.map(app => app.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      issued: 'bg-purple-100 text-purple-800',
    };

    const statusIcons = {
      draft: <Clock className="h-3 w-3" />,
      submitted: <Send className="h-3 w-3" />,
      under_review: <AlertCircle className="h-3 w-3" />,
      approved: <CheckCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
      issued: <CheckSquare className="h-3 w-3" />,
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.draft}`}>
        {statusIcons[status as keyof typeof statusIcons] && (
          <span className="mr-1">{statusIcons[status as keyof typeof statusIcons]}</span>
        )}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'issued':
        return 'text-green-600 bg-green-50';
      case 'under_review':
      case 'submitted':
        return 'text-yellow-600 bg-yellow-50';
      case 'draft':
        return 'text-blue-600 bg-blue-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const calculateTotalACCUUnits = () => {
    return applications.reduce((total, app) => total + app.accuUnits, 0);
  };

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status).length;
  };

  const totalPages = Math.ceil(totalApplications / pageSize);

  if (!canReadACCU) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view ACCU applications.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ACCU Applications</h1>
            <p className="text-muted-foreground">
              Manage Australian Carbon Credit Unit applications and tracking
            </p>
          </div>
          <div className="flex space-x-2">
            {selectedApplications.length > 0 && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export ({selectedApplications.length})
              </Button>
            )}
            {canWriteACCU && (
              <Link href="/accu-applications/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Application
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalApplications)}</div>
              <p className="text-xs text-muted-foreground">
                {getApplicationsByStatus('draft')} drafts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total ACCU Units</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(calculateTotalACCUUnits())}</div>
              <p className="text-xs text-muted-foreground">
                Across all applications
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(getApplicationsByStatus('under_review'))}</div>
              <p className="text-xs text-muted-foreground">
                {getApplicationsByStatus('submitted')} submitted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(getApplicationsByStatus('approved') + getApplicationsByStatus('issued'))}</div>
              <p className="text-xs text-muted-foreground">
                {getApplicationsByStatus('issued')} issued
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search applications by project or methodology..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="issued">Issued</option>
              </select>

              <Button type="submit" variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Applications ({totalApplications})</CardTitle>
            <CardDescription>
              {selectedApplications.length > 0 && `${selectedApplications.length} selected • `}
              Manage ACCU applications and track their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedApplications.length === applications.length && applications.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedApplications.length > 0 ? `${selectedApplications.length} selected` : 'Select all'}
                  </span>
                </div>

                {/* Applications List */}
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedApplications.includes(application.id)}
                            onChange={() => handleSelectApplication(application.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-1"
                          />
                          
                          <div className="flex-shrink-0">
                            <CheckSquare className="h-6 w-6 text-primary" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                ACCU Application #{application.id.slice(-8)}
                              </h3>
                              {getStatusBadge(application.status)}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3 text-sm">
                              <div>
                                <span className="text-gray-500">Project:</span>
                                <p className="font-medium">{application.projectId}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">ACCU Units:</span>
                                <p className="font-medium">{formatNumber(application.accuUnits)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Methodology:</span>
                                <p className="font-medium">{application.methodologyId}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">SER Reference:</span>
                                <p className="font-medium">{application.serReference || 'N/A'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-6 text-xs text-gray-500">
                              {application.submissionDate && (
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <span>Submitted: {formatDate(application.submissionDate)}</span>
                                </div>
                              )}
                              
                              {application.approvalDate && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  <span>Approved: {formatDate(application.approvalDate)}</span>
                                </div>
                              )}
                              
                              {application.issuedDate && (
                                <div className="flex items-center">
                                  <FileText className="h-3 w-3 mr-1" />
                                  <span>Issued: {formatDate(application.issuedDate)}</span>
                                </div>
                              )}
                              
                              <div>
                                <span>Updated: {formatDateTime(application.updatedAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Link href={`/accu-applications/${application.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <Link href={`/accu-applications/${application.id}/edit`}>
                            <Button variant="ghost" size="sm" disabled={!canWriteACCU}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          {application.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApplicationAction(application.id, 'submit')}
                              disabled={!canWriteACCU}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {application.status === 'submitted' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApplicationAction(application.id, 'approve')}
                                disabled={!canWriteACCU}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApplicationAction(application.id, 'reject')}
                                disabled={!canWriteACCU}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApplicationAction(application.id, 'delete')}
                            disabled={!canDeleteACCU}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalApplications)} of {totalApplications} results
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {applications.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No ACCU applications</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new ACCU application.</p>
                    {canWriteACCU && (
                      <div className="mt-6">
                        <Link href="/accu-applications/new">
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Application
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}