import { Badge } from "@/components/ui/badge";

const participants = [
  { nom: "Dupont, Marie", fonction: "Présidente", present: true },
  { nom: "Bernard, Jean-Pierre", fonction: "Secrétaire Général", present: true },
  { nom: "Lefèvre, Claire", fonction: "Directrice Juridique", present: true },
  { nom: "Moreau, Antoine", fonction: "Trésorier", present: true },
  { nom: "Petit, Isabelle", fonction: "Administratrice", present: false },
  { nom: "Roux, François", fonction: "Commissaire aux comptes", present: true },
  { nom: "Garnier, Hélène", fonction: "Représentante du personnel", present: true },
];

const ordresDuJour = [
  {
    numero: 1,
    titre: "Approbation du procès-verbal de la séance précédente",
    contenu:
      "Le procès-verbal de la séance du 15 janvier 2024 est lu par le Secrétaire Général. Aucune observation n'étant formulée, le procès-verbal est approuvé à l'unanimité des membres présents.",
    resolution: null,
  },
  {
    numero: 2,
    titre: "Examen des comptes annuels de l'exercice 2023",
    contenu:
      "Le Trésorier présente les comptes annuels de l'exercice clos le 31 décembre 2023. Le total du bilan s'élève à 4 287 350,00 €. Le résultat net de l'exercice est un bénéfice de 312 480,00 €. Le Commissaire aux comptes confirme la sincérité et la régularité des comptes.",
    resolution: {
      texte: "L'Assemblée approuve les comptes annuels de l'exercice 2023 tels que présentés.",
      pour: 10,
      contre: 1,
      abstention: 1,
    },
  },
  {
    numero: 3,
    titre: "Affectation du résultat de l'exercice 2023",
    contenu:
      "Le Trésorier propose l'affectation suivante du bénéfice net de 312 480,00 € : dotation à la réserve légale pour 15 624,00 €, dotation à la réserve statutaire pour 100 000,00 €, report à nouveau pour 196 856,00 €.",
    resolution: {
      texte: "L'Assemblée approuve l'affectation du résultat telle que proposée par le Trésorier.",
      pour: 12,
      contre: 0,
      abstention: 0,
    },
  },
  {
    numero: 4,
    titre: "Renouvellement du mandat du Commissaire aux comptes",
    contenu:
      "Le mandat du Commissaire aux comptes, M. Roux François, arrivant à échéance, la Présidente propose son renouvellement pour une durée de six exercices conformément aux dispositions de l'article L. 823-3 du Code de commerce.",
    resolution: {
      texte: "L'Assemblée renouvelle le mandat du Commissaire aux comptes pour six exercices.",
      pour: 11,
      contre: 0,
      abstention: 1,
    },
  },
  {
    numero: 5,
    titre: "Questions diverses",
    contenu:
      "Aucune question diverse n'étant soulevée, la Présidente remercie les membres de leur participation et prononce la clôture de la séance à 11h45.",
    resolution: null,
  },
];

