import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import useProject from "@/hooks/use-project";
import { cn } from "@/lib/utils";
import { Bot, CreditCard, LayoutDashboard, Plus, Presentation } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Q&A",
    url: "/qa",
    icon: Bot,
  },
  {
    title: "Meetings",
    url: "/meetings",
    icon: Presentation,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
];

function useSidebar() {
  const [open, setOpen] = useState(false);

  // Returnează starea și funcția pentru a o modifica
  return { open, toggleSidebar: () => setOpen(!open) };
}

export function AppSideBar() {
  const pathname = usePathname();
  const { open } = useSidebar();

  const { projects, projectId, setProjectId } = useProject();

  const hasProjects = Array.isArray(projects) && projects.length > 0;

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="logo" width={40} height={40} />
          {open && (
            <h1 className="font-bold text-primary">
              synapses-init
            </h1>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>App</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={cn({
                          "!bg-primary !text-white": pathname === item.url,
                        })}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasProjects ? (
                projects.map((project) => {
                  return (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton asChild>
                        <div
                          onClick={() => {
                            setProjectId(project.id);
                          }}
                        >
                          <div
                            className={cn(
                              "rounded-sm border size-6 flex items-center justify-center text-sm bg-white text-primary",
                              {
                                "bg-primary text-white": project.id === projectId,
                              }
                            )}
                          >
                            {project.name[0]}
                          </div>
                          <span>{project.name}</span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No projects available.</p>
              )}
              <div className="h-2"></div>
              <SidebarMenuItem>
                <Link href="/create">
                  <Button size="sm" variant={"outline"} className="w-fit">
                    <Plus />
                    Create Project
                  </Button>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
