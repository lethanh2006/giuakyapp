import AreaGuard from "@/src/application/access/AreaGuard";

export default function AdminLayout() {
  return <AreaGuard area="admin" />;
}
