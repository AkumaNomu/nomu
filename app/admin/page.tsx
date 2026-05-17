import { AdminConsole } from "@/components/admin/admin-console";
import { ReaderLayout } from "@/components/layouts";

export const metadata = {
  title: "Admin"
};

export default function AdminPage() {
  return (
    <ReaderLayout active="archive">
      <AdminConsole />
    </ReaderLayout>
  );
}
