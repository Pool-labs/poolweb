'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPreregisterUsers, PreregisterUserWithId, signOut } from '@/app/firebase/services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, ArrowLeft, Download } from 'lucide-react';

interface StatData {
  question: string;
  options: Record<string, number>;
  total: number;
}

interface TextAnalysis {
  question: string;
  responses: string[];
  themes: Record<string, number>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  wordFrequency: Record<string, number>;
}

export default function AdminStatsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PreregisterUserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, StatData>>({});
  const [textAnalysis, setTextAnalysis] = useState<Record<string, TextAnalysis>>({});

  useEffect(() => {
    loadUsersAndCalculateStats();
  }, []);

  const loadUsersAndCalculateStats = async () => {
    try {
      const allUsers = await getPreregisterUsers();
      setUsers(allUsers);
      calculateStats(allUsers);
      analyzeTextResponses(allUsers);
    } catch (error) {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (users: PreregisterUserWithId[]) => {
    const surveyUsers = users.filter(u => u.surveyData && u.hasCompletedSurvey);
    
    const statsData: Record<string, StatData> = {
      prefunding: {
        question: 'Q1: Would you pre-fund for activities?',
        options: {},
        total: 0
      },
      moneyInAir: {
        question: 'Q3: Is there money "in the air" — owed to you or by you to friends right now?',
        options: {},
        total: 0
      },
      hangoutPoolWillingness: {
        question: 'Q6: Willing to hang out with random people with similar interests AND pool money together?',
        options: {},
        total: 0
      },
      friendConversion: {
        question: 'Q8: How hard would it be to get your friends to use POOL?',
        options: {},
        total: 0
      }
    };

    // Process each user's survey data
    surveyUsers.forEach(user => {
      const survey = user.surveyData!;

      // Single choice questions
      const singleChoiceFields = [
        'prefunding', 'moneyInAir', 'hangoutPoolWillingness', 'friendConversion'
      ];

      singleChoiceFields.forEach(field => {
        const value = survey[field as keyof typeof survey];
        if (value && typeof value === 'string') {
          if (!statsData[field].options[value]) {
            statsData[field].options[value] = 0;
          }
          statsData[field].options[value]++;
          statsData[field].total++;
        }
      });

      // Multiple choice questions
      if (survey.settlementMethods && Array.isArray(survey.settlementMethods)) {
        if (!statsData.settlementMethods) {
          statsData.settlementMethods = {
            question: 'Q2: How do you currently settle group expenses?',
            options: {},
            total: 0
          };
        }
        survey.settlementMethods.forEach(method => {
          if (!statsData.settlementMethods.options[method]) {
            statsData.settlementMethods.options[method] = 0;
          }
          statsData.settlementMethods.options[method]++;
        });
        statsData.settlementMethods.total++;
      }

      if (survey.splitTypes && Array.isArray(survey.splitTypes)) {
        if (!statsData.splitTypes) {
          statsData.splitTypes = {
            question: 'Q5: What kinds of things do you usually split?',
            options: {},
            total: 0
          };
        }
        survey.splitTypes.forEach(type => {
          if (!statsData.splitTypes.options[type]) {
            statsData.splitTypes.options[type] = 0;
          }
          statsData.splitTypes.options[type]++;
        });
        statsData.splitTypes.total++;
      }

      if (survey.socialFeatures && Array.isArray(survey.socialFeatures)) {
        if (!statsData.socialFeatures) {
          statsData.socialFeatures = {
            question: 'Q7: Which social features in a money app would you care about?',
            options: {},
            total: 0
          };
        }
        survey.socialFeatures.forEach(feature => {
          if (!statsData.socialFeatures.options[feature]) {
            statsData.socialFeatures.options[feature] = 0;
          }
          statsData.socialFeatures.options[feature]++;
        });
        statsData.socialFeatures.total++;
      }
    });

    setStats(statsData);
  };

  const analyzeTextResponses = (users: PreregisterUserWithId[]) => {
    const surveyUsers = users.filter(u => u.surveyData && u.hasCompletedSurvey);
    
    const textFields = [
      { key: 'prefundingWhy', question: 'Q1: Why would / wouldn\'t you pre-fund for activities?' },
      { key: 'settlementFeedback', question: 'Q2: What do you like or dislike about how you currently settle?' },
      { key: 'hangoutPoolWhy', question: 'Q6: Why? (hang out + pool with random similar-interest people)' },
    ];

    const analysis: Record<string, TextAnalysis> = {};

    textFields.forEach(({ key, question }) => {
      const responses: string[] = [];
      
      surveyUsers.forEach(user => {
        const value = user.surveyData![key as keyof typeof user.surveyData];
        if (value && typeof value === 'string' && value.trim()) {
          responses.push(value.trim());
        }
      });

      if (responses.length > 0) {
        analysis[key] = {
          question,
          responses,
          themes: extractThemes(responses),
          sentiment: analyzeSentiment(responses),
          wordFrequency: calculateWordFrequency(responses)
        };
      }
    });

    setTextAnalysis(analysis);
  };

  // Extract common themes from responses
  const extractThemes = (responses: string[]): Record<string, number> => {
    const themes: Record<string, number> = {};
    
    // Define theme keywords
    const themeKeywords = {
      'Privacy & Security': ['privacy', 'secure', 'security', 'safe', 'trust', 'data', 'personal'],
      'Ease of Use': ['easy', 'simple', 'convenient', 'quick', 'fast', 'user-friendly', 'intuitive'],
      'Cost & Fees': ['fee', 'cost', 'expensive', 'free', 'charge', 'money', 'price'],
      'Social Dynamics': ['awkward', 'tension', 'friend', 'relationship', 'social', 'uncomfortable'],
      'Tracking & History': ['track', 'history', 'record', 'log', 'remember', 'forget'],
      'Payment Methods': ['payment', 'card', 'bank', 'venmo', 'cash', 'transfer'],
      'Accuracy': ['accurate', 'fair', 'split', 'equal', 'calculation', 'wrong'],
      'Communication': ['remind', 'notification', 'message', 'communicate', 'notify']
    };

    responses.forEach(response => {
      const lowerResponse = response.toLowerCase();
      
      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerResponse.includes(keyword))) {
          themes[theme] = (themes[theme] || 0) + 1;
        }
      });
    });

    return themes;
  };

  // Basic sentiment analysis
  const analyzeSentiment = (responses: string[]): { positive: number; neutral: number; negative: number } => {
    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    
    const positiveWords = ['love', 'great', 'excellent', 'good', 'like', 'enjoy', 'helpful', 'convenient', 'easy', 'simple', 'best', 'perfect'];
    const negativeWords = ['hate', 'bad', 'terrible', 'difficult', 'hard', 'annoying', 'frustrating', 'worse', 'problem', 'issue', 'concern', 'worried'];
    
    responses.forEach(response => {
      const lowerResponse = response.toLowerCase();
      const positiveCount = positiveWords.filter(word => lowerResponse.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerResponse.includes(word)).length;
      
      if (positiveCount > negativeCount) {
        sentiment.positive++;
      } else if (negativeCount > positiveCount) {
        sentiment.negative++;
      } else {
        sentiment.neutral++;
      }
    });
    
    return sentiment;
  };

  // Calculate word frequency (excluding common words)
  const calculateWordFrequency = (responses: string[]): Record<string, number> => {
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'that', 'this', 'these', 'those']);
    
    responses.forEach(response => {
      const words = response.toLowerCase().split(/\W+/).filter(word => word.length > 2 && !stopWords.has(word));
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
    });
    
    // Return top 20 words
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .reduce((acc, [word, count]) => ({ ...acc, [word]: count }), {});
  };

  const getPercentage = (count: number, total: number) => {
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/admin/login');
    } catch (error) {
      // Silently handle error
    }
  };

  const exportStatsToCSV = () => {
    const rows: string[] = ['Question,Option,Count,Percentage'];
    
    // Export multiple choice stats
    Object.entries(stats).forEach(([key, stat]) => {
      Object.entries(stat.options).forEach(([option, count]) => {
        const percentage = getPercentage(count, stat.total);
        rows.push(`"${stat.question}","${option}",${count},${percentage}%`);
      });
    });

    // Add text analysis summary
    if (Object.keys(textAnalysis).length > 0) {
      rows.push(''); // Empty row
      rows.push('Text Response Analysis');
      rows.push('Question,Total Responses,Positive %,Neutral %,Negative %,Top Themes');
      
      Object.entries(textAnalysis).forEach(([key, analysis]) => {
        const topThemes = Object.entries(analysis.themes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([theme, count]) => `${theme} (${count})`)
          .join('; ');
        
        rows.push(`"${analysis.question}",${analysis.responses.length},${getPercentage(analysis.sentiment.positive, analysis.responses.length)}%,${getPercentage(analysis.sentiment.neutral, analysis.responses.length)}%,${getPercentage(analysis.sentiment.negative, analysis.responses.length)}%,"${topThemes}"`);
      });
    }

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pool-survey-stats-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const surveyCompletionRate = users.length > 0 
    ? ((users.filter(u => u.hasCompletedSurvey).length / users.length) * 100).toFixed(1)
    : '0';

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
            <h1 className="text-xl sm:text-2xl font-bold">Survey Statistics</h1>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/admin/dashboard')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Total Users</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Survey Responses</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">
                {users.filter(u => u.hasCompletedSurvey).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{surveyCompletionRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Export Button */}
        <div className="flex justify-end mb-6">
          <Button onClick={exportStatsToCSV} variant="outline" size="sm" className="text-xs sm:text-sm">
            <Download className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Export Stats to CSV
          </Button>
        </div>

        {/* Question Stats */}
        <div className="grid gap-6">
          {Object.entries(stats).map(([key, stat]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{stat.question}</CardTitle>
                <CardDescription>
                  Total responses: {stat.total}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stat.options)
                    .sort((a, b) => b[1] - a[1]) // Sort by count descending
                    .map(([option, count]) => {
                      const percentage = parseFloat(getPercentage(count, stat.total));
                      return (
                        <div key={option} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{option}</span>
                            <span className="text-sm text-muted-foreground">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Text Response Analysis */}
        {Object.keys(textAnalysis).length > 0 && (
          <>
            <div className="mt-12 mb-6">
              <h2 className="text-2xl font-bold">Text Response Analysis</h2>
              <p className="text-muted-foreground mt-2">
                AI-powered analysis of open-ended responses
              </p>
            </div>

            <div className="grid gap-6">
              {Object.entries(textAnalysis).map(([key, analysis]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle>{analysis.question}</CardTitle>
                    <CardDescription>
                      {analysis.responses.length} responses analyzed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Sentiment Analysis */}
                    <div>
                      <h4 className="font-semibold mb-3 text-sm sm:text-base">Sentiment Analysis</h4>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="text-center">
                          <div className="text-lg sm:text-2xl font-bold text-green-600">
                            {getPercentage(analysis.sentiment.positive, analysis.responses.length)}%
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Positive</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                            {getPercentage(analysis.sentiment.neutral, analysis.responses.length)}%
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Neutral</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg sm:text-2xl font-bold text-red-600">
                            {getPercentage(analysis.sentiment.negative, analysis.responses.length)}%
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Negative</div>
                        </div>
                      </div>
                    </div>

                    {/* Common Themes */}
                    {Object.keys(analysis.themes).length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 text-sm sm:text-base">Common Themes</h4>
                        <div className="space-y-2">
                          {Object.entries(analysis.themes)
                            .sort((a, b) => b[1] - a[1])
                            .map(([theme, count]) => {
                              const percentage = parseFloat(getPercentage(count, analysis.responses.length));
                              return (
                                <div key={theme} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{theme}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {count} mentions ({percentage}%)
                                    </span>
                                  </div>
                                  <Progress value={percentage} className="h-2" />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Top Words */}
                    <div>
                      <h4 className="font-semibold mb-3 text-sm sm:text-base">Most Frequent Words</h4>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {Object.entries(analysis.wordFrequency)
                          .slice(0, 15)
                          .map(([word, count]) => (
                            <Badge key={word} variant="secondary" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                              {word} ({count})
                            </Badge>
                          ))}
                      </div>
                    </div>

                    {/* Sample Responses */}
                    <details className="cursor-pointer">
                      <summary className="font-semibold hover:text-primary text-sm sm:text-base">
                        View Sample Responses ({Math.min(5, analysis.responses.length)} of {analysis.responses.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {analysis.responses.slice(0, 5).map((response, idx) => (
                          <div key={idx} className="p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm">
                            "{response}"
                          </div>
                        ))}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
