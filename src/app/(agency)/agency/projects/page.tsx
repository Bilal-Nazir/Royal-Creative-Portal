import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getProjectsForAgencyUser, getAssignableAgencyUsers } from "@/server/services/project-service";
import { listBoardColumns } from "@/server/services/project-board-service";
import { getInternalCommentCounts } from "@/server/services/internal-comment-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectsBoard } from "@/components/project/ProjectsBoard";

export default async function AgencyProjectsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  const [projects, columns] = await Promise.all([getProjectsForAgencyUser(session), listBoardColumns()]);
  const assignees = getAssignableAgencyUsers();
  const commentCounts = await getInternalCommentCounts(projects.map((p) => p.id));

  return (
    <div className="flex flex-col gap-3">
      <TopBar
        breadcrumb="Royal Creative / Projects"
        action={<NotificationsBell iconOnly />}
      />
      <PageHeader title="Projects" />
      <ProjectsBoard
        projects={projects}
        columns={columns}
        assignees={assignees}
        currentUserId={session.userId}
        commentCounts={commentCounts}
      />
    </div>
  );
}
