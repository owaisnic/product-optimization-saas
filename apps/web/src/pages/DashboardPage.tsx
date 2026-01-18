import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Plus, Building2, FolderKanban, Users } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  _count?: { projects: number };
  members?: {
    id: string;
    role: string;
    user: { name?: string; email: string };
  }[];
}

export function DashboardPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await api.get<Workspace[]>("/workspaces");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post("/workspaces", { name: newName, slug: newSlug });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
    },
  });

  const handleNameChange = (name: string) => {
    setNewName(name);
    setNewSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your workspaces and projects
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Workspace
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Create Workspace</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Workspace Name"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Company"
            />
            <Input
              label="Slug"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="my-company"
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
        {workspaces?.map((workspace) => (
          <Card
            key={workspace.id}
            hover
            onClick={() => navigate(`/w/${workspace.slug}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {workspace.name}
                    </h3>
                    <p className="text-sm text-gray-500">/{workspace.slug}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <FolderKanban className="w-4 h-4" />
                  <span>{workspace._count?.projects || 0} projects</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{workspace.members?.length || 0} members</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {workspaces?.length === 0 && !showCreate && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                No workspaces yet
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Create your first workspace to get started
              </p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
