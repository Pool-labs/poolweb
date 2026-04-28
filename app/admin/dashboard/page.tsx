'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPreregisterUsers, PreregisterUserWithId, signOut } from '@/app/firebase/services';
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
import { Loader2, LogOut, Search, Download, Users, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PreregisterUserWithId[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<PreregisterUserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<PreregisterUserWithId | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.location?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, users]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const loadUsers = async () => {
    try {
      const allUsers = await getPreregisterUsers();
      // Sort by submission date (newest first)
      const sorted = allUsers.sort((a, b) => {
        const dateA = new Date(a.submittedAt || 0).getTime();
        const dateB = new Date(b.submittedAt || 0).getTime();
        return dateB - dateA;
      });
      setUsers(sorted);
      setFilteredUsers(sorted);
    } catch (error) {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/admin/login');
    } catch (error) {
      // Silently handle error
    }
  };

  const countAnsweredQuestions = (surveyData: any): number => {
    if (!surveyData) return 0;

    // Only count the main 12 questions from the questionnaire
    const questions = [
      'hangoutFrequency',
      'avgSpend',
      'splitWith',
      'splitTypes',
      'poolWithAcquaintance',
      'poolWithStranger',
      'dailyRoutinePooling',
      'discoveryInterest',
      'openPoolTypes',
      'trustRequirements',
      'valuableFeatures',
      'concerns'
    ];

    let count = 0;
    questions.forEach(q => {
      const value = surveyData[q];
      if (value && (Array.isArray(value) ? value.length > 0 : value.trim !== undefined ? value.trim() !== '' : true)) {
        count++;
      }
    });

    return count;
  };

  const exportToCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Country',
      'Registered',
      'Survey Completed',
      'Questions Answered',
      'Visited Site',
      'Submitted At',
      'Hangout Frequency',
      'Average Spend',
      'Split With',
      'Split Types',
      'Pool With Acquaintance',
      'Pool With Stranger',
      'Daily Routine Pooling',
      'Discovery Interest',
      'Open Pool Types',
      'Trust Requirements',
      'Valuable Features',
      'Concerns'
    ];

    const csvData = filteredUsers.map(user => {
      const survey = user.surveyData || {};
      return [
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.location ? user.location.split(',').pop()?.trim() || 'Unknown' : 'Unknown',
        user.hasPreregistered ? 'Yes' : 'No',
        user.hasCompletedSurvey ? 'Yes' : 'No',
        `${countAnsweredQuestions(user.surveyData)}/12`,
        user.hasVisitedSite ? 'Yes' : 'No',
        user.submittedAt ? format(new Date(user.submittedAt), 'yyyy-MM-dd HH:mm') : '',
        survey.hangoutFrequency || '',
        survey.avgSpend || '',
        survey.splitWith || '',
        Array.isArray(survey.splitTypes) ? survey.splitTypes.join('; ') : '',
        survey.poolWithAcquaintance || '',
        survey.poolWithStranger || '',
        survey.dailyRoutinePooling || '',
        survey.discoveryInterest || '',
        Array.isArray(survey.openPoolTypes) ? survey.openPoolTypes.join('; ') : '',
        survey.trustRequirements || '',
        Array.isArray(survey.valuableFeatures) ? survey.valuableFeatures.join('; ') : '',
        survey.concerns || ''
      ];
    });

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

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
  
  // Calculate average questions answered
  const usersWithSurvey = users.filter(u => u.surveyData);
  const avgQuestions = usersWithSurvey.length > 0 
    ? (usersWithSurvey.reduce((sum, user) => sum + countAnsweredQuestions(user.surveyData), 0) / usersWithSurvey.length).toFixed(1)
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
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
                <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Submitted</TableHead>
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
                        <span className="text-sm">
                          {countAnsweredQuestions(user.surveyData)}/12
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          View Details
                        </Button>
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
                    <span>Questions: {countAnsweredQuestions(user.surveyData)}/12</span>
                    <span>{user.submittedAt && format(new Date(user.submittedAt), 'MMM d, yyyy')}</span>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                      className="text-xs"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredUsers.length === 0 && (
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

              {selectedUser.surveyData && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Survey Responses</h3>
                    <div className="space-y-3">
                      {Object.entries(selectedUser.surveyData).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs sm:text-sm text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </Label>
                          <p className="text-sm sm:text-base">
                            {Array.isArray(value) ? value.join(', ') : value || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
