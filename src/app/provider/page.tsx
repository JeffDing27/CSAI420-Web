import { redirect } from "next/navigation";

export default function ProviderIndex() {
  redirect("/provider/patients");
}
