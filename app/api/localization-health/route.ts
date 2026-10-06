import { NextResponse } from "next/server";
import { JsonLocalizationRepository } from "@/lib/localization/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(process.env.LOCALIZATION_DATA_DIR?.trim());
  try {
    const repo = new JsonLocalizationRepository();
    const record = await repo.read(13373);

    const readiness = Object.fromEntries(
      (["en", "roman"] as const).map((locale) => {
        const revisionId = record?.current?.[locale];
        const revision = record?.revisions.find(
          (item) => item.revisionId === revisionId,
        );
        return [
          locale,
          revision
            ? {
                present: true,
                generated: revision.translationStatus === "generated",
                validationPassed: revision.validation.passed === true,
                editorial: revision.editorialStatus,
                publish: revision.publishStatus,
                currentSource:
                  revision.sourceRevisionHash === record?.currentSourceHash,
              }
            : { present: false },
        ];
      }),
    );

    return NextResponse.json({
      ok: true,
      configured,
      storyPresent: Boolean(record),
      state: record?.state ?? null,
      availability: record?.availability ?? null,
      readiness,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured,
        error:
          error instanceof Error ? error.message : "Unknown storage error",
      },
      { status: 500 },
    );
  }
}
