/**
 * CPT Engine Main Dashboard
 * Hybrid approach: Leverages existing components while providing dedicated content management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Settings, 
  Grid3X3, 
  Plus, 
  List,
  Database,
  Edit3,
  Eye,
  Archive
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cptApi } from '@/features/cpt-acf/services/cpt.api';
import { useAdminNotices } from '@/hooks/useAdminNotices';

import CPTBuilder from './components/CPTBuilder';
import CPTContentEditor from './components/CPTContentEditor';
import CPTFieldManager from './components/CPTFieldManager';
import CPTContentList from './components/CPTContentList';

const CPTDashboard = () => {
  const navigate = useNavigate();
  const { addNotice } = useAdminNotices();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCPT, setSelectedCPT] = useState<string | null>(null);

  // Fetch all CPT types
  const { data: cptTypes, isLoading } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await cptApi.getAllTypes(true);
      return response.data;
    }
  });

  // Stats for overview
  const stats = {
    totalTypes: cptTypes?.length || 0,
    totalPosts: 0, // This would come from an aggregated query
    activeTypes: cptTypes?.filter(cpt => cpt.isActive)?.length || 0,
    recentPosts: [] // This would come from a recent posts query
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CPT Content Engine</h1>
          <p className="text-muted-foreground mt-1">
            통합 콘텐츠 관리 시스템 - Custom Post Types & Advanced Custom Fields
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/cpt-engine/builder/new')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            새 콘텐츠 타입
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/cpt-engine/settings')}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">대시보드</TabsTrigger>
          <TabsTrigger value="content">콘텐츠 관리</TabsTrigger>
          <TabsTrigger value="types">타입 설정</TabsTrigger>
          <TabsTrigger value="fields">필드 관리</TabsTrigger>
          <TabsTrigger value="taxonomies">분류체계 (Archive)</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  전체 콘텐츠 타입
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTypes}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeTypes} 활성화
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  전체 콘텐츠
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPosts}</div>
                <p className="text-xs text-muted-foreground">
                  모든 타입 포함
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  활성 타입
                </CardTitle>
                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeTypes}</div>
                <p className="text-xs text-muted-foreground">
                  사용 가능한 타입
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  빠른 작업
                </CardTitle>
                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('content')}
                  >
                    콘텐츠 추가
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('types')}
                  >
                    타입 관리
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Content */}
          <Card>
            <CardHeader>
              <CardTitle>최근 콘텐츠</CardTitle>
              <CardDescription>최근 생성/수정된 콘텐츠 목록</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentPosts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      아직 생성된 콘텐츠가 없습니다
                    </p>
                  ) : (
                    // Recent posts list would go here
                    <></>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CPT Types Grid */}
          <Card>
            <CardHeader>
              <CardTitle>콘텐츠 타입</CardTitle>
              <CardDescription>등록된 모든 Custom Post Types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cptTypes?.map((cpt) => (
                  <Card key={cpt.slug} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedCPT(cpt.slug);
                      setActiveTab('content');
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{cpt.label}</CardTitle>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cpt-engine/content/${cpt.slug}`);
                            }}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cpt-engine/builder/${cpt.slug}`);
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        {cpt.description || `${cpt.slug} 타입의 콘텐츠 관리`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>상태: {cpt.isActive ? '활성' : '비활성'}</span>
                        <span>아이템: {cpt.postCount || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Add New Type Card */}
                <Card 
                  className="border-dashed cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate('/cpt-engine/builder/new')}
                >
                  <CardHeader className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <CardTitle className="text-base">새 타입 추가</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        새로운 콘텐츠 타입 생성
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Management Tab */}
        <TabsContent value="content">
          <CPTContentList 
            selectedType={selectedCPT}
            onTypeSelect={setSelectedCPT}
            cptTypes={cptTypes || []}
          />
        </TabsContent>

        {/* Type Settings Tab */}
        <TabsContent value="types">
          <CPTBuilder 
            cptTypes={cptTypes || []}
            onUpdate={() => {
              // Refetch CPT types
              window.location.reload();
            }}
          />
        </TabsContent>

        {/* Field Management Tab */}
        <TabsContent value="fields">
          <CPTFieldManager 
            cptTypes={cptTypes || []}
            selectedType={selectedCPT}
            onTypeSelect={setSelectedCPT}
          />
        </TabsContent>

        {/* Taxonomies Tab */}
        <TabsContent value="taxonomies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>분류체계 관리</CardTitle>
                  <CardDescription>
                    카테고리, 태그 및 사용자 정의 분류체계를 관리합니다
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => navigate('/cpt-engine/taxonomies/new')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  새 분류체계
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Built-in Taxonomies */}
                <div>
                  <h3 className="text-sm font-medium mb-3">기본 분류체계</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">카테고리</h4>
                          <p className="text-sm text-muted-foreground">계층형 분류</p>
                        </div>
                        <Button size="sm" variant="outline">
                          관리
                        </Button>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">태그</h4>
                          <p className="text-sm text-muted-foreground">비계층형 분류</p>
                        </div>
                        <Button size="sm" variant="outline">
                          관리
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Custom Taxonomies */}
                <div>
                  <h3 className="text-sm font-medium mb-3">사용자 정의 분류체계</h3>
                  {cptTypes && cptTypes.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {cptTypes.filter(cpt => cpt.hasArchive).map(cpt => (
                        <Card key={cpt.slug} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{cpt.label} Archive</h4>
                              <p className="text-sm text-muted-foreground">
                                {cpt.hasArchive ? '활성화됨' : '비활성화됨'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => navigate(`/cpt-engine/taxonomies/${cpt.slug}`)}
                              >
                                설정
                              </Button>
                              {cpt.hasArchive && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.open(`/archive/${cpt.slug}`, '_blank')}
                                >
                                  보기
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8">
                      <div className="text-center text-muted-foreground">
                        <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>사용자 정의 분류체계가 없습니다</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => navigate('/cpt-engine/taxonomies/new')}
                        >
                          첫 번째 분류체계 만들기
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CPTDashboard;