const ProcesVerbal = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Document */}
      <div className="mx-auto max-w-[900px] border border-border bg-card p-8 md:p-12">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:justify-between">
          <div className="space-y-3">
            <h1 className="font-display text-xl font-medium tracking-tight text-foreground">
              Procès-Verbal de l'Assemblée Générale Extraordinaire
            </h1>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="rounded-sm border-foreground font-mono text-xs font-normal uppercase tracking-wider text-foreground">
                Définitif
              </Badge>
              <Badge variant="destructive" className="rounded-sm font-mono text-xs font-normal uppercase tracking-wider">
                Confidentiel
              </Badge>
            </div>
          </div>
        </div>

        {/* Métadonnées */}
        <div className="mb-10 grid grid-cols-2 gap-x-8 gap-y-2 border-b border-border pb-8 md:grid-cols-4">
          <MetaField label="Référence" value="PV-2024-08-12-AGE-402" mono />
          <MetaField label="Date" value="12 août 2024" />
          <MetaField label="Lieu" value="Siège social, Paris 8e" />
          <MetaField label="Heure d'ouverture" value="09h05" mono />
        </div>

        {/* Émargements */}
        <div className="mb-10 border-b border-border pb-8">
          <h2 className="mb-4 font-display text-sm font-medium uppercase tracking-wider text-foreground">
            Émargements
          </h2>
          <div className="space-y-1">
            {participants.map((p) => (
              <div
                key={p.nom}
                className="flex items-center justify-between border-b border-border py-2 last:border-b-0 transition-colors duration-100 hover:bg-secondary"
              >
                <span className="text-sm text-foreground">
                  {p.nom}{" "}
                  <span className="text-muted-foreground">({p.fonction})</span>
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      p.present ? "bg-primary" : "bg-border"
                    }`}
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.present ? "Présent" : "Absent"}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Votants : {participants.filter((p) => p.present).length} /{" "}
            {participants.length}. Quorum atteint.
          </p>
        </div>

        {/* Introduction */}
        <div className="mb-10 border-b border-border pb-8">
          <p className="text-sm leading-relaxed text-foreground">
            La séance est ouverte à 09h05 sous la présidence de Dupont, Marie.
            Le quorum étant atteint, l'ordre du jour est abordé comme suit.
          </p>
        </div>

        {/* Ordre du jour */}
        <div className="mb-10 space-y-8">
          <h2 className="font-display text-sm font-medium uppercase tracking-wider text-foreground">
            Ordre du jour
          </h2>
          {ordresDuJour.map((item) => (
            <article
              key={item.numero}
              className="border-b border-border pb-6 last:border-b-0 transition-colors duration-100 hover:bg-secondary"
            >
              <h3 className="mb-3 font-display text-base font-medium text-foreground">
                <span className="font-mono text-xs text-muted-foreground mr-3">
                  Art. {item.numero}
                </span>
                {item.titre}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-foreground">
                {item.contenu}
              </p>
              {item.resolution && (
                <div className="border-l-2 border-primary py-2 pl-6">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Résolution :
                  </p>
                  <p className="mb-2 text-sm leading-relaxed text-foreground">
                    {item.resolution.texte}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Pour : {item.resolution.pour}. Contre :{" "}
                    {item.resolution.contre}. Abstention :{" "}
                    {item.resolution.abstention}.
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Clôture */}
        <div className="mb-10 border-b border-border pb-8">
          <p className="text-sm leading-relaxed text-foreground">
            Plus rien n'étant à l'ordre du jour et personne ne demandant la
            parole, la Présidente déclare la séance levée à 11h45.
          </p>
        </div>

        {/* Signatures */}
        <div className="mb-10 grid gap-8 md:grid-cols-2">
          <SignatureBlock nom="Dupont, Marie" fonction="Présidente" />
          <SignatureBlock nom="Bernard, Jean-Pierre" fonction="Secrétaire Général" />
        </div>

        {/* Signature numérique */}
        <div className="border border-dashed border-border bg-secondary p-6">
          <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Signature numérique — SHA-256
          </p>
          <p className="font-mono text-[0.7rem] leading-relaxed text-muted-foreground break-all">
            a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a
          </p>
          <p className="mt-2 font-mono text-[0.6rem] text-muted-foreground">
            Horodatage : 2024-08-12T11:52:03+02:00 — Certificat : FR-GOV-SIGN-2024-08402
          </p>
        </div>
      </div>
    </div>
  );
};

function MetaField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-sm text-foreground ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SignatureBlock({ nom, fonction }: { nom: string; fonction: string }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-foreground">{nom}</p>
        <p className="font-mono text-xs text-muted-foreground">{fonction}</p>
      </div>
      <div className="h-16 border-b border-border" />
      <p className="font-mono text-[0.65rem] text-muted-foreground">
        Signature
      </p>
    </div>
  );
}

export default ProcesVerbal;
