'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogout, waitlistApi } from '@/lib/admin/adminApi';
import { toCsv } from '@/lib/waitlist/csv';
import type { WaitlistEntry } from '@/lib/waitlist/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogOut, Search, Download, Users, CheckCircle, XCircle, BarChart3, Trash2, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  countAnsweredQuestions,
  CURRENT_META,
  entriesForSchema,
  isNewSubmission,
  LEGACY_META,
  TOTAL_CURRENT_QUESTIONS,
  type QuestionMeta,
} from '@/lib/questionnaire-questions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortColumn = 'name' | 'email' | 'country' | 'questions' | 'submittedAt';
type StatusFilter = 'all' | 'new' | 'legacy' | 'none' | 'completed' | 'visited' | 'preregistered';

export function WaitlistDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('submittedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<WaitlistEntry | null>(null);
  const [userToDelete, setUserToDelete] = useState<WaitlistEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadUsers();
  }, []);

  // Reset pagination whenever a filter or sort input changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, countryFilter, statusFilter, sortColumn, sortDir]);

  // Distinct countries derived from current data, used for the country filter.
  const countries = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      const c = u.location?.split(',').pop()?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [users]);

  const getCountry = (u: WaitlistEntry) =>
    u.location?.split(',').pop()?.trim() || 'Unknown';

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    const filtered = users.filter(user => {
      if (search) {
        const matches =
          user.firstName?.toLowerCase().includes(search) ||
          user.lastName?.toLowerCase().includes(search) ||
          user.email?.toLowerCase().includes(search) ||
          user.location?.toLowerCase().includes(search);
        if (!matches) return false;
      }

      if (countryFilter !== 'all' && getCountry(user) !== countryFilter) return false;

      if (statusFilter !== 'all') {
        const counts = countAnsweredQuestions(user.surveyData);
        switch (statusFilter) {
          case 'new':
            if (counts.current === 0) return false;
            break;
          case 'legacy':
            if (counts.legacy === 0) return false;
            break;
          case 'none':
            if (counts.current > 0 || counts.legacy > 0) return false;
            break;
          case 'completed':
            if (!user.hasCompletedSurvey) return false;
            break;
          case 'visited':
            if (!user.hasVisitedSite) return false;
            break;
          case 'preregistered':
            if (!user.hasPreregistered) return false;
            break;
        }
      }

      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      switch (sortColumn) {
        case 'name': {
          const an = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim().toLowerCase();
          const bn = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim().toLowerCase();
          return an.localeCompare(bn) * dir;
        }
        case 'email':
          return (a.email ?? '').toLowerCase().localeCompare((b.email ?? '').toLowerCase()) * dir;
        case 'country':
          return getCountry(a).localeCompare(getCountry(b)) * dir;
        case 'questions': {
          const ac = countAnsweredQuestions(a.surveyData);
          const bc = countAnsweredQuestions(b.surveyData);
          return ((ac.current + ac.legacy) - (bc.current + bc.legacy)) * dir;
        }
        case 'submittedAt': {
          const at = new Date(a.submittedAt || 0).getTime();
          const bt = new Date(b.submittedAt || 0).getTime();
          return (at - bt) * dir;
        }
      }
    });
  }, [users, searchTerm, countryFilter, statusFilter, sortColumn, sortDir]);

  const handleSort = (col: SortColumn) => {
    if (col === sortColumn) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      // Numeric/date columns default to descending; text defaults to ascending.
      setSortDir(col === 'questions' || col === 'submittedAt' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (col: SortColumn) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/60" />;
    }
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 inline h-3 w-3" />
      : <ArrowDown className="ml-1 inline h-3 w-3" />;
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const loadUsers = async () => {
    try {
      // Newest first, as served by /admin/api/waitlist.
      setUsers(await waitlistApi.list());
      setLoadError(null);
    } catch (error) {
      // A failed read must never render as "No users found".
      setLoadError(error instanceof Error ? error.message : 'Could not load the waitlist.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    void adminLogout();
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await waitlistApi.remove(userToDelete.id);
      // Drop them from local state without refetching
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      // If they were also the selected user in the details panel, close it
      if (selectedUser?.id === userToDelete.id) setSelectedUser(null);
      setUserToDelete(null);
    } catch (error: any) {
      setDeleteError(error?.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  // Render counts in a compact "current · legacy" form. The legacy total
  // varies across historical questionnaire versions, so it's shown as a raw
  // count rather than X/N. A dash means the user has answered nothing.
  const formatAnsweredCounts = (surveyData: any): string => {
    const { current, legacy } = countAnsweredQuestions(surveyData);
    if (current === 0 && legacy === 0) return '—';
    if (legacy === 0) return `${current}/${TOTAL_CURRENT_QUESTIONS}`;
    if (current === 0) return `${legacy} legacy`;
    return `${current}/${TOTAL_CURRENT_QUESTIONS} · ${legacy} legacy`;
  };

  const exportToCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Country',
      'Registered',
      'Survey Completed',
      'Questions Answered (Current)',
      'Questions Answered (Legacy)',
      'Visited Site',
      'Submitted At',
      'Q1 Prefunding',
      'Q1 Prefunding Why',
      'Q2 Settlement Methods',
      'Q2 Settlement Methods (Other)',
      'Q2 Settlement Feedback',
      'Q3 Money In Air',
      'Q3 Money In Air Amount',
      'Q4 Weekly Spend',
      'Q5 Split Types',
      'Q5 Split Types (Other)',
      'Q6 Hangout / Pool Willingness',
      'Q6 Why',
      'Q7 Social Features',
      'Q7 Social Features (Other)',
      'Q8 Friend Conversion',
    ];

    const csvData = filteredUsers.map(user => {
      const survey = user.surveyData || {};
      // A stored answer is free text or a list of chosen options.
      const answer = (key: string): string => {
        const value = survey[key];
        return Array.isArray(value) ? value.join('; ') : value ?? '';
      };
      const counts = countAnsweredQuestions(user.surveyData);
      return [
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.location ? user.location.split(',').pop()?.trim() || 'Unknown' : 'Unknown',
        user.hasPreregistered ? 'Yes' : 'No',
        user.hasCompletedSurvey ? 'Yes' : 'No',
        `${counts.current}/${TOTAL_CURRENT_QUESTIONS}`,
        `${counts.legacy}`,
        user.hasVisitedSite ? 'Yes' : 'No',
        user.submittedAt ? format(new Date(user.submittedAt), 'yyyy-MM-dd HH:mm') : '',
        answer('prefunding'),
        answer('prefundingWhy'),
        answer('settlementMethods'),
        answer('settlementMethodsOther'),
        answer('settlementFeedback'),
        answer('moneyInAir'),
        answer('moneyInAirAmount'),
        answer('weeklySpend'),
        answer('splitTypes'),
        answer('splitTypesOther'),
        answer('hangoutPoolWillingness'),
        answer('hangoutPoolWhy'),
        answer('socialFeatures'),
        answer('socialFeaturesOther'),
        answer('friendConversion'),
      ];
    });

    // Every cell is visitor-written: `toCsv` escapes quotes and neutralises
    // spreadsheet formulas (see lib/waitlist/csv.ts).
    const csv = toCsv([headers, ...csvData]);

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pool-users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    totalUsers: users.length,
    preregistered: users.filter(u => u.hasPreregistered).length,
    surveysCompleted: users.filter(u => u.hasCompletedSurvey).length,
    visitedSite: users.filter(u => u.hasVisitedSite).length,
  };
  
  // Calculate average questions answered (current schema only — legacy is frozen)
  const usersWithSurvey = users.filter(u => u.surveyData);
  const avgQuestions = usersWithSurvey.length > 0
    ? (
        usersWithSurvey.reduce(
          (sum, user) => sum + countAnsweredQuestions(user.surveyData).current,
          0,
        ) / usersWithSurvey.length
      ).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card relative">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h1>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/admin/stats')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">View Stats</span>
              <span className="sm:hidden">Stats</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Pre-registered</CardTitle>
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.preregistered}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Completed Questionnaire</CardTitle>
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.surveysCompleted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Site Visits</CardTitle>
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.visitedSite}</div>
            </CardContent>
          </Card>
        </div>

        {/* User Table */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">User Data</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  All registered users and their questionnaire responses
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative w-full">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="w-full sm:w-48 text-sm">
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="w-full sm:w-56 text-sm">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="new">Has new answers</SelectItem>
                      <SelectItem value="legacy">Has legacy answers</SelectItem>
                      <SelectItem value="none">No answers</SelectItem>
                      <SelectItem value="completed">Completed survey</SelectItem>
                      <SelectItem value="visited">Visited site</SelectItem>
                      <SelectItem value="preregistered">Pre-registered</SelectItem>
                    </SelectContent>
                  </Select>
                  {(searchTerm || countryFilter !== 'all' || statusFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSearchTerm(''); setCountryFilter('all'); setStatusFilter('all'); }}
                      className="text-xs"
                    >
                      Clear filters
                    </Button>
                  )}
                  <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto sm:ml-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} users
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="font-medium hover:text-foreground transition-colors"
                      >
                        Name {renderSortIcon('name')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => handleSort('email')}
                        className="font-medium hover:text-foreground transition-colors"
                      >
                        Email {renderSortIcon('email')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => handleSort('country')}
                        className="font-medium hover:text-foreground transition-colors"
                      >
                        Country {renderSortIcon('country')}
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => handleSort('questions')}
                        className="font-medium hover:text-foreground transition-colors"
                      >
                        Questions {renderSortIcon('questions')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => handleSort('submittedAt')}
                        className="font-medium hover:text-foreground transition-colors"
                      >
                        Submitted {renderSortIcon('submittedAt')}
                      </button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.location ? user.location.split(',').pop()?.trim() || 'Unknown' : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.hasPreregistered && (
                            <Badge variant="outline" className="text-xs">
                              Registered
                            </Badge>
                          )}
                          {user.hasCompletedSurvey && (
                            <Badge variant="default" className="text-xs">
                              Questionnaire
                            </Badge>
                          )}
                          {user.hasVisitedSite && (
                            <Badge variant="secondary" className="text-xs">
                              Visited
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm whitespace-nowrap">
                          {formatAnsweredCounts(user.surveyData)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.submittedAt && (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(user.submittedAt), 'MMM d, yyyy')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setDeleteError(null); setUserToDelete(user); }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label={`Delete ${user.firstName} ${user.lastName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {currentUsers.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground break-all">
                        {user.email}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.location ? user.location.split(',').pop()?.trim() || 'Unknown' : 'Unknown'}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {user.hasPreregistered && (
                      <Badge variant="outline" className="text-xs">
                        Registered
                      </Badge>
                    )}
                    {user.hasCompletedSurvey && (
                      <Badge variant="default" className="text-xs">
                        Questionnaire
                      </Badge>
                    )}
                    {user.hasVisitedSite && (
                      <Badge variant="secondary" className="text-xs">
                        Visited
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Questions: {formatAnsweredCounts(user.surveyData)}</span>
                    <span>{user.submittedAt && format(new Date(user.submittedAt), 'MMM d, yyyy')}</span>
                  </div>
                  
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                      className="text-xs"
                    >
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDeleteError(null); setUserToDelete(user); }}
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Delete ${user.firstName} ${user.lastName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {loadError && (
              <div role="alert" className="text-center py-8 text-destructive">
                Could not load the waitlist: {loadError}
              </div>
            )}

            {!loadError && filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 sm:w-9 text-xs sm:text-sm"
                          >
                            {page}
                          </Button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return <span key={page} className="px-1 text-xs">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">User Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Name</Label>
                  <p className="text-sm sm:text-base">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Email</Label>
                  <p className="text-sm sm:text-base break-all">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Country</Label>
                  <p className="text-sm sm:text-base">
                    {selectedUser.location ? selectedUser.location.split(',').pop()?.trim() || 'Unknown' : 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Submitted At</Label>
                  <p className="text-sm sm:text-base">
                    {selectedUser.submittedAt ? 
                      format(new Date(selectedUser.submittedAt), 'MMM d, yyyy HH:mm') : 
                      'N/A'
                    }
                  </p>
                </div>
              </div>

              {(() => {
                const isEmpty = (v: unknown) =>
                  v == null ||
                  (Array.isArray(v) && v.length === 0) ||
                  (typeof v === 'string' && v.trim() === '');

                const filledEntries = selectedUser.surveyData
                  ? Object.entries(selectedUser.surveyData).filter(([, v]) => !isEmpty(v))
                  : [];
                // A record belongs to one schema or the other — not both.
                // Shared field names like prefunding/splitTypes are attributed
                // to the actual submission's schema, never duplicated.
                const isNew = isNewSubmission(selectedUser.surveyData);
                const currentEntries = isNew
                  ? entriesForSchema(filledEntries, CURRENT_META)
                  : [];
                const legacyEntries = isNew
                  ? []
                  : entriesForSchema(filledEntries, LEGACY_META);
                const counts = countAnsweredQuestions(selectedUser.surveyData);

                const renderEntry = (schema: Record<string, QuestionMeta>) =>
                  ([key, value]: [string, unknown]) => {
                    const meta = schema[key];
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs sm:text-sm whitespace-pre-wrap text-muted-foreground">
                          {meta?.label ?? key}
                        </Label>
                        <p className="text-sm sm:text-base">
                          {Array.isArray(value) ? value.join(', ') : (value as string)}
                        </p>
                      </div>
                    );
                  };

                const hasCurrent = currentEntries.length > 0;
                const hasLegacy = legacyEntries.length > 0;

                return (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 text-sm sm:text-base">Survey Responses</h3>

                    {!hasCurrent && !hasLegacy && (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}

                    {hasCurrent && hasLegacy && (
                      <Tabs defaultValue="current">
                        <TabsList className="h-8 p-0.5 mb-3">
                          <TabsTrigger value="current" className="text-xs px-2.5 py-1">
                            New ({counts.current}/{TOTAL_CURRENT_QUESTIONS})
                          </TabsTrigger>
                          <TabsTrigger value="legacy" className="text-xs px-2.5 py-1">
                            Legacy ({counts.legacy})
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="current" className="space-y-3">
                          {currentEntries.map(renderEntry(CURRENT_META))}
                        </TabsContent>
                        <TabsContent value="legacy" className="space-y-3">
                          {legacyEntries.map(renderEntry(LEGACY_META))}
                        </TabsContent>
                      </Tabs>
                    )}

                    {hasCurrent && !hasLegacy && (
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          New ({counts.current}/{TOTAL_CURRENT_QUESTIONS})
                        </p>
                        {currentEntries.map(renderEntry(CURRENT_META))}
                      </div>
                    )}

                    {!hasCurrent && hasLegacy && (
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Legacy ({counts.legacy})
                        </p>
                        {legacyEntries.map(renderEntry(LEGACY_META))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete confirmation modal */}
      {userToDelete && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { if (!isDeleting) setUserToDelete(null); }}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete this user?
              </CardTitle>
              <CardDescription>
                This will permanently remove their preregistration and survey responses. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">
                  {userToDelete.firstName} {userToDelete.lastName}
                </div>
                <div className="text-muted-foreground break-all">{userToDelete.email}</div>
              </div>
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete user
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
