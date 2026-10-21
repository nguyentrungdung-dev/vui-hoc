import VuiHocApp from "@/components/app";

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  return <VuiHocApp path={slug ? `/${slug.join("/")}` : "/"} />;
}
