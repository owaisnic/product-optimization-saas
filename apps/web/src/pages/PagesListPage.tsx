import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { ScoreRing } from "../components/ScoreRing";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  Upload,
  ExternalLink,
} from "lucide-react";

interface ProductPage {
  id: string;
  url: string;
  sku?: string;
  latestScore?: number;
  audits?: { id: string; score?: { overall: number } }[];
}

export function PagesListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [bulkUrls, setBulkUrls] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pages", projectId],
    queryFn: async () => {
      const res = await api.get<{ pages: ProductPage[]; total: number }>(
        `/projects/${projectId}/pages?take=100`,
      );
      return res.data;
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const urls = bulkUrls
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((url) => ({ url }));
      return api.post(`/projects/${projectId}/pages/import`, { urls });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["pages", projectId] });
      setBulkUrls("");
      setShowImport(false);
      alert(`Imported: ${data.data.created} new, ${data.data.skipped} skipped`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return api.post("/pages/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages", projectId] });
      setSelectedIds([]);
    },
  });

  const auditPageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return api.post(`/pages/${pageId}/audit`);
    },
    onSuccess: (data: any) => {
      navigate(`/audit/${data.data.id}`);
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === data?.pages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data?.pages.map((p) => p.id) || []);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/p/${projectId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Product Pages
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {data?.total || 0} pages in this project
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(selectedIds)}
              isLoading={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" />
            Import URLs
          </Button>
        </div>
      </div>

      {showImport && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Bulk Import URLs</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Paste one URL per line (supports up to 1000 URLs)
            </p>
            <textarea
              className="w-full h-48 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder="https://example.com/product/1&#10;https://example.com/product/2&#10;https://example.com/product/3"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => importMutation.mutate()}
                isLoading={importMutation.isPending}
              >
                Import
              </Button>
              <Button variant="outline" onClick={() => setShowImport(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === data?.pages.length &&
                      data?.pages.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium text-gray-500">
                  URL
                </th>
                <th className="p-4 text-left text-sm font-medium text-gray-500">
                  SKU
                </th>
                <th className="p-4 text-center text-sm font-medium text-gray-500">
                  Score
                </th>
                <th className="p-4 text-right text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.pages.map((page) => (
                <tr
                  key={page.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(page.id)}
                      onChange={() => toggleSelect(page.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate max-w-md">
                        {page.url}
                      </span>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                    {page.sku || "-"}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      {page.latestScore !== undefined ? (
                        <ScoreRing score={page.latestScore} size="sm" />
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => auditPageMutation.mutate(page.id)}
                      >
                        <Play className="w-3 h-3" />
                        Audit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.pages.length === 0 && (
          <CardContent className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No pages added yet
            </p>
            <Button className="mt-4" onClick={() => setShowImport(true)}>
              <Plus className="w-4 h-4" />
              Import URLs
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
