import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Plus, FolderKanban, FileText, ArrowLeft } from "lucide-react";

interface Project {
  id: string;
  name: string;
  domain?: string;
  _count?: { pages: number; auditBatches: number };
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  projects: Project[];
}

export function WorkspacePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace", workspaceSlug],
    queryFn: async () => {
      const res = await api.get<Workspace>(`/workspaces/slug/${workspaceSlug}`);
      return res.data;
    },
    enabled: !!workspaceSlug,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", workspace?.id],
    queryFn: async () => {
      const res = await api.get<Project[]>(
        `/workspaces/${workspace!.id}/projects`,
      );
      return res.data;
    },
    enabled: !!workspace?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/workspaces/${workspace!.id}/projects`, {
        name: newName,
        domain: newDomain || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", workspace?.id] });
      setShowCreate(false);
      setNewName("");
      setNewDomain("");
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {workspace?.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage projects in this workspace
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Create Project</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Project Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="My Store"
            />
            <Input
              label="Domain (optional)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                isLoading={createMutation.isPending}
              >
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project) => (
          <Card
            key={project.id}
            hover
            onClick={() => navigate(`/p/${project.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FolderKanban className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {project.name}
                  </h3>
                  {project.domain && (
                    <p className="text-sm text-gray-500">{project.domain}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{project._count?.pages || 0} pages</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {projects?.length === 0 && !showCreate && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <FolderKanban className="w-12 h-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                No projects yet
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Create your first project to start auditing pages
              </p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
