import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { ScoreRing } from "../components/ScoreRing";
import {
  ArrowLeft,
  FileText,
  Play,
  Upload,
  BarChart3,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  domain?: string;
  workspace: { id: string; slug: string };
  _count?: { pages: number; auditBatches: number };
}

interface ProjectStats {
  totalPages: number;
  averageScore: number;
  issuesByCategory: { category: string; _count: number }[];
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await api.get<Project>(`/projects/${projectId}`);
      return res.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: async () => {
      const res = await api.get<ProjectStats>(`/projects/${projectId}/stats`);
      return res.data;
    },
  });

  const startAuditMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/projects/${projectId}/audits`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["project-stats", projectId] });
      navigate(`/audit/${data.data.runs?.[0]?.id || data.data.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/w/${project?.workspace.slug}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {project?.name}
          </h1>
          {project?.domain && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {project.domain}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/p/${projectId}/pages`)}
          >
            <Upload className="w-4 h-4" />
            Manage Pages
          </Button>
          <Button
            onClick={() => startAuditMutation.mutate()}
            isLoading={startAuditMutation.isPending}
            disabled={stats?.totalPages === 0}
          >
            <Play className="w-4 h-4" />
            Run Audit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <ScoreRing score={Math.round(stats?.averageScore || 0)} size="lg" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Average Score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalPages || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Pages
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project?._count?.auditBatches || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Audit Runs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.issuesByCategory?.reduce(
                    (sum, c) => sum + c._count,
                    0,
                  ) || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Issues
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.issuesByCategory && stats.issuesByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Issues by Category
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.issuesByCategory.map((item) => (
                <div key={item.category} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium capitalize">
                    {item.category.replace(/([A-Z])/g, " $1").trim()}
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (item._count /
                            Math.max(
                              ...stats.issuesByCategory.map((c) => c._count),
                            )) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm text-gray-600 dark:text-gray-400">
                    {item._count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats?.totalPages === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No pages added yet
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Import product page URLs to start auditing
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate(`/p/${projectId}/pages`)}
            >
              <Upload className="w-4 h-4" />
              Import Pages
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
