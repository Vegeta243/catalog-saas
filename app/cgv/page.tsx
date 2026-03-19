import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Conditions Générales de Vente — CatalogSaaS",
  description: "Conditions générales de vente de la plateforme CatalogSaaS",
};

export default function CGVPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "#64748b" }}>
        <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
      </Link>

      <h1 className="text-3xl font-bold mb-2" style={{ color: "#0f172a" }}>Conditions Générales de Vente</h1>
      <p className="text-sm mb-8" style={{ color: "#94a3b8" }}>Dernière mise à jour : janvier 2025</p>

      <div className="prose prose-sm max-w-none space-y-8" style={{ color: "#374151" }}>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>1. Objet</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre la société
            CatalogSaaS (ci-après « le Prestataire ») et toute personne physique ou morale souhaitant accéder aux
            services proposés sur la plateforme <strong>catalog-saas.vercel.app</strong> ou tout domaine associé (ci-après « le Client »).
          </p>
          <p className="mt-2">
            Toute souscription à un forfait payant implique l&apos;acceptation sans réserve des présentes CGV.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>2. Description des services</h2>
          <p>CatalogSaaS est une plateforme SaaS (Software as a Service) permettant notamment :</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>L&apos;import automatisé de produits depuis des plateformes tierces (AliExpress, etc.)</li>
            <li>La génération de descriptions produits et contenus marketing via intelligence artificielle</li>
            <li>La synchronisation avec des boutiques Shopify</li>
            <li>L&apos;analyse concurrentielle et la recherche de produits</li>
            <li>La gestion d&apos;un catalogue de produits en ligne</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>3. Tarifs et forfaits</h2>
          <p>Les tarifs applicables sont les suivants :</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-200 rounded-xl">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Forfait</th>
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Prix mensuel</th>
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Tâches IA/mois</th>
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Boutiques</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Free</td>
                  <td className="border border-gray-200 px-4 py-2">0 €</td>
                  <td className="border border-gray-200 px-4 py-2">30</td>
                  <td className="border border-gray-200 px-4 py-2">1</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2">Starter</td>
                  <td className="border border-gray-200 px-4 py-2">19 €</td>
                  <td className="border border-gray-200 px-4 py-2">1 000</td>
                  <td className="border border-gray-200 px-4 py-2">3</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Pro</td>
                  <td className="border border-gray-200 px-4 py-2">49 €</td>
                  <td className="border border-gray-200 px-4 py-2">20 000</td>
                  <td className="border border-gray-200 px-4 py-2">10</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2">Scale</td>
                  <td className="border border-gray-200 px-4 py-2">129 €</td>
                  <td className="border border-gray-200 px-4 py-2">100 000</td>
                  <td className="border border-gray-200 px-4 py-2">Illimité</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
            Les prix sont indiqués en euros TTC. Le Prestataire se réserve le droit de modifier ses tarifs à tout moment,
            avec un préavis de 30 jours.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>4. Conditions de paiement</h2>
          <p>
            Les paiements sont traités de manière sécurisée via <strong>Stripe</strong>, prestataire de paiement conforme
            PCI DSS. Le Prestataire ne stocke à aucun moment les données bancaires du Client.
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Facturation mensuelle ou annuelle selon le forfait choisi</li>
            <li>Prélèvement automatique à chaque date d&apos;anniversaire</li>
            <li>Factures disponibles dans votre espace client</li>
            <li>Moyens de paiement acceptés : carte bancaire (Visa, Mastercard, American Express), SEPA</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>5. Droit de rétractation</h2>
          <p>
            Conformément à l&apos;article L221-18 du Code de la consommation, le Client dispose d&apos;un délai de{" "}
            <strong>14 jours calendaires</strong> à compter de la souscription pour exercer son droit de rétractation,
            sans justification ni pénalité.
          </p>
          <p className="mt-2">
            Pour exercer ce droit, le Client doit notifier sa décision par email à{" "}
            <a href="mailto:support@catalogsaas.com" className="text-blue-600 hover:underline">support@catalogsaas.com</a>
            {" "}ou via le formulaire de contact.
          </p>
          <p className="mt-2 text-sm p-3 bg-amber-50 border border-amber-200 rounded-xl" style={{ color: "#92400e" }}>
            ⚠️ <strong>Exception :</strong> Le droit de rétractation ne s&apos;applique pas si le Client a expressément
            consenti au commencement de l&apos;exécution du service avant la fin du délai de rétractation et a reconnu
            perdre son droit de rétractation (article L221-28 du Code de la consommation).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>6. Résiliation</h2>
          <p>
            Le Client peut résilier son abonnement à tout moment depuis son espace client. La résiliation prend effet
            à la fin de la période d&apos;abonnement en cours. Aucun remboursement partiel n&apos;est accordé pour la
            période restante, sauf dans le cadre du droit de rétractation.
          </p>
          <p className="mt-2">
            Le Prestataire se réserve le droit de suspendre ou résilier l&apos;accès en cas de violation des
            Conditions Générales d&apos;Utilisation ou de non-paiement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>7. Disponibilité du service</h2>
          <p>
            Le Prestataire s&apos;engage à maintenir une disponibilité du service d&apos;au moins <strong>99,5%</strong>
            {" "}par mois, hors maintenances planifiées notifiées 48h à l&apos;avance. En cas d&apos;indisponibilité
            dépassant ce seuil, le Client peut demander un avoir proportionnel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>8. Propriété intellectuelle</h2>
          <p>
            Le Client conserve la propriété des contenus qu&apos;il crée ou importe via la plateforme. Les contenus
            générés par l&apos;IA appartiennent au Client sous réserve du respect des conditions d&apos;utilisation
            des modèles sous-jacents (OpenAI).
          </p>
          <p className="mt-2">
            La plateforme CatalogSaaS, son code, ses interfaces et sa marque sont la propriété exclusive du Prestataire.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>9. Limitation de responsabilité</h2>
          <p>
            La responsabilité du Prestataire est limitée au montant des sommes effectivement versées par le Client
            au cours des 3 derniers mois. Le Prestataire n&apos;est pas responsable des dommages indirects,
            pertes de chiffre d&apos;affaires ou préjudices commerciaux.
          </p>
          <p className="mt-2">
            Le Prestataire ne garantit pas les résultats commerciaux obtenus par l&apos;utilisation de la plateforme.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>10. Loi applicable et juridiction</h2>
          <p>
            Les présentes CGV sont soumises au droit français. En cas de litige, les parties s&apos;efforceront de trouver
            une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents de Paris.
          </p>
          <p className="mt-2">
            Pour tout litige de consommation, le Client peut recourir à la médiation via la plateforme européenne
            de règlement en ligne des litiges :{" "}
            <span style={{ color: "#64748b" }}>https://ec.europa.eu/consumers/odr</span>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#0f172a" }}>11. Contact</h2>
          <p>Pour toute question relative aux présentes CGV :</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Email : <a href="mailto:support@catalogsaas.com" className="text-blue-600 hover:underline">support@catalogsaas.com</a></li>
            <li>Formulaire de contact : <Link href="/contact" className="text-blue-600 hover:underline">catalog-saas.vercel.app/contact</Link></li>
          </ul>
        </section>

      </div>
    </div>
  );
}
