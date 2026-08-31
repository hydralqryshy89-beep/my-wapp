import { requireSaasUser } from "@/lib/saas/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/saas/ui/card";
import { CreateOrganizationForm } from "@/components/saas/organizations/create-organization-form";

export default async function NewOrganizationPage() {
  await requireSaasUser();

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>New Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}
