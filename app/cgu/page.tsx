import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CGUPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: "#0f172a" }}>
            Ecom<span style={{ color: "#2563eb" }}>Pilot</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: "#64748b" }}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: "#0f172a" }}>
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-sm mb-8" style={{ color: "#94a3b8" }}>
          Dernière mise à jour : 1er janvier 2026
        </p>

        <div className="prose-content space-y-6 text-sm leading-relaxed" style={{ color: "#374151" }}>
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>1. Objet</h2>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation (ci-après &quot;CGU&quot;) ont pour objet de définir les
              modalités et conditions dans lesquelles EcomPilot (ci-après &quot;le Service&quot;) met à disposition de ses
              utilisateurs (ci-après &quot;l&apos;Utilisateur&quot;) sa plateforme SaaS de gestion de catalogues e-commerce.
            </p>
            <p className="mt-2">
              L&apos;utilisation du Service implique l&apos;acceptation pleine et entière des présentes CGU. Si vous
              n&apos;acceptez pas ces conditions, veuillez ne pas utiliser le Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>2. Description du Service</h2>
            <p>
              EcomPilot est une plateforme SaaS permettant aux e-commerçants de :
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Gérer et modifier en masse leurs catalogues produits</li>
              <li>Optimiser automatiquement les fiches produits grâce à l&apos;intelligence artificielle</li>
              <li>Connecter et synchroniser plusieurs boutiques en ligne (Shopify, WooCommerce, etc.)</li>
              <li>Importer des produits depuis des URL ou fichiers CSV</li>
              <li>Automatiser des tâches de gestion de catalogue</li>
              <li>Éditer des images produits avec des outils IA</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>3. Inscription et compte</h2>
            <p>
              L&apos;accès au Service nécessite la création d&apos;un compte utilisateur. L&apos;Utilisateur s&apos;engage
              à fournir des informations exactes et à les maintenir à jour. L&apos;Utilisateur est responsable de la
              confidentialité de ses identifiants de connexion.
            </p>
            <p className="mt-2">
              Tout accès non autorisé au compte doit être signalé immédiatement à notre support. L&apos;Utilisateur doit
              être âgé d&apos;au moins 18 ans ou avoir la capacité juridique nécessaire pour souscrire au Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>4. Abonnements et tarifs</h2>
            <p>
              Le Service propose plusieurs plans d&apos;abonnement (Free, Starter, Pro, Scale) dont les caractéristiques et tarifs
              sont détaillés sur la page <Link href="/pricing" className="underline" style={{ color: "#2563eb" }}>Tarifs</Link>.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Les abonnements payants sont facturés mensuellement ou annuellement, selon le choix de l&apos;Utilisateur.</li>
              <li>Le paiement est effectué via Stripe (carte bancaire).</li>
              <li>Un plan gratuit avec 50 actions IA est disponible sans carte bancaire. Les plans payants donnent accès à des volumes d&apos;actions supérieurs et des fonctionnalités avancées.</li>
              <li>L&apos;Utilisateur peut annuler son abonnement à tout moment depuis le tableau de bord. L&apos;accès reste actif jusqu&apos;à la fin de la période facturée.</li>
              <li>Les tarifs peuvent être modifiés avec un préavis de 30 jours.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>5. Tâches IA</h2>
            <p>
              Chaque plan inclut un nombre de tâches mensuelles. Les tâches non utilisées ne sont pas reportées au mois
              suivant. L&apos;Utilisateur peut suivre sa consommation depuis son tableau de bord.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>6. Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble des éléments du Service (interface, code, design, marques, logos) est protégé par le droit
              de la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation.
            </p>
            <p className="mt-2">
              L&apos;Utilisateur conserve la propriété de ses données et contenus. Il accorde à EcomPilot une licence
              limitée d&apos;utilisation de ces données aux fins de fourniture du Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>7. Responsabilité</h2>
            <p>
              EcomPilot s&apos;engage à mettre en œuvre les moyens nécessaires pour assurer la disponibilité et la sécurité
              du Service. Toutefois, EcomPilot ne saurait être tenu responsable des interruptions, erreurs ou pertes de
              données résultant de l&apos;utilisation du Service.
            </p>
            <p className="mt-2">
              Les contenus générés par l&apos;intelligence artificielle sont fournis à titre indicatif. L&apos;Utilisateur
              reste seul responsable de leur utilisation et de leur publication.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>8. Résiliation</h2>
            <p>
              L&apos;Utilisateur peut résilier son compte à tout moment depuis les paramètres de son tableau de bord. EcomPilot
              se réserve le droit de suspendre ou résilier un compte en cas de violation des présentes CGU, avec notification
              préalable sauf en cas d&apos;urgence.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>9. Droit applicable</h2>
            <p>
              Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation ou
              exécution sera soumis aux tribunaux compétents de Paris, France.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>10. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l&apos;adresse :
              <a href="mailto:contact@ecompilot.com" className="underline ml-1" style={{ color: "#2563eb" }}>contact@ecompilot.com</a>
            </p>
          </section>
        </div>
      </article>

      <footer className="border-t border-gray-200 py-6 text-center">
        <p className="text-xs" style={{ color: "#94a3b8" }}>© 2026 EcomPilot — Tous droits réservés.</p>
      </footer>
    </div>
  );
}
