import type { AccountsRepository } from "./accounts-google";

/** One bounded, retryable page. Never remove personal data before Auth deletion succeeds. */
export async function cleanAccountPage(repo: AccountsRepository, uid: string) {
  await repo.deleteAuth(uid);
  const pages = await Promise.all([
    repo.query("inbox", [{ field: "senderUid", op: "EQUAL", value: uid }], 20, ["__name__"], undefined, true),
    repo.query("emailQueue", [{ field: "senderUid", op: "EQUAL", value: uid }], 20, ["__name__"]),
    ...["progress", "devices", "inbox", "levelNews", "communityBlocks"].map(
      (c) => repo.query(`families/${uid}/${c}`, [], 20, ["__name__"]),
    ),
    ...["emailQueue", "mailJobs", "mailEvents"].map((c) =>
      repo.query(c, [{ field: "uid", op: "EQUAL", value: uid }], 20, [
        "__name__",
      ]),
    ),
    ...["recipientUid", "senderUid"].map((field) =>
      repo.query(
        "anniversaryMessages",
        [{ field, op: "EQUAL", value: uid }],
        20,
        ["recipientUid"],
      ),
    ),
    ...["reporterUid", "targetUid"].map((field) =>
      repo.query("communityReports", [{ field, op: "EQUAL", value: uid }], 20, [
        "__name__",
      ]),
    ),
    ...["aUid", "bUid"].map((field) =>
      repo.query(
        "communityRelations",
        [{ field, op: "EQUAL", value: uid }],
        20,
        ["aUid", "bUid"],
      ),
    ),
  ]);
  const complete = pages.every((page) => page.length < 20);
  const paths = [
    ...new Map(
      pages
        .flat()
        .flatMap((d) => [
          { path: d.path },
          ...(d.path.startsWith("emailQueue/") ? [{ path: `mailJobs/admin-${d.path.split("/").at(-1)}` }] : []),
          ...(d.path.startsWith("anniversaryMessages/") &&
          typeof d.data.recipientUid === "string"
            ? [
                {
                  path: `families/${d.data.recipientUid}/inbox/anniversary-${d.path.split("/").at(-1)}`,
                },
              ]
            : []),
          ...(d.path.startsWith("communityRelations/") &&
          typeof d.data.aUid === "string" &&
          typeof d.data.bUid === "string"
            ? [
                {
                  path: `families/${d.data.aUid}/communityBlocks/${d.data.bUid}`,
                },
                {
                  path: `families/${d.data.bUid}/communityBlocks/${d.data.aUid}`,
                },
              ]
            : []),
        ])
        .map((p) => [p.path, p]),
    ).values(),
  ];
  if (complete)
    for (const root of [
      "community",
      "avatars",
      "portraits",
      "journeys",
      "tracking",
      "familyControls",
      "emailPreferences",
      "families",
      "roles",
      "accountSuspensions",
      "communityConsents",
      "communityApprovals",
    ])
      paths.push({ path: `${root}/${uid}` });
  if (!(await repo.removeDocuments(paths)))
    throw Error("La limpieza necesita otro intento.");
  return complete;
}
