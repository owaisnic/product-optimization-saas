import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { ScoreRing } from "../components/ScoreRing";
import { cn, getSeverityColor, getStatusColor, formatDate } from "../lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Clock,
} from "lucide-react";

interface AuditRun {
  id: string;
  status: string;
  httpStatus?: number;
  responseTime?: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  page: { id: string; url: string; projectId: string };
  score?: {
    overall: number;
    metadata: number;
    schema: number;
    indexability: number;
    content: number;
    variantRisk: number;
    aiReadiness: number;
  };
  checks?: {
    id: string;
    checkId: string;
    category: string;
    status: string;
    severity: string;
    message: string;
    evidence?: string;
    fixHint?: string;
  }[];
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "PASS":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "FAIL":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "WARN":
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    default:
      return <Info className="w-4 h-4 text-gray-400" />;
  }
};

export function AuditResultPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const navigate = useNavigate();

  const { data: audit, isLoading } = useQuery({
    queryKey: ["audit", auditId],
    queryFn: async () => {
      const res = await api.get<AuditRun>(`/audits/${auditId}`);
      return res.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "RUNNING" || data?.status === "QUEUED") {
        return 2000;
      }
      return false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!audit) {
    return <div>Audit not found</div>;
  }

  const isRunning = audit.status === "RUNNING" || audit.status === "QUEUED";

  const categories = [
    { key: "indexability", label: "Indexability", color: "bg-blue-500" },
    { key: "metadata", label: "Metadata", color: "bg-purple-500" },
    { key: "content", label: "Content", color: "bg-green-500" },
    { key: "schema", label: "Schema", color: "bg-orange-500" },
    { key: "variantRisk", label: "Variant Risk", color: "bg-pink-500" },
    { key: "aiReadiness", label: "AI Readiness", color: "bg-cyan-500" },
  ];

  const groupedChecks = audit.checks?.reduce(
    (acc, check) => {
      if (!acc[check.category]) acc[check.category] = [];
      acc[check.category].push(check);
      return acc;
    },
    {} as Record<string, typeof audit.checks>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/p/${audit.page.projectId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Audit Results
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <a
              href={audit.page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {audit.page.url}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        {isRunning && (
          <div className="flex items-center gap-2 text-primary">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span>Running...</span>
          </div>
        )}
      </div>

      {audit.status === "FAILED" && (
        <Card className="border-red-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <XCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">Audit Failed</p>
                <p className="text-sm">{audit.errorMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {audit.score && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <Card className="md:col-span-1">
              <CardContent className="p-6 text-center">
                <ScoreRing score={audit.score.overall} size="lg" />
                <p className="mt-2 text-sm font-medium">Overall</p>
              </CardContent>
            </Card>
            {categories.map((cat) => (
              <Card key={cat.key}>
                <CardContent className="p-4 text-center">
                  <ScoreRing
                    score={
                      (audit.score?.[
                        cat.key as keyof typeof audit.score
                      ] as number) || 0
                    }
                    size="sm"
                  />
                  <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {cat.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDate(audit.createdAt)}</span>
            </div>
            {audit.httpStatus && (
              <div>
                HTTP Status:{" "}
                <span className="font-medium">{audit.httpStatus}</span>
              </div>
            )}
            {audit.responseTime && (
              <div>
                Response Time:{" "}
                <span className="font-medium">{audit.responseTime}ms</span>
              </div>
            )}
          </div>
        </>
      )}

      {groupedChecks && (
        <div className="space-y-6">
          {categories.map((cat) => {
            const checks = groupedChecks[cat.key];
            if (!checks || checks.length === 0) return null;

            const passCount = checks.filter((c) => c.status === "PASS").length;
            const failCount = checks.filter((c) => c.status === "FAIL").length;
            const warnCount = checks.filter((c) => c.status === "WARN").length;

            return (
              <Card key={cat.key}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", cat.color)} />
                    {cat.label}
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600">{passCount} passed</span>
                    {warnCount > 0 && (
                      <span className="text-yellow-600">
                        {warnCount} warnings
                      </span>
                    )}
                    {failCount > 0 && (
                      <span className="text-red-600">{failCount} failed</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y dark:divide-gray-700">
                    {checks.map((check) => (
                      <div
                        key={check.id}
                        className="px-6 py-4 flex items-start gap-4"
                      >
                        <StatusIcon status={check.status} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-medium",
                                getStatusColor(check.status),
                              )}
                            >
                              {check.message}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                getSeverityColor(check.severity),
                              )}
                            >
                              {check.severity}
                            </span>
                          </div>
                          {check.fixHint && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              💡 {check.fixHint}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
