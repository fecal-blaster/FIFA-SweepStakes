import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { JoinForm } from "@/components/join-form";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: { code: string } }) {
  const tournament = await prisma.tournament.findUnique({
    where: { inviteCode: params.code.toUpperCase() },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      registrationDeadline: true,
      buyInMinor: true,
      currency: true,
      inviteCode: true
    }
  });
  if (!tournament) notFound();
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-white">Join {tournament.name}</h1>
      <Card>
        <p className="text-sm text-pitch-700/90">
          Buy-in: <span className="text-white">{tournament.buyInMinor / 100} {tournament.currency}</span>
        </p>
        {tournament.registrationDeadline && (
          <p className="text-xs text-pitch-700/70 mt-1">
            Closes {new Date(tournament.registrationDeadline).toLocaleString()}
          </p>
        )}
        <div className="mt-4">
          <JoinForm slug={tournament.slug} inviteCode={tournament.inviteCode} disabled={tournament.status !== "REGISTRATION_OPEN"} />
        </div>
      </Card>
    </div>
  );
}
